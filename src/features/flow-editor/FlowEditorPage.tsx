import {
  CommandBar,
  ICommandBarItemProps
} from '@fluentui/react/lib/CommandBar';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useMemo, useState, useEffect } from 'react';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { cn } from '../../lib/utils';
import { Eye, FileJson, Copy, ChevronDown, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { LoaderModal } from '../../common/components/LoaderModal';
import { Messages } from '../../common/components/Messages';
import { FlowValidationResult } from './FlowValidationResult';
import { useFlowEditor } from './useFlowEditor';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useTheme } from '../../contexts/ThemeContext';

const editorContainerClassName = mergeStyles({
  flex: 1,
});

// Helper function to find matching brackets
function findMatchingBrackets(text: string, position: number): { start: number; end: number } | null {
  const char = text[position];
  
  if (char === '{') {
    // Find closing bracket
    let count = 1;
    let i = position + 1;
    let inString = false;
    let escapeNext = false;
    
    while (i < text.length && count > 0) {
      const currentChar = text[i];
      
      if (escapeNext) {
        escapeNext = false;
      } else if (currentChar === '\\') {
        escapeNext = true;
      } else if (currentChar === '"' && !inString) {
        inString = true;
      } else if (currentChar === '"' && inString) {
        inString = false;
      } else if (!inString) {
        if (currentChar === '{') count++;
        else if (currentChar === '}') count--;
      }
      
      i++;
    }
    
    if (count === 0) {
      return { start: position, end: i - 1 };
    }
  } else if (char === '}') {
    // Find opening bracket
    let count = 1;
    let i = position - 1;
    let inString = false;
    
    while (i >= 0 && count > 0) {
      const currentChar = text[i];
      
      if (currentChar === '"') {
        // Check if it's escaped
        let escapeCount = 0;
        let j = i - 1;
        while (j >= 0 && text[j] === '\\') {
          escapeCount++;
          j--;
        }
        if (escapeCount % 2 === 0) {
          inString = !inString;
        }
      } else if (!inString) {
        if (currentChar === '}') count++;
        else if (currentChar === '{') count--;
      }
      
      i--;
    }
    
    if (count === 0) {
      return { start: i + 1, end: position };
    }
  }
  
  return null;
}


// Component to display flow actions in a structured view
interface FlowActionsViewProps {
  definition: string;
  theme: string;
  onSave: (newDefinition: string) => Promise<void>;
  onValidate: (newDefinition: string) => void;
}

const FlowActionsView: React.FC<FlowActionsViewProps> = ({ definition, theme, onSave, onValidate }) => {
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [maximizedAction, setMaximizedAction] = useState<string | null>(null);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [editedActions, setEditedActions] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Parse the definition to extract actions
  const parsedDef = React.useMemo(() => {
    try {
      const parsed = JSON.parse(definition);
      return parsed.definition || parsed;
    } catch {
      return null;
    }
  }, [definition]);

  const actions = parsedDef?.actions || {};
  const triggers = parsedDef?.triggers || {};

  const copyActionData = (actionId: string, data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedAction(actionId);
    setTimeout(() => setCopiedAction(null), 2000);
  };

  // Handle action JSON changes
  const handleActionChange = (itemId: string, value: string | undefined) => {
    if (value !== undefined) {
      setEditedActions(prev => ({ ...prev, [itemId]: value }));
      setHasChanges(prev => ({ ...prev, [itemId]: true }));
    }
  };

  // Get current value for an action (edited or original)
  const getActionValue = (itemId: string, originalData: any): string => {
    return editedActions[itemId] ?? JSON.stringify(originalData, null, 2);
  };

  // Build updated definition with edited action
  const buildUpdatedDefinition = (itemId: string): string => {
    try {
      const fullDef = JSON.parse(definition);
      const innerDef = fullDef.definition || fullDef;
      const editedValue = JSON.parse(editedActions[itemId]);
      
      if (itemId.startsWith('trigger-')) {
        const triggerName = itemId.replace('trigger-', '');
        innerDef.triggers[triggerName] = editedValue;
      } else {
        innerDef.actions[itemId] = editedValue;
      }
      
      if (fullDef.definition) {
        fullDef.definition = innerDef;
        return JSON.stringify(fullDef, null, 2);
      }
      return JSON.stringify(innerDef, null, 2);
    } catch (e) {
      console.error('Failed to build updated definition:', e);
      return definition;
    }
  };

  // Save changes for a specific action
  const handleSaveAction = async (itemId: string) => {
    if (!hasChanges[itemId]) return;
    
    try {
      // Validate JSON first
      JSON.parse(editedActions[itemId]);
    } catch (e) {
      alert('Invalid JSON. Please fix syntax errors before saving.');
      return;
    }
    
    setIsSaving(true);
    try {
      const updatedDef = buildUpdatedDefinition(itemId);
      await onSave(updatedDef);
      setHasChanges(prev => ({ ...prev, [itemId]: false }));
    } finally {
      setIsSaving(false);
    }
  };

  // Validate changes for a specific action
  const handleValidateAction = (itemId: string) => {
    try {
      JSON.parse(editedActions[itemId]);
    } catch (e) {
      alert('Invalid JSON. Please fix syntax errors before validating.');
      return;
    }
    
    const updatedDef = buildUpdatedDefinition(itemId);
    onValidate(updatedDef);
  };

  // Discard changes for a specific action
  const handleDiscardChanges = (itemId: string, originalData: any) => {
    setEditedActions(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
    setHasChanges(prev => ({ ...prev, [itemId]: false }));
  };

  // Get action type display name
  const getActionType = (action: any): string => {
    if (action.type) return action.type;
    if (action.kind) return action.kind;
    return 'Unknown';
  };

  // Get action description or summary
  const getActionDescription = (action: any): string | null => {
    if (action.metadata?.operationMetadataId) return action.metadata.operationMetadataId;
    if (action.description) return action.description;
    return null;
  };

  const allItems = [
    ...Object.entries(triggers).map(([name, trigger]) => ({
      id: `trigger-${name}`,
      name,
      data: trigger,
      isTrigger: true,
    })),
    ...Object.entries(actions).map(([name, action]) => ({
      id: name,
      name,
      data: action,
      isTrigger: false,
    })),
  ];

  if (!parsedDef) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Unable to parse flow definition</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Flow Actions</h2>
          <p className="text-sm text-muted-foreground">
            {Object.keys(triggers).length} trigger(s) • {Object.keys(actions).length} action(s)
          </p>
        </div>

        {/* Actions List */}
        <div className="space-y-3">
          {allItems.map((item) => (
            <Card key={item.id} className={cn(
              "transition-all",
              item.isTrigger && "border-blue-500/50 bg-blue-500/5"
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-1.5 rounded-md border",
                      item.isTrigger 
                        ? "text-blue-500 bg-blue-500/10 border-blue-500/20"
                        : "text-gray-500 bg-gray-500/10 border-gray-500/20"
                    )}>
                      {item.isTrigger ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">
                        {getActionType(item.data)}
                      </p>
                      {getActionDescription(item.data) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getActionDescription(item.data)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.isTrigger ? "default" : "secondary"}>
                      {item.isTrigger ? 'Trigger' : 'Action'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyActionData(item.id, item.data)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      {copiedAction === item.id ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedAction(expandedAction === item.id ? null : item.id)}
                    >
                      {expandedAction === item.id ? (
                        <ChevronDown className="w-4 h-4 mr-1" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mr-1" />
                      )}
                      {expandedAction === item.id ? 'Collapse' : 'Expand'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMaximizedAction(item.id)}
                      title="Maximize"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Expanded view */}
              {expandedAction === item.id && (
                <CardContent className="pt-0 space-y-3">
                  {/* Action buttons when changes exist */}
                  {hasChanges[item.id] && (
                    <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-md p-2">
                      <span className="text-sm text-yellow-600 dark:text-yellow-400">
                        Unsaved changes
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDiscardChanges(item.id, item.data)}
                        >
                          Discard
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleValidateAction(item.id)}
                        >
                          Validate
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSaveAction(item.id)}
                          disabled={isSaving}
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="bg-muted rounded-md overflow-hidden" style={{ height: '400px' }}>
                    <Editor
                      height="100%"
                      language="json"
                      theme={theme === 'dark' ? 'vs-dark' : 'light'}
                      value={getActionValue(item.id, item.data)}
                      onChange={(value) => handleActionChange(item.id, value)}
                      options={{
                        readOnly: false,
                        minimap: { enabled: false },
                        fontSize: 13,
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        lineNumbers: 'on',
                        folding: true,
                        tabSize: 2,
                      }}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Maximized Action Modal */}
      {maximizedAction && (() => {
        const item = allItems.find(a => a.id === maximizedAction);
        if (!item) return null;
        
        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className={cn(
              "w-full max-w-5xl h-[85vh] rounded-lg shadow-2xl flex flex-col",
              theme === 'dark' ? 'bg-zinc-900' : 'bg-white'
            )}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-1.5 rounded-md border",
                    item.isTrigger 
                      ? "text-blue-500 bg-blue-500/10 border-blue-500/20"
                      : "text-gray-500 bg-gray-500/10 border-gray-500/20"
                  )}>
                    {item.isTrigger ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{getActionType(item.data)}</p>
                  </div>
                  <Badge variant={item.isTrigger ? "default" : "secondary"}>
                    {item.isTrigger ? 'Trigger' : 'Action'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {hasChanges[item.id] && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDiscardChanges(item.id, item.data)}
                      >
                        Discard
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleValidateAction(item.id)}
                      >
                        Validate
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSaveAction(item.id)}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      copyActionData('maximized', item.data);
                    }}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copiedAction === 'maximized' ? 'Copied!' : 'Copy'}
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
              
              {/* Full JSON Editor */}
              <div className="flex-1 overflow-hidden p-4 min-h-0">
                <Editor
                  height="100%"
                  language="json"
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  value={getActionValue(item.id, item.data)}
                  onChange={(value) => handleActionChange(item.id, value)}
                  options={{
                    readOnly: false,
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

export const FlowEditorPage: React.FC = () => {
  const { theme } = useTheme();
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>(
    null as any
  );
  const [viewMode, setViewMode] = useState<'full' | 'actions'>('full');
  
  // Apply dark mode styles to command bar
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'flow-editor-dark-mode';
    
    if (theme === 'dark') {
      style.textContent = `
        .ms-CommandBar {
          background-color: rgb(17 24 39) !important;
          border-bottom: 1px solid rgb(31 41 55) !important;
        }
        .ms-CommandBar-primaryCommand,
        .ms-CommandBar-secondaryCommand {
          background-color: rgb(17 24 39) !important;
        }
        .ms-CommandBarItem-link,
        .ms-CommandBarItem-text,
        .ms-CommandBarItem-link .ms-CommandBarItem-text,
        .ms-Button-label,
        .ms-CommandBar .ms-Button-label {
          color: rgb(229 231 235) !important;
        }
        .ms-CommandBarItem-link:hover,
        .ms-CommandBarItem-link:hover .ms-CommandBarItem-text,
        .ms-CommandBarItem-link:hover .ms-Button-label {
          background-color: rgb(31 41 55) !important;
          color: rgb(229 231 235) !important;
        }
        .ms-CommandBarItem-icon,
        .ms-Icon,
        .ms-CommandBarItem-link .ms-Icon {
          color: rgb(156 163 175) !important;
        }
        .ms-CommandBarItem-link:hover .ms-CommandBarItem-icon,
        .ms-CommandBarItem-link:hover .ms-Icon {
          color: rgb(229 231 235) !important;
        }
        .ms-CommandBarItem-link.is-disabled,
        .ms-CommandBarItem-link.is-disabled .ms-CommandBarItem-text,
        .ms-CommandBarItem-link.is-disabled .ms-Button-label {
          color: rgb(75 85 99) !important;
        }
        .ms-CommandBarItem-link.is-disabled .ms-CommandBarItem-icon,
        .ms-CommandBarItem-link.is-disabled .ms-Icon {
          color: rgb(75 85 99) !important;
        }
        /* Force all text elements to use the right color */
        .ms-CommandBar,
        .ms-CommandBar *,
        .ms-CommandBar button,
        .ms-CommandBar button span,
        .ms-CommandBar .ms-Button,
        .ms-CommandBar .ms-Button-flexContainer,
        .ms-CommandBar .ms-Button-textContainer,
        .ms-Button--commandBar,
        .ms-Button--commandBar *,
        .ms-Button--commandBar .ms-Button-label,
        .ms-Button--commandBar .ms-Button-textContainer,
        .ms-Button--commandBar .ms-Button-flexContainer,
        .ms-OverflowSet .ms-Button,
        .ms-OverflowSet .ms-Button *,
        .ms-OverflowSet .ms-Button-label,
        .primarySet-121 .ms-Button,
        .primarySet-121 .ms-Button-label,
        .primarySet-121 button,
        .primarySet-121 button span {
          color: rgb(229 231 235) !important;
          background-color: transparent !important;
        }
        .ms-CommandBar button:hover,
        .ms-CommandBar button:hover *,
        .ms-Button--commandBar:hover,
        .ms-Button--commandBar:hover * {
          color: rgb(229 231 235) !important;
          background-color: rgb(31 41 55) !important;
        }
        /* Ensure the command bar buttons have the right background */
        .ms-CommandBar .ms-Button--commandBar,
        .ms-OverflowSet-item .ms-Button {
          background-color: rgb(17 24 39) !important;
        }
        .ms-CommandBar .ms-Button--commandBar:hover,
        .ms-OverflowSet-item .ms-Button:hover {
          background-color: rgb(31 41 55) !important;
        }
      `;
    } else {
      // Light mode - ensure proper colors
      style.textContent = `
        .ms-CommandBar {
          background-color: #f3f2f1 !important;
          border-bottom: 1px solid #e1e1e1 !important;
        }
        .ms-CommandBarItem-link,
        .ms-CommandBarItem-text,
        .ms-CommandBarItem-link .ms-CommandBarItem-text,
        .ms-Button-label,
        .ms-CommandBar .ms-Button-label {
          color: #323130 !important;
        }
        .ms-CommandBarItem-link:hover,
        .ms-CommandBarItem-link:hover .ms-CommandBarItem-text,
        .ms-CommandBarItem-link:hover .ms-Button-label {
          background-color: #edebe9 !important;
          color: #201f1e !important;
        }
        .ms-CommandBarItem-icon,
        .ms-Icon,
        .ms-CommandBarItem-link .ms-Icon {
          color: #605e5c !important;
        }
        .ms-CommandBarItem-link:hover .ms-CommandBarItem-icon,
        .ms-CommandBarItem-link:hover .ms-Icon {
          color: #323130 !important;
        }
      `;
    }
    
    // Remove existing style if it exists
    const existingStyle = document.getElementById('flow-editor-dark-mode');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    document.head.appendChild(style);
    
    return () => {
      const styleToRemove = document.getElementById('flow-editor-dark-mode');
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, [theme]);
  
  const {
    name,
    environment,
    definition,
    isLoading,
    saveDefinition,
    validate,
    messages,
    onDismissed,
    validationResult,
    validationPaneIsOpen,
    setValidationPaneIsOpen,
  } = useFlowEditor();

  const refreshToken = () => {
    chrome.runtime.sendMessage({ type: 'refresh' });
  };

  const commandBarItems = useMemo(
    () =>
      [
        {
          key: 'name',
          text: name || 'Loading...',
        },
        {
          key: 'save',
          text: 'Save',
          iconProps: {
            iconName: 'Save',
          },
          disabled: !editor || !definition,
          onClick: async () => {
            const savedDefinition = await saveDefinition(name, environment, editor.getValue());

            if (savedDefinition) {
              editor.setValue(savedDefinition);
            }
          },
        },
        {
          key: 'validate',
          text: 'Validate',
          iconProps: {
            iconName: 'ComplianceAudit',
          },
          disabled: !editor || !definition,
          onClick: () => validate(editor.getValue()),
        },
        {
          key: 'export',
          text: 'Export',
          iconProps: {
            iconName: 'Download',
          },
          disabled: !definition,
          onClick: () => {
            const content = editor ? editor.getValue() : definition;
            const now = new Date();
            const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `${name || 'Flow'} ${dateStr}.json`;
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          },
        },
        {
          key: 'refresh',
          text: 'Refresh Token',
          iconProps: {
            iconName: 'Refresh',
          },
          onClick: refreshToken,
        },
      ] as ICommandBarItemProps[],
    [name, editor, definition, saveDefinition, validate, environment]
  );

  const commandBarFarItems = useMemo(
    () => [
      {
        key: 'viewToggle',
        onRender: () => (
          <div className="flex items-center gap-1 mr-2">
            <Button
              variant={viewMode === 'full' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('full')}
              className="h-8"
            >
              <FileJson className="w-4 h-4 mr-1" />
              Full JSON
            </Button>
            <Button
              variant={viewMode === 'actions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('actions')}
              className="h-8"
            >
              <Eye className="w-4 h-4 mr-1" />
              Actions
            </Button>
          </div>
        )
      },
      {
        key: 'theme',
        onRender: () => <ThemeToggle />
      }
    ],
    [viewMode]
  );

  return (
    <>
      {isLoading && <LoaderModal />}
      <Messages items={messages} onDismissed={onDismissed} />
      <FlowValidationResult
        errors={validationResult.errors}
        warnings={validationResult.warnings}
        isOpen={validationPaneIsOpen}
        onClose={() => setValidationPaneIsOpen(false)}
      />
      <CommandBar items={commandBarItems} farItems={commandBarFarItems} />
      {!!definition && (
        <div className={editorContainerClassName}>
          {viewMode === 'actions' ? (
            <FlowActionsView 
              definition={definition} 
              theme={theme}
              onSave={async (newDef) => {
                const result = await saveDefinition(name, environment, newDef);
                if (result && editor) {
                  editor.setValue(result);
                }
              }}
              onValidate={(newDef) => validate(newDef)}
            />
          ) : (
            <Editor
              defaultValue={definition}
            language="json"
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            onMount={(editor) => {
              setEditor(editor);
              
              // Add block highlighting on cursor position change
              let currentDecorations: string[] = [];
              
              editor.onDidChangeCursorPosition((e) => {
                const model = editor.getModel();
                if (!model) return;
                
                const position = e.position;
                const text = model.getValue();
                const offset = model.getOffsetAt(position);
                
                // Check if cursor is at a bracket
                const charAtCursor = text[offset - 1];
                const charAfterCursor = text[offset];
                
                let shouldHighlight = false;
                let brackets = null;
                
                if (charAtCursor === '{' || charAtCursor === '}') {
                  brackets = findMatchingBrackets(text, offset - 1);
                  shouldHighlight = !!brackets;
                } else if (charAfterCursor === '{' || charAfterCursor === '}') {
                  brackets = findMatchingBrackets(text, offset);
                  shouldHighlight = !!brackets;
                }
                
                if (shouldHighlight && brackets) {
                  const startPos = model.getPositionAt(brackets.start);
                  const endPos = model.getPositionAt(brackets.end + 1);
                  
                  // Apply new decoration
                  currentDecorations = editor.deltaDecorations(currentDecorations, [
                    {
                      range: new monaco.Range(
                        startPos.lineNumber,
                        startPos.column,
                        endPos.lineNumber,
                        endPos.column
                      ),
                      options: {
                        className: 'block-highlight',
                        isWholeLine: false,
                        linesDecorationsClassName: 'block-highlight-margin'
                      }
                    }
                  ]);
                } else {
                  // Clear all decorations
                  currentDecorations = editor.deltaDecorations(currentDecorations, []);
                }
              });
              
              // Add CSS for highlighting
              const style = document.createElement('style');
              style.textContent = `
                .block-highlight {
                  background-color: rgba(65, 150, 255, 0.15);
                  border: 1px solid rgba(65, 150, 255, 0.3);
                  border-radius: 3px;
                }
                .block-highlight-margin {
                  background-color: #4196ff;
                  width: 3px !important;
                }
                .monaco-editor .block-highlight {
                  background-color: rgba(65, 150, 255, 0.15);
                }
                .monaco-editor.vs-dark .block-highlight {
                  background-color: rgba(65, 150, 255, 0.25);
                }
              `;
              document.head.appendChild(style);
              
              // Add keyboard shortcut to select highlighted block
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyH, () => {
                const model = editor.getModel();
                if (!model) return;
                
                const position = editor.getPosition();
                if (!position) return;
                
                const text = model.getValue();
                const offset = model.getOffsetAt(position);
                
                // Check both positions like in the highlight logic
                let brackets = findMatchingBrackets(text, offset - 1);
                if (!brackets) {
                  brackets = findMatchingBrackets(text, offset);
                }
                
                if (brackets) {
                  const startPos = model.getPositionAt(brackets.start);
                  const endPos = model.getPositionAt(brackets.end + 1);
                  
                  editor.setSelection(new monaco.Selection(
                    startPos.lineNumber,
                    startPos.column,
                    endPos.lineNumber,
                    endPos.column
                  ));
                }
              });
            }}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
              bracketPairColorization: {
                enabled: true,
              },
              matchBrackets: 'always',
            }}
          />
          )}
        </div>
      )}
    </>
  );
};
