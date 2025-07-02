import {
  CommandBar,
  ICommandBarItemProps
} from '@fluentui/react/lib/CommandBar';
import { DetailsList, DetailsListLayoutMode, IColumn } from '@fluentui/react/lib/DetailsList';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useMemo, useState, useEffect } from 'react';
import { LoaderModal } from '../../common/components/LoaderModal';
import { Messages } from '../../common/components/Messages';
import { FlowFailure, FlowRunAction } from './types';
import { useFlowFailures } from './useFlowFailures';

const containerClassName = mergeStyles({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
});

const listContainerClassName = mergeStyles({
  flex: 1,
  padding: '20px',
});

const editorContainerClassName = mergeStyles({
  flex: 1,
  height: '100%',
});

export const FlowFailuresPage: React.FC = () => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  const {
    isLoading,
    isLoadingDetails,
    failures,
    selectedFailure,
    selectedRunDetails,
    showAllRuns,
    debugMode,
    selectFailure,
    refreshFailures,
    toggleShowAllRuns,
    toggleDebugMode,
    messages,
    onDismissed,
    addMessage,
  } = useFlowFailures();

  // Prepare the JSON content for the editor with failed actions highlighted
  const editorContent = useMemo(() => {
    if (!selectedRunDetails) return '';

    if (debugMode) {
      // In debug mode, show the raw API response
      return JSON.stringify(selectedRunDetails, null, 2);
    }

    // Extract failed actions for better visibility
    const failedActions: { [key: string]: FlowRunAction } = {};
    const skippedActions: { [key: string]: FlowRunAction } = {};
    const succeededActions: { [key: string]: FlowRunAction } = {};
    
    if (selectedRunDetails.properties.actions) {
      Object.entries(selectedRunDetails.properties.actions).forEach(([key, action]) => {
        if (action.status === 'Failed') {
          failedActions[key] = action;
        } else if (action.status === 'Skipped') {
          skippedActions[key] = action;
        } else if (action.status === 'Succeeded') {
          succeededActions[key] = action;
        }
      });
    }

    const runData = {
      runId: selectedRunDetails.name,
      type: selectedRunDetails.type,
      status: selectedRunDetails.properties.status,
      startTime: selectedRunDetails.properties.startTime,
      endTime: selectedRunDetails.properties.endTime,
      duration: selectedRunDetails.properties.endTime 
        ? `${Math.round((new Date(selectedRunDetails.properties.endTime).getTime() - new Date(selectedRunDetails.properties.startTime).getTime()) / 1000)}s`
        : 'N/A',
      correlation: selectedRunDetails.properties.correlation,
      
      // Summary section
      summary: {
        totalActions: selectedRunDetails.properties.actions ? Object.keys(selectedRunDetails.properties.actions).length : 0,
        failedActions: Object.keys(failedActions).length,
        skippedActions: Object.keys(skippedActions).length,
        succeededActions: Object.keys(succeededActions).length,
        triggerFailed: selectedRunDetails.properties.trigger?.status === 'Failed',
      },
      
      // Trigger details
      trigger: selectedRunDetails.properties.trigger,
      
      // Failed actions first for visibility
      failedActions: Object.keys(failedActions).length > 0 ? failedActions : undefined,
      
      // Skipped actions
      skippedActions: Object.keys(skippedActions).length > 0 ? skippedActions : undefined,
      
      // All actions (including succeeded) - useful for debugging flow logic
      allActions: selectedRunDetails.properties.actions || {},
      
      // Outputs if any
      outputs: selectedRunDetails.properties.outputs || undefined,
    };

    // Remove undefined fields for cleaner JSON
    Object.keys(runData).forEach(key => {
      if (runData[key as keyof typeof runData] === undefined) {
        delete runData[key as keyof typeof runData];
      }
    });

    return JSON.stringify(runData, null, 2);
  }, [selectedRunDetails, debugMode]);

  // Highlight failed actions in the editor
  useEffect(() => {
    if (editor && selectedRunDetails && selectedFailure) {
      const model = editor.getModel();
      if (!model) return;

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];
      const content = model.getValue();
      const lines = content.split('\n');

      // Find and highlight failed/skipped actions by looking for specific patterns
      const failedActionPatterns = [
        /"status":\s*"Failed"/g,
        /"status":\s*"ActionSkipped"/g,
        /"code":\s*"ActionSkipped"/g,
        /"error":\s*{/g
      ];

      failedActionPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const position = model.getPositionAt(match.index);
          
          // Find the containing action block by looking backwards and forwards
          let startLine = position.lineNumber;
          let endLine = position.lineNumber;
          
          // Look backwards to find the start of the action block
          for (let i = position.lineNumber - 1; i >= 1; i--) {
            const line = model.getLineContent(i);
            if (line.includes('"id":') || line.includes('"runName":') || line.includes('"type":')) {
              startLine = i;
              break;
            }
            if (line.trim().match(/^"[^"]+"\s*:\s*{/)) {
              startLine = i;
              break;
            }
          }
          
          // Look forwards to find the end of the action block
          let braceCount = 0;
          let foundActionStart = false;
          for (let i = startLine; i <= model.getLineCount(); i++) {
            const line = model.getLineContent(i);
            if (line.includes('{')) {
              braceCount += (line.match(/\{/g) || []).length;
              foundActionStart = true;
            }
            if (line.includes('}')) {
              braceCount -= (line.match(/\}/g) || []).length;
            }
            if (foundActionStart && braceCount === 0) {
              endLine = i;
              break;
            }
          }

          // Add highlighting for this failed action block
          decorations.push({
            range: new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine)),
            options: {
              isWholeLine: true,
              className: 'failed-action-highlight',
              glyphMarginClassName: 'failed-action-glyph',
              hoverMessage: {
                value: `**Failed/Skipped Action**\n\nThis action failed or was skipped. Check the status and error details.`
              }
            }
          });
        }
      });

      // Apply decorations
      const decorationIds = editor.deltaDecorations([], decorations);
      console.log('[FlowFailuresPage] Applied decorations:', decorations.length, 'decoration IDs:', decorationIds);

      // Add custom CSS for highlighting
      const style = document.createElement('style');
      style.textContent = `
        .failed-action-highlight {
          background-color: rgba(255, 99, 99, 0.2) !important;
          border-left: 4px solid #ff6b6b !important;
          margin-left: -4px !important;
        }
        .failed-action-glyph {
          background-color: #ff6b6b !important;
          width: 6px !important;
        }
        .failed-action-glyph::after {
          content: "⚠" !important;
          color: white !important;
          font-weight: bold !important;
          font-size: 12px !important;
        }
      `;
      
      if (!document.head.querySelector('#flow-failures-styles')) {
        style.id = 'flow-failures-styles';
        document.head.appendChild(style);
      }
    }
  }, [editor, selectedRunDetails, selectedFailure]);

  const columns: IColumn[] = [
    {
      key: 'runId',
      name: 'Run ID',
      fieldName: 'runId',
      minWidth: 100,
      maxWidth: 200,
      isResizable: true,
    },
    {
      key: 'startTime',
      name: 'Start Time',
      fieldName: 'startTime',
      minWidth: 150,
      maxWidth: 200,
      isResizable: true,
      onRender: (item: FlowFailure) => {
        const date = new Date(item.startTime);
        return date.toLocaleString();
      },
    },
    {
      key: 'endTime',
      name: 'End Time',
      fieldName: 'endTime',
      minWidth: 150,
      maxWidth: 200,
      isResizable: true,
      onRender: (item: FlowFailure) => {
        if (!item.endTime) return 'N/A';
        const date = new Date(item.endTime);
        return date.toLocaleString();
      },
    },
    {
      key: 'status',
      name: 'Status',
      fieldName: 'status',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true,
      onRender: (item: FlowFailure) => {
        const isActualFailure = item.status === 'Failed' || item.triggerFailed;
        return (
          <span style={{ 
            color: isActualFailure ? '#d13438' : 'inherit',
            fontWeight: isActualFailure ? 'bold' : 'normal'
          }}>
            {item.status}
          </span>
        );
      },
    },
    {
      key: 'failedActions',
      name: 'Failed Actions',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: FlowFailure) => {
        const count = item.failedActions.length;
        const triggerText = item.triggerFailed ? ' (+ Trigger)' : '';
        return count > 0 ? `${count}${triggerText}` : 'Loading...';
      },
    },
    {
      key: 'clientTrackingId',
      name: 'Tracking ID',
      fieldName: 'clientTrackingId',
      minWidth: 200,
      maxWidth: 300,
      isResizable: true,
    },
  ];

  const commandBarItems = useMemo(
    () =>
      [
        {
          key: 'toggle',
          text: showAllRuns ? 'Show Failed Only' : 'Show All Runs',
          iconProps: {
            iconName: showAllRuns ? 'Filter' : 'ClearFilter',
          },
          onClick: toggleShowAllRuns,
        },
        {
          key: 'debug',
          text: debugMode ? 'Hide Debug' : 'Debug Mode',
          iconProps: {
            iconName: debugMode ? 'Bug' : 'BugSolid',
          },
          onClick: toggleDebugMode,
        },
        {
          key: 'refresh',
          text: 'Refresh',
          iconProps: {
            iconName: 'Refresh',
          },
          onClick: refreshFailures,
        },
      ] as ICommandBarItemProps[],
    [refreshFailures, toggleShowAllRuns, showAllRuns, toggleDebugMode, debugMode]
  );

  const onItemClicked = (item: FlowFailure) => {
    console.log('[FlowFailuresPage] Item clicked:', item);
    selectFailure(item);
    setIsPanelOpen(true);
    console.log('[FlowFailuresPage] Panel opened, isLoadingDetails:', isLoadingDetails);
  };

  const onPanelDismiss = () => {
    setIsPanelOpen(false);
  };

  const copyJsonToClipboard = () => {
    if (editorContent) {
      navigator.clipboard.writeText(editorContent).then(() => {
        addMessage('Flow run JSON copied to clipboard', MessageBarType.success);
      }).catch(err => {
        addMessage('Failed to copy to clipboard', MessageBarType.error);
        console.error('Copy failed:', err);
      });
    }
  };

  return (
    <div className={containerClassName}>
      {isLoading && <LoaderModal />}
      <Messages items={messages} onDismissed={onDismissed} />
      
      <CommandBar items={commandBarItems} />
      
      <div className={listContainerClassName}>
        {failures.length === 0 && !isLoading ? (
          <Stack horizontalAlign="center" verticalAlign="center" styles={{ root: { height: '200px' } }}>
            <Text variant="large">
              {showAllRuns ? 'No flow runs found.' : 'No failed flow runs found.'}
            </Text>
            <Text variant="medium">
              {showAllRuns 
                ? 'This flow has no run history.' 
                : 'This flow hasn\'t had any failures recently. Try "Show All Runs" to see all runs.'}
            </Text>
          </Stack>
        ) : (
          <DetailsList
            items={failures}
            columns={columns}
            layoutMode={DetailsListLayoutMode.justified}
            onItemInvoked={onItemClicked}
            selectionMode={0} // No selection, just click to view
          />
        )}
      </div>

      <Panel
        isOpen={isPanelOpen}
        type={PanelType.large}
        onDismiss={onPanelDismiss}
        headerText={selectedFailure ? `Flow Run Details - ${selectedFailure.runId}` : 'Flow Run Details'}
        isBlocking={false}
      >
        {(() => {
          console.log('[FlowFailuresPage] Panel render - isLoadingDetails:', isLoadingDetails, 'selectedRunDetails:', !!selectedRunDetails, 'editorContent length:', editorContent.length);
          return null;
        })()}
        {isLoadingDetails ? (
          <Stack horizontalAlign="center" verticalAlign="center" styles={{ root: { height: '200px' } }}>
            <Spinner size={SpinnerSize.large} />
            <Text>Loading run details...</Text>
          </Stack>
        ) : selectedRunDetails ? (
          <div className={editorContainerClassName}>
            <Stack tokens={{ childrenGap: 10 }} styles={{ root: { padding: '10px 0' } }}>
              <Stack horizontal tokens={{ childrenGap: 20 }} verticalAlign="center">
                <Stack.Item grow>
                  <Text variant="medium">
                    <strong>Failed Actions:</strong> {selectedFailure?.failedActions.length || 0}
                    {selectedFailure?.triggerFailed ? ' (+ Trigger Failed)' : ''}
                  </Text>
                </Stack.Item>
                <Stack.Item>
                  <PrimaryButton 
                    text="Copy JSON" 
                    onClick={copyJsonToClipboard}
                    iconProps={{ iconName: 'Copy' }}
                  />
                </Stack.Item>
              </Stack>
              <Text variant="small">
                {debugMode 
                  ? 'Debug Mode: Showing raw API response. Check browser console for detailed logs.'
                  : 'Failed actions are highlighted in light red. JSON includes summary, failed actions grouped separately, and all action details.'}
              </Text>
              {debugMode && (
                <Text variant="small" style={{ color: '#d13438', fontWeight: 'bold' }}>
                  If actions are empty but run failed, check console for alternative endpoint attempts.
                </Text>
              )}
            </Stack>
            <div style={{ height: '600px', border: '1px solid #ccc' }}>
              <Editor
                value={editorContent}
                language="json"
                onMount={(editor) => {
                  console.log('[FlowFailuresPage] Monaco editor mounted:', !!editor);
                  setEditor(editor);
                }}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  wordWrap: 'on',
                  automaticLayout: true,
                  folding: true,
                  lineNumbers: 'on',
                  scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible',
                    verticalScrollbarSize: 17,
                    horizontalScrollbarSize: 17,
                    useShadows: false,
                    verticalHasArrows: true,
                    horizontalHasArrows: true,
                  },
                  mouseWheelScrollSensitivity: 1,
                  fastScrollSensitivity: 5,
                  selectOnLineNumbers: false,
                  selectionHighlight: false,
                  occurrencesHighlight: false,
                  renderLineHighlight: 'none',
                  contextmenu: false,
                  links: false,
                  find: {
                    addExtraSpaceOnTop: false,
                    autoFindInSelection: 'never',
                    seedSearchStringFromSelection: 'never',
                  },
                  quickSuggestions: false,
                  parameterHints: { enabled: false },
                  suggestOnTriggerCharacters: false,
                  acceptSuggestionOnEnter: 'off',
                  tabCompletion: 'off',
                  wordBasedSuggestions: false,
                  hover: { enabled: true },
                  dragAndDrop: false,
                }}
              />
            </div>
          </div>
        ) : (
          <Text>No run details available.</Text>
        )}
      </Panel>
    </div>
  );
}; 