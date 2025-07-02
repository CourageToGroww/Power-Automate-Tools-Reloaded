import React, { useState, useContext } from 'react';
import {
  Stack,
  Text,
  PrimaryButton,
  DefaultButton,
  MessageBar,
  MessageBarType,
  Panel,
  PanelType,
  Spinner,
  SpinnerSize
} from '@fluentui/react';
import * as monaco from 'monaco-editor';
import { FlowDefinition } from '../types';
import { ApiProviderContext } from '../../../common/providers/ApiProvider';

interface FlowPreviewProps {
  flowDefinition: FlowDefinition | null;
  onApplyChanges: () => Promise<void>;
  hasChanges: boolean;
  isOriginalFlow?: boolean;
}

export const FlowPreview: React.FC<FlowPreviewProps> = ({
  flowDefinition,
  onApplyChanges,
  hasChanges,
  isOriginalFlow = false
}) => {
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const apiProvider = useContext(ApiProviderContext);

  const handleApplyChanges = async () => {
    setIsApplying(true);
    try {
      await onApplyChanges();
    } finally {
      setIsApplying(false);
    }
  };

  const handleTestFlow = async () => {
    if (!flowDefinition || !apiProvider.isApiReady) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const flowId = urlParams.get('flowId');
      const envId = urlParams.get('envId');
      if (!flowId || !envId) {
        throw new Error('Flow ID or Environment ID not found');
      }

      // Test the flow by triggering it
      const response = await apiProvider.post(`providers/Microsoft.ProcessSimple/environments/${envId}/flows/${flowId}/triggers/manual/run`, {});
      
      setTestResult({
        success: true,
        message: 'Flow test completed successfully!'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Flow test failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveFlow = async () => {
    if (!flowDefinition) return;
    await handleApplyChanges();
  };

  const getChangesSummary = () => {
    if (!flowDefinition) return null;

    // Simple analysis of the flow definition
    const actions = flowDefinition.definition?.actions || {};
    const triggers = flowDefinition.definition?.triggers || {};
    
    const actionCount = Object.keys(actions).length;
    const triggerCount = Object.keys(triggers).length;

    return {
      actionCount,
      triggerCount,
      hasConditions: Object.values(actions).some((action: any) => action.type === 'If'),
      hasLoops: Object.values(actions).some((action: any) => action.type === 'Foreach'),
    };
  };

  const summary = getChangesSummary();

  return (
    <Stack
      styles={{
        root: {
          height: '100%',
          border: '1px solid #e1e1e1',
          borderRadius: '4px'
        }
      }}
    >
      <Stack
        styles={{
          root: {
            padding: '12px 16px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e1e1e1'
          }
        }}
      >
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 'bold' } }}>
          Flow Preview
        </Text>
        <Text variant="small" styles={{ root: { color: '#666' } }}>
          {isOriginalFlow 
            ? 'Current flow definition' 
            : hasChanges 
              ? 'AI-proposed changes' 
              : 'No changes suggested yet'
          }
        </Text>
      </Stack>

      <Stack
        styles={{
          root: {
            flex: 1,
            padding: '16px',
            overflowY: 'auto'
          }
        }}
        tokens={{ childrenGap: 16 }}
      >
        {testResult && (
          <MessageBar 
            messageBarType={testResult.success ? MessageBarType.success : MessageBarType.error}
            onDismiss={() => setTestResult(null)}
          >
            {testResult.message}
          </MessageBar>
        )}

        {!flowDefinition ? (
          <Stack
            horizontalAlign="center"
            verticalAlign="center"
            styles={{ root: { flex: 1, color: '#666' } }}
            tokens={{ childrenGap: 8 }}
          >
            <Text variant="medium">No flow to preview</Text>
            <Text variant="small" styles={{ root: { textAlign: 'center' } }}>
              {isOriginalFlow 
                ? 'Loading current flow...' 
                : 'Chat with AI to get suggestions for improving your flow'
              }
            </Text>
          </Stack>
        ) : (
          <Stack tokens={{ childrenGap: 12 }}>
            {!isOriginalFlow && hasChanges && (
              <MessageBar messageBarType={MessageBarType.info}>
                AI has suggested changes to your flow. Review and apply them below.
              </MessageBar>
            )}

            {summary && (
              <Stack tokens={{ childrenGap: 8 }}>
                <Text variant="medium" styles={{ root: { fontWeight: 'bold' } }}>
                  Flow Summary
                </Text>
                <Stack tokens={{ childrenGap: 4 }}>
                  <Text variant="small">• {summary.triggerCount} trigger(s)</Text>
                  <Text variant="small">• {summary.actionCount} action(s)</Text>
                  {summary.hasConditions && (
                    <Text variant="small">• Contains conditional logic</Text>
                  )}
                  {summary.hasLoops && (
                    <Text variant="small">• Contains loops/iterations</Text>
                  )}
                </Stack>
              </Stack>
            )}

            <Stack tokens={{ childrenGap: 8 }}>
              <DefaultButton
                text="View Full Definition"
                iconProps={{ iconName: 'Code' }}
                onClick={() => setShowFullPreview(true)}
              />
              
              <DefaultButton
                text={isTesting ? 'Testing...' : 'Test Flow'}
                iconProps={{ iconName: isTesting ? undefined : 'Play' }}
                onClick={handleTestFlow}
                disabled={isTesting || !apiProvider.isApiReady}
              >
                {isTesting && <Spinner size={SpinnerSize.xSmall} styles={{ root: { marginRight: 8 } }} />}
              </DefaultButton>
              
              {!isOriginalFlow && hasChanges && (
                <PrimaryButton
                  text="Save Changes"
                  iconProps={{ iconName: 'Save' }}
                  onClick={handleSaveFlow}
                  disabled={isApplying}
                />
              )}
            </Stack>
          </Stack>
        )}
      </Stack>

      <Panel
        headerText="Flow Definition Preview"
        isOpen={showFullPreview}
        onDismiss={() => setShowFullPreview(false)}
        type={PanelType.large}
        closeButtonAriaLabel="Close"
      >
        <Stack tokens={{ childrenGap: 16 }}>
          <Text variant="medium">
            This is the complete flow definition that will be applied to your flow.
          </Text>
          
          <div
            style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e1e1e1',
              borderRadius: '4px',
              overflow: 'hidden',
              height: '60vh'
            }}
          >
            <div
              style={{
                height: '100%',
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: '12px',
                padding: '16px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}
            >
              {JSON.stringify(flowDefinition, null, 2)}
            </div>
          </div>

          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <PrimaryButton
              text="Apply Changes"
              onClick={handleApplyChanges}
              disabled={isApplying}
            />
            <DefaultButton
              text="Close"
              onClick={() => setShowFullPreview(false)}
            />
          </Stack>
        </Stack>
      </Panel>
    </Stack>
  );
}; 