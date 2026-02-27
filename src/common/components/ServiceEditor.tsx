import React, { useState, useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import {
  Copy,
  Download,
  Save,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Undo2,
} from 'lucide-react';
import type { EditorTabConfig, ServiceContext, SaveResult } from '../types/serviceEditor';

interface ServiceEditorProps {
  tabs: EditorTabConfig[];
  context: ServiceContext;
  /** Called when save completes (success or failure) */
  onSaveComplete?: (tabId: string, result: SaveResult) => void;
}

type TabState = {
  originalJson: string;
  currentJson: string;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  lastFetched: number | null;
  saveMessage: { text: string; type: 'success' | 'error' } | null;
};

export const ServiceEditor: React.FC<ServiceEditorProps> = ({
  tabs,
  context,
  onSaveComplete,
}) => {
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id || '');
  const [tabStates, setTabStates] = useState<Record<string, TabState>>({});
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const getTabState = (tabId: string): TabState => {
    return tabStates[tabId] || {
      originalJson: '',
      currentJson: '',
      isLoading: false,
      isSaving: false,
      error: null,
      lastFetched: null,
      saveMessage: null,
    };
  };

  const updateTabState = useCallback((tabId: string, updates: Partial<TabState>) => {
    setTabStates(prev => ({
      ...prev,
      [tabId]: { ...( prev[tabId] || {
        originalJson: '',
        currentJson: '',
        isLoading: false,
        isSaving: false,
        error: null,
        lastFetched: null,
        saveMessage: null,
      }), ...updates },
    }));
  }, []);

  // Check if tab has required context
  const isTabAvailable = useCallback((tab: EditorTabConfig) => {
    if (!tab.requiresContext) return true;
    return tab.requiresContext.every(key => {
      const val = context[key];
      return val !== undefined && val !== null && val !== '';
    });
  }, [context]);

  // Fetch data for a tab
  const fetchTabData = useCallback(async (tab: EditorTabConfig) => {
    if (!isTabAvailable(tab)) return;
    updateTabState(tab.id, { isLoading: true, error: null, saveMessage: null });
    try {
      const data = await tab.fetchData(context);
      const json = JSON.stringify(data, null, 2);
      updateTabState(tab.id, {
        originalJson: json,
        currentJson: json,
        isLoading: false,
        lastFetched: Date.now(),
      });
      // Update editor if this is the active tab
      if (editorRef.current && tab.id === activeTabId) {
        editorRef.current.setValue(json);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      updateTabState(tab.id, { isLoading: false, error: message });
    }
  }, [context, activeTabId, isTabAvailable, updateTabState]);

  // Auto-fetch when switching tabs (if not already loaded)
  useEffect(() => {
    if (!activeTab || !isTabAvailable(activeTab)) return;
    const state = getTabState(activeTab.id);
    if (!state.lastFetched && !state.isLoading) {
      fetchTabData(activeTab);
    }
  }, [activeTabId]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!activeTab || !activeTab.saveData) return;
    const state = getTabState(activeTab.id);

    // Parse both to compare
    let original: unknown;
    let modified: unknown;
    try {
      original = JSON.parse(state.originalJson);
      modified = JSON.parse(state.currentJson);
    } catch {
      updateTabState(activeTab.id, {
        saveMessage: { text: 'Invalid JSON - fix syntax errors before saving', type: 'error' },
      });
      return;
    }

    setShowConfirm(false);
    updateTabState(activeTab.id, { isSaving: true, saveMessage: null });

    try {
      const result = await activeTab.saveData(context, original, modified);
      updateTabState(activeTab.id, {
        isSaving: false,
        saveMessage: { text: result.message, type: result.success ? 'success' : 'error' },
      });
      if (result.success) {
        // Update original to match current (no longer dirty)
        const newJson = result.updatedData
          ? JSON.stringify(result.updatedData, null, 2)
          : state.currentJson;
        updateTabState(activeTab.id, { originalJson: newJson, currentJson: newJson });
        if (editorRef.current) {
          editorRef.current.setValue(newJson);
        }
      }
      onSaveComplete?.(activeTab.id, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      updateTabState(activeTab.id, {
        isSaving: false,
        saveMessage: { text: message, type: 'error' },
      });
    }
  }, [activeTab, tabStates, context, onSaveComplete, updateTabState]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    const state = getTabState(activeTabId);
    await navigator.clipboard.writeText(state.currentJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeTabId, tabStates]);

  // Download as file
  const handleDownload = useCallback(() => {
    const state = getTabState(activeTabId);
    const blob = new Blob([state.currentJson], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeTabId}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [activeTabId, tabStates]);

  // Discard changes
  const handleDiscard = useCallback(() => {
    const state = getTabState(activeTabId);
    updateTabState(activeTabId, { currentJson: state.originalJson, saveMessage: null });
    if (editorRef.current) {
      editorRef.current.setValue(state.originalJson);
    }
  }, [activeTabId, tabStates, updateTabState]);

  // Editor change handler
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      updateTabState(activeTabId, { currentJson: value });
    }
  }, [activeTabId, updateTabState]);

  const currentState = getTabState(activeTabId);
  const isDirty = currentState.originalJson !== currentState.currentJson;
  const isReadOnly = activeTab?.readOnly || !activeTab?.saveData;
  const tabAvailable = activeTab ? isTabAvailable(activeTab) : false;

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Tab Bar */}
      <div className="border-b bg-muted/30 px-2 flex items-center gap-1 overflow-x-auto shrink-0">
        {tabs.map(tab => {
          const available = isTabAvailable(tab);
          const state = getTabState(tab.id);
          const tabDirty = state.originalJson !== state.currentJson;

          return (
            <button
              key={tab.id}
              onClick={() => {
                // Save current editor value before switching
                if (editorRef.current && activeTabId) {
                  updateTabState(activeTabId, { currentJson: editorRef.current.getValue() });
                }
                setActiveTabId(tab.id);
              }}
              disabled={!available}
              className={cn(
                'px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors',
                tab.id === activeTabId
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
                !available && 'opacity-40 cursor-not-allowed',
              )}
              title={!available ? `Requires: ${tab.requiresContext?.join(', ')}` : tab.description}
            >
              {tab.label}
              {tab.readOnly && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">RO</Badge>
              )}
              {tabDirty && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
              )}
              {state.isLoading && (
                <Loader2 className="ml-1 w-3 h-3 animate-spin inline" />
              )}
            </button>
          );
        })}
      </div>

      {/* Action Bar */}
      <div className="border-b px-3 py-1.5 flex items-center gap-2 flex-wrap shrink-0">
        {/* Left: status */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mr-auto">
          {currentState.lastFetched && (
            <span>Fetched {new Date(currentState.lastFetched).toLocaleTimeString()}</span>
          )}
          {isDirty && (
            <Badge variant="warning" className="text-[10px]">Unsaved changes</Badge>
          )}
          {isReadOnly && (
            <Badge variant="secondary" className="text-[10px]">Read Only</Badge>
          )}
        </div>

        {/* Right: actions */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => activeTab && fetchTabData(activeTab)}
          disabled={currentState.isLoading || !tabAvailable}
          title="Refresh data from service"
        >
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1', currentState.isLoading && 'animate-spin')} />
          Refresh
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={handleCopy}
          disabled={!currentState.currentJson}
          title="Copy JSON to clipboard"
        >
          {copied ? (
            <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
          ) : (
            <Copy className="w-3.5 h-3.5 mr-1" />
          )}
          {copied ? 'Copied!' : 'Copy'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={handleDownload}
          disabled={!currentState.currentJson}
          title="Download as JSON file"
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          Download
        </Button>

        {isDirty && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleDiscard}
            title="Discard changes"
          >
            <Undo2 className="w-3.5 h-3.5 mr-1" />
            Discard
          </Button>
        )}

        {!isReadOnly && (
          <Button
            variant={isDirty ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowConfirm(true)}
            disabled={!isDirty || currentState.isSaving}
            title="Save changes to service"
          >
            {currentState.isSaving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1" />
            )}
            {currentState.isSaving ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>

      {/* Save Message */}
      {currentState.saveMessage && (
        <div className={cn(
          'px-3 py-2 text-sm flex items-center gap-2 shrink-0',
          currentState.saveMessage.type === 'success'
            ? 'bg-green-500/10 text-green-700 dark:text-green-400'
            : 'bg-red-500/10 text-red-700 dark:text-red-400',
        )}>
          {currentState.saveMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {currentState.saveMessage.text}
          <button
            className="ml-auto text-xs underline"
            onClick={() => updateTabState(activeTabId, { saveMessage: null })}
          >
            dismiss
          </button>
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 min-h-0">
        {!tabAvailable ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>Select a {activeTab?.label?.toLowerCase() || 'resource'} to load data</p>
              {activeTab?.requiresContext && (
                <p className="text-xs mt-1">Requires: {activeTab.requiresContext.join(', ')}</p>
              )}
            </div>
          </div>
        ) : currentState.isLoading && !currentState.currentJson ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading {activeTab?.label}...</p>
            </div>
          </div>
        ) : currentState.error && !currentState.currentJson ? (
          <div className="h-full flex items-center justify-center text-destructive">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">{currentState.error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => activeTab && fetchTabData(activeTab)}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <Editor
            value={currentState.currentJson}
            language="json"
            theme="vs-dark"
            onChange={handleEditorChange}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
            options={{
              readOnly: isReadOnly,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              wordWrap: 'on',
              automaticLayout: true,
              bracketPairColorization: { enabled: true },
              matchBrackets: 'always',
              lineNumbers: 'on',
              folding: true,
              tabSize: 2,
            }}
          />
        )}
      </div>

      {/* Save Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Save changes?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will push your changes to {activeTab?.label} in the live M365 service.
              Make sure you have a snapshot saved if you want to roll back.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleSave}>
                <Save className="w-3.5 h-3.5 mr-1" />
                Save to Service
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
