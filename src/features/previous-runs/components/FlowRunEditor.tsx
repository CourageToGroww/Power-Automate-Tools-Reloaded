import React, { useState, useEffect, useCallback } from 'react';
import { useApiProviderContext } from '../../../common/providers/ApiProvider';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { FlowFailure, FlowRunDetails } from '../types';
import { ArrowLeft, Copy, XCircle, FileJson, CheckCircle, AlertTriangle, Download, RefreshCw, Maximize2, Minimize2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ThemeToggle } from '../../../components/ThemeToggle';
import Editor from '@monaco-editor/react';
import { useTheme } from '../../../contexts/ThemeContext';

interface FlowRunEditorProps {
  run: FlowFailure;
  runDetails: FlowRunDetails;
  onBack: () => void;
}

export const FlowRunEditor: React.FC<FlowRunEditorProps> = ({
  run,
  runDetails,
  onBack,
}) => {
  const { theme } = useTheme();
  const api = useApiProviderContext();
  const [viewMode, setViewMode] = useState<'json' | 'ai-export'>('json');
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [fetchedData, setFetchedData] = useState<{
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    isLoading: boolean;
    error: string | null;
  }>({ inputs: {}, outputs: {}, isLoading: false, error: null });

  // Fetch content from a link URL
  const fetchLinkContent = useCallback(async (linkUri: string): Promise<any> => {
    try {
      const response = await fetch(linkUri);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch link content:', error);
      return null;
    }
  }, []);

  // Fetch all inputs and outputs when Actions view is selected
  useEffect(() => {
    if (viewMode !== 'ai-export') return;
    
    const fetchAllData = async () => {
      setFetchedData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const inputs: Record<string, any> = {};
      const outputs: Record<string, any> = {};
      
      try {
        const trigger = runDetails.properties.trigger;
        const actions = runDetails.properties.actions || {};
        
        // Fetch trigger inputs/outputs
        if (trigger.inputsLink?.uri) {
          inputs['trigger'] = {
            name: trigger.name,
            type: trigger.type,
            status: trigger.status,
            data: await fetchLinkContent(trigger.inputsLink.uri)
          };
        } else if (trigger.inputs) {
          inputs['trigger'] = {
            name: trigger.name,
            type: trigger.type,
            status: trigger.status,
            data: trigger.inputs
          };
        }
        
        if (trigger.outputsLink?.uri) {
          outputs['trigger'] = {
            name: trigger.name,
            type: trigger.type,
            status: trigger.status,
            data: await fetchLinkContent(trigger.outputsLink.uri)
          };
        } else if (trigger.outputs) {
          outputs['trigger'] = {
            name: trigger.name,
            type: trigger.type,
            status: trigger.status,
            data: trigger.outputs
          };
        }
        
        // Fetch action inputs/outputs
        for (const [name, action] of Object.entries(actions)) {
          if (action.inputsLink?.uri) {
            inputs[name] = {
              type: action.type,
              status: action.status,
              data: await fetchLinkContent(action.inputsLink.uri)
            };
          } else if (action.inputs) {
            inputs[name] = {
              type: action.type,
              status: action.status,
              data: action.inputs
            };
          }
          
          if (action.outputsLink?.uri) {
            outputs[name] = {
              type: action.type,
              status: action.status,
              data: await fetchLinkContent(action.outputsLink.uri)
            };
          } else if (action.outputs) {
            outputs[name] = {
              type: action.type,
              status: action.status,
              data: action.outputs
            };
          }
        }
        
        setFetchedData({ inputs, outputs, isLoading: false, error: null });
      } catch (error) {
        console.error('Error fetching data:', error);
        setFetchedData(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error instanceof Error ? error.message : 'Failed to fetch data' 
        }));
      }
    };
    
    fetchAllData();
  }, [viewMode, runDetails, fetchLinkContent]);

  // Extract structured data for AI analysis
  const extractAIAnalysisData = () => {
    const trigger = runDetails.properties.trigger;
    const actions = runDetails.properties.actions || {};
    
    // Use fetched data if available, otherwise use inline data
    const allInputs = Object.keys(fetchedData.inputs).length > 0 
      ? fetchedData.inputs 
      : {
          trigger: {
            name: trigger.name,
            type: trigger.type,
            status: trigger.status,
            data: trigger.inputs || null,
            hasLinkedData: !!trigger.inputsLink?.uri,
          },
          ...Object.entries(actions).reduce((acc, [name, action]) => {
            acc[name] = {
              type: action.type,
              status: action.status,
              data: action.inputs || null,
              hasLinkedData: !!action.inputsLink?.uri,
            };
            return acc;
          }, {} as Record<string, any>),
        };

    // Use fetched data if available
    const allOutputs = Object.keys(fetchedData.outputs).length > 0 
      ? fetchedData.outputs 
      : {
          trigger: {
            name: trigger.name,
            type: trigger.type,
            status: trigger.status,
            data: trigger.outputs || null,
            hasLinkedData: !!trigger.outputsLink?.uri,
          },
          ...Object.entries(actions).reduce((acc, [name, action]) => {
            acc[name] = {
              type: action.type,
              status: action.status,
              data: action.outputs || null,
              hasLinkedData: !!action.outputsLink?.uri,
            };
            return acc;
          }, {} as Record<string, any>),
        };

    // Extract failures with all available data
    const failures = Object.entries(actions)
      .filter(([_, action]) => action.status === 'Failed')
      .map(([name, action]) => ({
        actionName: name,
        type: action.type,
        status: action.status,
        error: action.error || null,
        code: action.code || null,
        inputs: fetchedData.inputs[name]?.data || action.inputs || null,
        outputs: fetchedData.outputs[name]?.data || action.outputs || null,
        startTime: action.startTime,
        endTime: action.endTime,
      }));

    // Also check trigger
    if (trigger.status === 'Failed') {
      failures.unshift({
        actionName: trigger.name,
        type: trigger.type,
        status: trigger.status,
        error: trigger.error || null,
        code: trigger.code || null,
        inputs: fetchedData.inputs['trigger']?.data || trigger.inputs || null,
        outputs: fetchedData.outputs['trigger']?.data || trigger.outputs || null,
        startTime: trigger.startTime,
        endTime: trigger.endTime,
      });
    }

    return { allInputs, allOutputs, failures, isLoading: fetchedData.isLoading };
  };

  const copySection = (section: string, data: any) => {
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const copyAllForAI = () => {
    const { allInputs, allOutputs, failures } = extractAIAnalysisData();
    const fullExport = {
      flowRunId: run.runId,
      flowName: runDetails.name,
      status: run.status,
      startTime: runDetails.properties.startTime,
      endTime: runDetails.properties.endTime,
      inputs: allInputs,
      outputs: allOutputs,
      failures: failures,
    };
    const json = JSON.stringify(fullExport, null, 2);
    navigator.clipboard.writeText(json);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const copyFullJson = () => {
    const json = JSON.stringify(runDetails, null, 2);
    navigator.clipboard.writeText(json);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Succeeded':
        return <Badge variant="success">Succeeded</Badge>;
      case 'Failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'Skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      case 'Running':
        return <Badge variant="warning">Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };


  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Flow Run Details</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Run ID: {run.runId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={viewMode === 'json' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('json')}
                className="rounded-none border-l"
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button
                variant={viewMode === 'ai-export' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('ai-export')}
                className="rounded-none border-l"
              >
                <FileJson className="w-4 h-4 mr-2" />
                Actions
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={viewMode === 'ai-export' ? copyAllForAI : copyFullJson}
            >
              <Copy className="w-4 h-4 mr-2" />
              {copiedJson ? 'Copied!' : 'Copy All'}</Button>
            {getStatusBadge(run.status)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {/* Flow Visualization */}
        <div className="overflow-hidden flex-1">
          {viewMode === 'json' ? (
            <ScrollArea className="h-full">
              <div className="p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Full Run JSON</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div style={{ height: '600px' }}>
                      <Editor
                        height="100%"
                        language="json"
                        theme={theme === 'dark' ? 'vs-dark' : 'light'}
                        value={JSON.stringify(runDetails, null, 2)}
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 13,
                          wordWrap: 'on',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          ) : (
            <ActionsPanel
              runDetails={runDetails}
              run={run}
              fetchedData={fetchedData}
            />
          )}
        </div>

      </div>
    </div>
  );
};


// Actions Panel Component - Shows per-action breakdown
interface ActionsPanelProps {
  runDetails: FlowRunDetails;
  run: FlowFailure;
  fetchedData: {
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    isLoading: boolean;
    error: string | null;
  };
}

const ActionsPanel: React.FC<ActionsPanelProps> = ({
  runDetails,
  run,
  fetchedData,
}) => {
  const { theme } = useTheme();
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [maximizedAction, setMaximizedAction] = useState<string | null>(null);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'failed'>('all');

  const trigger = runDetails.properties.trigger;
  const actions = runDetails.properties.actions || {};

  // Helper to clean up action data - extract just the useful parts
  const cleanData = (data: any, isOutput: boolean = false): any => {
    if (!data) return null;
    
    // For outputs: extract just the body (the actual result data)
    if (isOutput && data.body !== undefined) {
      return data.body;
    }
    
    // For inputs: extract parameters if available
    if (!isOutput && data.parameters !== undefined) {
      return data.parameters;
    }
    
    // If it has a body, return the body
    if (data.body !== undefined) {
      return data.body;
    }
    
    // If it's an object with headers, remove the noisy headers
    if (typeof data === 'object' && data.headers) {
      const { headers, ...rest } = data;
      if (Object.keys(rest).length === 0) return null;
      if (Object.keys(rest).length === 1 && rest.body !== undefined) {
        return rest.body;
      }
      return rest;
    }
    
    return data;
  };

  // Build list of all actions including trigger
  const allActions: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    error?: { code: string; message: string };
    startTime?: string;
    endTime?: string;
    inputs: any;
    outputs: any;
  }> = [
    {
      id: 'trigger',
      name: trigger.name,
      type: trigger.type,
      status: trigger.status,
      error: trigger.error,
      startTime: trigger.startTime,
      endTime: trigger.endTime,
      inputs: cleanData(fetchedData.inputs['trigger']?.data || trigger.inputs, false),
      outputs: cleanData(fetchedData.outputs['trigger']?.data || trigger.outputs, true),
    },
    ...Object.entries(actions).map(([name, action]) => ({
      id: name,
      name: name,
      type: action.type,
      status: action.status,
      error: action.error,
      startTime: action.startTime,
      endTime: action.endTime,
      inputs: cleanData(fetchedData.inputs[name]?.data || action.inputs, false),
      outputs: cleanData(fetchedData.outputs[name]?.data || action.outputs, true),
    })),
  ];

  // Filter actions
  const filteredActions = filter === 'failed' 
    ? allActions.filter(a => a.status === 'Failed')
    : allActions;

  const failedCount = allActions.filter(a => a.status === 'Failed').length;

  const copyActionData = (actionId: string, action: typeof allActions[0]) => {
    const data = {
      actionName: action.name,
      type: action.type,
      status: action.status,
      error: action.error || null,
      inputs: action.inputs,  // Already cleaned
      outputs: action.outputs,  // Already cleaned
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedAction(actionId);
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Succeeded': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'Failed': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'Skipped': return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
      case 'Running': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Succeeded': return <CheckCircle className="w-4 h-4" />;
      case 'Failed': return <XCircle className="w-4 h-4" />;
      case 'Skipped': return <AlertTriangle className="w-4 h-4" />;
      default: return <RefreshCw className="w-4 h-4" />;
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4">
        {/* Header with filter */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Actions</h2>
            <p className="text-sm text-muted-foreground">
              {allActions.length} actions • {failedCount > 0 ? `${failedCount} failed` : 'All succeeded'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({allActions.length})
            </Button>
            <Button
              variant={filter === 'failed' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setFilter('failed')}
              disabled={failedCount === 0}
            >
              Failed ({failedCount})
            </Button>
          </div>
        </div>

        {fetchedData.isLoading && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <div>
                  <p className="font-medium">Loading action data...</p>
                  <p className="text-sm text-muted-foreground">Fetching inputs and outputs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions List */}
        <div className="space-y-3">
          {filteredActions.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="font-medium">No failed actions</p>
                <p className="text-sm text-muted-foreground">All actions completed successfully</p>
              </CardContent>
            </Card>
          ) : (
            filteredActions.map((action) => (
              <Card 
                key={action.id} 
                className={cn(
                  "transition-all",
                  action.status === 'Failed' && "border-red-500/50 bg-red-500/5"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-1.5 rounded-md border", getStatusColor(action.status))}>
                        {getStatusIcon(action.status)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{action.name}</CardTitle>
                        <p className="text-xs text-muted-foreground font-mono">{action.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        action.status === 'Succeeded' ? 'success' : 
                        action.status === 'Failed' ? 'destructive' : 'secondary'
                      }>
                        {action.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyActionData(action.id, action)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        {copiedAction === action.id ? 'Copied!' : 'Copy'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedAction(expandedAction === action.id ? null : action.id)}
                      >
                        {expandedAction === action.id ? 'Collapse' : 'Expand'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMaximizedAction(action.id)}
                        title="Maximize"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Error display for failed actions */}
                {action.status === 'Failed' && action.error && (
                  <CardContent className="pt-0 pb-3">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">
                        Error: {action.error.code}
                      </p>
                      <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                        {action.error.message}
                      </p>
                    </div>
                  </CardContent>
                )}

                {/* Expanded view with inputs/outputs */}
                {expandedAction === action.id && (
                  <CardContent className="pt-0 space-y-4">
                    {action.startTime && (
                      <div className="text-sm text-muted-foreground">
                        <span>Started: {new Date(action.startTime).toLocaleString()}</span>
                        {action.endTime && (
                          <span className="ml-4">
                            Duration: {Math.round((new Date(action.endTime).getTime() - new Date(action.startTime).getTime()) / 1000)}s
                          </span>
                        )}
                      </div>
                    )}

                    {/* Inputs */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Inputs</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(action.inputs, null, 2));
                            setCopiedAction(`${action.id}-inputs`);
                            setTimeout(() => setCopiedAction(null), 2000);
                          }}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {copiedAction === `${action.id}-inputs` ? 'Copied!' : 'Copy Inputs'}
                        </Button>
                      </div>
                      <div className="bg-muted rounded-md overflow-hidden" style={{ height: '150px' }}>
                        <Editor
                          height="100%"
                          language="json"
                          theme={theme === 'dark' ? 'vs-dark' : 'light'}
                          value={JSON.stringify(action.inputs, null, 2) || 'null'}
                          options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            fontSize: 12,
                            wordWrap: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            lineNumbers: 'off',
                            folding: true,
                          }}
                        />
                      </div>
                    </div>

                    {/* Outputs */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Outputs</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(action.outputs, null, 2));
                            setCopiedAction(`${action.id}-outputs`);
                            setTimeout(() => setCopiedAction(null), 2000);
                          }}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {copiedAction === `${action.id}-outputs` ? 'Copied!' : 'Copy Outputs'}
                        </Button>
                      </div>
                      <div className="bg-muted rounded-md overflow-hidden" style={{ height: '150px' }}>
                        <Editor
                          height="100%"
                          language="json"
                          theme={theme === 'dark' ? 'vs-dark' : 'light'}
                          value={JSON.stringify(action.outputs, null, 2) || 'null'}
                          options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            fontSize: 12,
                            wordWrap: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            lineNumbers: 'off',
                            folding: true,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    
      {/* Maximized Action Modal */}
      {maximizedAction && (() => {
        const action = allActions.find(a => a.id === maximizedAction);
        if (!action) return null;
        
        const fullActionData = {
          actionName: action.name,
          type: action.type,
          status: action.status,
          error: action.error || null,
          timing: {
            startTime: action.startTime,
            endTime: action.endTime,
            duration: action.startTime && action.endTime 
              ? `${Math.round((new Date(action.endTime).getTime() - new Date(action.startTime).getTime()) / 1000)}s`
              : null
          },
          inputs: action.inputs,
          outputs: action.outputs,
        };
        
        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className={cn(
              "w-full max-w-5xl max-h-[90vh] rounded-lg shadow-2xl flex flex-col",
              theme === 'dark' ? 'bg-zinc-900' : 'bg-white'
            )}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className={cn("p-1.5 rounded-md border", getStatusColor(action.status))}>
                    {getStatusIcon(action.status)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{action.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{action.type}</p>
                  </div>
                  <Badge variant={
                    action.status === 'Succeeded' ? 'success' : 
                    action.status === 'Failed' ? 'destructive' : 'secondary'
                  }>
                    {action.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(fullActionData, null, 2));
                      setCopiedAction('maximized');
                      setTimeout(() => setCopiedAction(null), 2000);
                    }}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copiedAction === 'maximized' ? 'Copied!' : 'Copy All'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMaximizedAction(null)}
                  >
                    <Minimize2 className="w-4 h-4 mr-1" />
                    Close
                  </Button>
                </div>
              </div>
              
              {/* Error Banner for failed actions */}
              {action.status === 'Failed' && action.error && (
                <div className="bg-red-500/10 border-b border-red-500/20 p-3">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Error: {action.error.code}
                  </p>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                    {action.error.message}
                  </p>
                </div>
              )}
              
              {/* Full JSON Editor */}
              <div className="flex-1 overflow-hidden p-4">
                <Editor
                  height="100%"
                  language="json"
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  value={JSON.stringify(fullActionData, null, 2)}
                  options={{
                    readOnly: true,
                    minimap: { enabled: true },
                    fontSize: 13,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    lineNumbers: 'on',
                    folding: true,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </ScrollArea>
  );
};


const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Succeeded':
      return <Badge variant="success">Succeeded</Badge>;
    case 'Failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'Skipped':
      return <Badge variant="secondary">Skipped</Badge>;
    case 'Running':
      return <Badge variant="warning">Running</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};