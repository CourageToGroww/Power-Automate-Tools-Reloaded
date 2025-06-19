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
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useMemo, useState, useEffect } from 'react';
import { LoaderModal } from '../../common/components/LoaderModal';
import { Messages } from '../../common/components/Messages';
import { FlowFailure } from './types';
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
    selectFailure,
    refreshFailures,
    messages,
    onDismissed,
  } = useFlowFailures();

  // Prepare the JSON content for the editor with failed actions highlighted
  const editorContent = useMemo(() => {
    if (!selectedRunDetails) return '';

    const runData = {
      runId: selectedRunDetails.name,
      status: selectedRunDetails.properties.status,
      startTime: selectedRunDetails.properties.startTime,
      endTime: selectedRunDetails.properties.endTime,
      clientTrackingId: selectedRunDetails.properties.correlation.clientTrackingId,
      trigger: selectedRunDetails.properties.trigger,
      actions: selectedRunDetails.properties.actions || {},
    };

    return JSON.stringify(runData, null, 2);
  }, [selectedRunDetails]);

  // Highlight failed actions in the editor
  useEffect(() => {
    if (editor && selectedRunDetails && selectedFailure) {
      const model = editor.getModel();
      if (!model) return;

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];
      const content = model.getValue();
      const lines = content.split('\n');

      // Find and highlight failed actions
      selectedFailure.failedActions.forEach(failedAction => {
        // Find the line range for this action
        const actionStartPattern = new RegExp(`"${failedAction.name}"\\s*:\\s*{`);
        let startLine = -1;
        let endLine = -1;
        let braceCount = 0;
        let foundStart = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          if (!foundStart && actionStartPattern.test(line)) {
            startLine = i + 1; // Monaco uses 1-based line numbers
            foundStart = true;
            braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
            continue;
          }

          if (foundStart) {
            braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
            if (braceCount === 0) {
              endLine = i + 1;
              break;
            }
          }
        }

        if (startLine > 0 && endLine > 0) {
          decorations.push({
            range: new monaco.Range(startLine, 1, endLine, 1),
            options: {
              isWholeLine: true,
              className: 'failed-action-highlight',
              glyphMarginClassName: 'failed-action-glyph',
              hoverMessage: {
                value: `**Failed Action: ${failedAction.name}**\n\nStatus: ${failedAction.status}\nError: ${failedAction.error?.message || 'Unknown error'}`
              }
            }
          });
        }
      });

      // Apply decorations
      editor.deltaDecorations([], decorations);

      // Add custom CSS for highlighting
      const style = document.createElement('style');
      style.textContent = `
        .failed-action-highlight {
          background-color: rgba(255, 0, 0, 0.1) !important;
          border-left: 3px solid #ff0000 !important;
        }
        .failed-action-glyph {
          background-color: #ff0000 !important;
          width: 4px !important;
        }
        .failed-action-glyph::after {
          content: "⚠" !important;
          color: white !important;
          font-weight: bold !important;
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
          key: 'refresh',
          text: 'Refresh',
          iconProps: {
            iconName: 'Refresh',
          },
          onClick: refreshFailures,
        },
      ] as ICommandBarItemProps[],
    [refreshFailures]
  );

  const onItemClicked = (item: FlowFailure) => {
    selectFailure(item);
    setIsPanelOpen(true);
  };

  const onPanelDismiss = () => {
    setIsPanelOpen(false);
  };

  return (
    <div className={containerClassName}>
      {isLoading && <LoaderModal />}
      <Messages items={messages} onDismissed={onDismissed} />
      
      <CommandBar items={commandBarItems} />
      
      <div className={listContainerClassName}>
        {failures.length === 0 && !isLoading ? (
          <Stack horizontalAlign="center" verticalAlign="center" styles={{ root: { height: '200px' } }}>
            <Text variant="large">No failed flow runs found.</Text>
            <Text variant="medium">This flow hasn't had any failures recently.</Text>
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
        {isLoadingDetails ? (
          <Stack horizontalAlign="center" verticalAlign="center" styles={{ root: { height: '200px' } }}>
            <Spinner size={SpinnerSize.large} />
            <Text>Loading run details...</Text>
          </Stack>
        ) : selectedRunDetails ? (
          <div className={editorContainerClassName}>
            <Stack tokens={{ childrenGap: 10 }} styles={{ root: { padding: '10px 0' } }}>
              <Text variant="medium">
                <strong>Failed Actions:</strong> {selectedFailure?.failedActions.length || 0}
                {selectedFailure?.triggerFailed ? ' (+ Trigger Failed)' : ''}
              </Text>
              <Text variant="small">
                Failed actions are highlighted in red with error details on hover.
              </Text>
            </Stack>
            <Editor
              value={editorContent}
              language="json"
              onMount={(editor) => setEditor(editor)}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true,
                folding: true,
                lineNumbers: 'on',
              }}
            />
          </div>
        ) : (
          <Text>No run details available.</Text>
        )}
      </Panel>
    </div>
  );
}; 