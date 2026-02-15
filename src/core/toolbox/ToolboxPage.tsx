import React, { useState, useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useToolbox, Script } from './ToolboxProvider';
import { useMultiServiceApi } from '../providers/MultiServiceApiProvider';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';

const DEFAULT_SCRIPT = `// Use the 'api' object to interact with authenticated services
// Available services: graph, sharepoint, intune, forms, power_automate
// Example: const me = await api.graph.get('/me');

// Your code here
const result = await api.graph.get('/me');
console.log('User:', result);

return result;
`;

interface ExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  logs: string[];
  executionTime: number;
}

export const ToolboxPage: React.FC = () => {
  const { scripts, loading, saveScript, deleteScript } = useToolbox();
  const multiServiceApi = useMultiServiceApi();

  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState(DEFAULT_SCRIPT);
  const [output, setOutput] = useState<ExecutionResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const createNewScript = useCallback(() => {
    setSelectedScriptId(null);
    setName('');
    setDescription('');
    setCode(DEFAULT_SCRIPT);
    setOutput(null);
  }, []);

  const loadScript = useCallback((script: Script) => {
    setSelectedScriptId(script.id);
    setName(script.name);
    setDescription(script.description);
    setCode(script.code);
    setOutput(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      alert('Please enter a script name');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveScript({
        id: selectedScriptId || undefined,
        name: name.trim(),
        description: description.trim(),
        code,
      });
      setSelectedScriptId(saved.id);
    } catch (error) {
      console.error('Failed to save script:', error);
      alert('Failed to save script. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [selectedScriptId, name, description, code, saveScript]);

  const handleDelete = useCallback(async () => {
    if (!selectedScriptId) return;
    if (!confirm('Are you sure you want to delete this script?')) return;

    try {
      await deleteScript(selectedScriptId);
      createNewScript();
    } catch (error) {
      console.error('Failed to delete script:', error);
      alert('Failed to delete script. Please try again.');
    }
  }, [selectedScriptId, deleteScript, createNewScript]);

  const executeScript = useCallback(async () => {
    setExecuting(true);
    const startTime = performance.now();

    try {
      const logs: string[] = [];
      const mockConsole = {
        log: (...args: unknown[]) => logs.push(args.map((a) => String(a)).join(' ')),
        warn: (...args: unknown[]) => logs.push('[WARN] ' + args.map((a) => String(a)).join(' ')),
        error: (...args: unknown[]) => logs.push('[ERROR] ' + args.map((a) => String(a)).join(' ')),
      };

      // Build API context from authenticated services
      const apiContext: Record<string, any> = {};
      const serviceIds = ['graph', 'sharepoint', 'intune', 'forms', 'power-automate'];

      for (const serviceId of serviceIds) {
        const svcApi = multiServiceApi.getServiceApi(serviceId);
        if (svcApi) {
          // Convert service-id to service_id for API context
          const key = serviceId.replace(/-/g, '_');
          apiContext[key] = svcApi;
        }
      }

      // Execute script in sandboxed context
      const fn = new Function('api', 'console', `return (async () => { ${code} })()`);
      const result = await fn(apiContext, mockConsole);

      const executionTime = performance.now() - startTime;

      setOutput({
        success: true,
        result,
        logs,
        executionTime,
      });
    } catch (error) {
      const executionTime = performance.now() - startTime;
      setOutput({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        logs: [],
        executionTime,
      });
    } finally {
      setExecuting(false);
    }
  }, [code, multiServiceApi]);

  const renderOutput = () => {
    if (!output) return null;

    return (
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Output</h3>
          <Badge variant={output.success ? 'default' : 'destructive'}>
            {output.success ? 'Success' : 'Error'} ({output.executionTime.toFixed(2)}ms)
          </Badge>
        </div>

        {output.logs.length > 0 && (
          <div className="rounded-md bg-gray-100 dark:bg-gray-800 p-3 text-xs font-mono">
            <div className="font-semibold mb-1">Console:</div>
            {output.logs.map((log, i) => (
              <div key={i} className="text-gray-700 dark:text-gray-300">
                {log}
              </div>
            ))}
          </div>
        )}

        {output.success && output.result !== undefined && (
          <div className="rounded-md bg-gray-100 dark:bg-gray-800 p-3 text-xs font-mono overflow-auto max-h-64">
            <div className="font-semibold mb-1">Result:</div>
            <pre className="text-gray-700 dark:text-gray-300">
              {JSON.stringify(output.result, null, 2)}
            </pre>
          </div>
        )}

        {!output.success && output.error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-xs font-mono text-red-700 dark:text-red-300">
            <div className="font-semibold mb-1">Error:</div>
            {output.error}
          </div>
        )}
      </div>
    );
  };

  const availableServices = ['graph', 'sharepoint', 'intune', 'forms', 'power-automate'].filter(
    (id) => multiServiceApi.isServiceReady(id)
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Scripts</h2>
            <Button onClick={createNewScript} size="sm">
              New
            </Button>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">Loading scripts...</div>
          ) : (
            <ScrollArea className="h-[calc(100vh-120px)]">
              <div className="space-y-2">
                {scripts.length === 0 ? (
                  <div className="text-sm text-gray-500">No saved scripts</div>
                ) : (
                  scripts.map((script) => (
                    <Card
                      key={script.id}
                      className={`cursor-pointer transition-colors ${
                        selectedScriptId === script.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => loadScript(script)}
                    >
                      <CardHeader className="p-3">
                        <CardTitle className="text-sm">{script.name}</CardTitle>
                        {script.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {script.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {new Date(script.updatedAt).toLocaleDateString()}
                        </p>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                variant="outline"
                size="sm"
              >
                {sidebarOpen ? 'Hide' : 'Show'} Scripts
              </Button>
              <h1 className="text-xl font-bold">Toolbox</h1>
            </div>
            <div className="flex items-center gap-2">
              {selectedScriptId && (
                <Button onClick={handleDelete} variant="outline" size="sm">
                  Delete
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={executeScript}
                disabled={executing || !multiServiceApi.isAnyServiceReady}
                variant="default"
                size="sm"
              >
                {executing ? 'Running...' : 'Run'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Script name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
            />
          </div>

          {availableServices.length > 0 && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Available APIs:</span>
              {availableServices.map((id) => (
                <Badge key={id} variant="outline" className="text-xs">
                  {id.replace(/-/g, '_')}
                </Badge>
              ))}
            </div>
          )}

          {!multiServiceApi.isAnyServiceReady && (
            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                No services authenticated. Please visit a Microsoft 365 service page to authenticate.
              </p>
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              tabSize: 2,
            }}
          />
        </div>

        {/* Output Panel */}
        {output && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 max-h-80 overflow-auto">
            {renderOutput()}
          </div>
        )}
      </div>
    </div>
  );
};
