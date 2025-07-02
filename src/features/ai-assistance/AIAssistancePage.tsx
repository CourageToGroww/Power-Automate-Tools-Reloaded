import React, { useState, useEffect, useContext } from 'react';
import {
  Stack,
  Text,
  TextField,
  PrimaryButton,
  DefaultButton,
  MessageBar,
  MessageBarType,
  Pivot,
  PivotItem,
  Spinner,
  SpinnerSize,
  Panel,
  PanelType,
  Separator
} from '@fluentui/react';
import { ApiProviderContext } from '../../common/providers/ApiProvider';
import { ChatInterface } from './components/ChatInterface';
import { FlowPreview } from './components/FlowPreview';
import { useAIAssistance } from './useAIAssistance';
import { AIProvider } from './types';

export const AIAssistancePage: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: MessageBarType; text: string } | null>(null);
  
  const apiProvider = useContext(ApiProviderContext);
  const { 
    sendMessage, 
    messages, 
    isLoading, 
    error, 
    flowDefinition,
    updateFlow,
    clearMessages
  } = useAIAssistance(selectedProvider, apiKey);

  useEffect(() => {
    // Check if API key is already stored
    const storedKey = localStorage.getItem(`ai-${selectedProvider}-key`);
    const storedProvider = localStorage.getItem('ai-provider');
    
    if (storedKey && storedProvider) {
      setApiKey(storedKey);
      setSelectedProvider(storedProvider as AIProvider);
      setIsConfigured(true);
    }
  }, []);

  const handleSaveConfig = () => {
    if (!apiKey.trim()) {
      setConfigMessage({ type: MessageBarType.error, text: 'Please enter an API key' });
      return;
    }

    try {
      localStorage.setItem(`ai-${selectedProvider}-key`, apiKey);
      localStorage.setItem('ai-provider', selectedProvider);
      setIsConfigured(true);
      setShowConfig(false);
      setConfigMessage({ type: MessageBarType.success, text: 'AI configuration saved successfully!' });
      clearMessages();
    } catch (error) {
      setConfigMessage({ type: MessageBarType.error, text: 'Failed to save configuration' });
    }
  };

  const handleClearConfig = () => {
    localStorage.removeItem(`ai-${selectedProvider}-key`);
    localStorage.removeItem('ai-provider');
    setApiKey('');
    setIsConfigured(false);
    setConfigMessage({ type: MessageBarType.info, text: 'AI configuration cleared' });
    clearMessages();
  };

  const handleProviderChange = (item?: PivotItem) => {
    const newProvider = item?.props.itemKey as AIProvider;
    if (newProvider) {
      setSelectedProvider(newProvider);
      const storedKey = localStorage.getItem(`ai-${newProvider}-key`);
      setApiKey(storedKey || '');
      setIsConfigured(!!storedKey);
      clearMessages();
    }
  };

  const handleApplyFlowChanges = async () => {
    if (!flowDefinition) return;
    
    try {
      await updateFlow(flowDefinition);
      setConfigMessage({ type: MessageBarType.success, text: 'Flow updated successfully!' });
    } catch (error) {
      setConfigMessage({ type: MessageBarType.error, text: 'Failed to update flow' });
    }
  };

  // Check if the current flow definition is the original (unchanged) flow
  const isOriginalFlow = (flow: any) => {
    // This is a simple check - in a real implementation you might want to compare
    // against a stored original flow definition
    return flow && !flow.isModified;
  };

  if (!apiProvider.isApiReady) {
    return (
      <Stack
        horizontalAlign="center"
        verticalAlign="center"
        styles={{ root: { flex: 1, padding: 20 } }}
      >
        <Spinner size={SpinnerSize.large} />
        <Text>Connecting to Power Automate...</Text>
      </Stack>
    );
  }

  return (
    <Stack styles={{ root: { height: '100%', padding: 20 } }} tokens={{ childrenGap: 16 }}>
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
        <Stack>
          <Text variant="xLarge" styles={{ root: { fontWeight: 'bold' } }}>
            AI Flow Assistant
          </Text>
          <Text variant="medium" styles={{ root: { color: '#666' } }}>
            Use AI to help modify and improve your Power Automate flows
          </Text>
        </Stack>
        
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <DefaultButton
            text="Configure AI"
            iconProps={{ iconName: 'Settings' }}
            onClick={() => setShowConfig(true)}
          />
          {isConfigured && (
            <DefaultButton
              text="Clear Config"
              iconProps={{ iconName: 'Clear' }}
              onClick={handleClearConfig}
            />
          )}
        </Stack>
      </Stack>

      {configMessage && (
        <MessageBar
          messageBarType={configMessage.type}
          onDismiss={() => setConfigMessage(null)}
        >
          {configMessage.text}
        </MessageBar>
      )}

      {!isConfigured ? (
        <Stack
          horizontalAlign="center"
          verticalAlign="center"
          styles={{ root: { flex: 1 } }}
          tokens={{ childrenGap: 16 }}
        >
          <Text variant="large">Configure AI Provider</Text>
          <Text>To get started, please configure your AI provider and API key.</Text>
          <PrimaryButton
            text="Configure AI"
            iconProps={{ iconName: 'Settings' }}
            onClick={() => setShowConfig(true)}
          />
        </Stack>
      ) : (
        <Stack styles={{ root: { flex: 1 } }} horizontal tokens={{ childrenGap: 16 }}>
          <Stack styles={{ root: { flex: 1, minHeight: 0 } }}>
            <ChatInterface
              provider={selectedProvider}
              messages={messages}
              onSendMessage={sendMessage}
              isLoading={isLoading}
              error={error}
            />
          </Stack>
          
          <Stack styles={{ root: { width: '40%', minHeight: 0 } }}>
            <FlowPreview
              flowDefinition={flowDefinition}
              onApplyChanges={handleApplyFlowChanges}
              hasChanges={!!flowDefinition && !isOriginalFlow(flowDefinition)}
              isOriginalFlow={isOriginalFlow(flowDefinition)}
            />
          </Stack>
        </Stack>
      )}

      <Panel
        headerText="AI Configuration"
        isOpen={showConfig}
        onDismiss={() => setShowConfig(false)}
        type={PanelType.medium}
        closeButtonAriaLabel="Close"
      >
        <Stack tokens={{ childrenGap: 16 }}>
          <Text variant="medium">
            Choose your AI provider and enter your API key to enable AI assistance.
          </Text>
          
          <Separator />
          
          <Stack tokens={{ childrenGap: 12 }}>
            <Text variant="mediumPlus" styles={{ root: { fontWeight: 'bold' } }}>
              AI Provider
            </Text>
            
            <Pivot
              selectedKey={selectedProvider}
              onLinkClick={handleProviderChange}
              headersOnly={true}
            >
              <PivotItem headerText="OpenAI GPT-4" itemKey="openai" />
              <PivotItem headerText="Anthropic Claude" itemKey="claude" />
            </Pivot>
          </Stack>

          <Stack tokens={{ childrenGap: 12 }}>
            <Text variant="mediumPlus" styles={{ root: { fontWeight: 'bold' } }}>
              API Key
            </Text>
            
            <TextField
              type="password"
              value={apiKey}
              onChange={(_, newValue) => setApiKey(newValue || '')}
              placeholder={
                selectedProvider === 'openai' 
                  ? 'Enter your OpenAI API key (sk-...)'
                  : 'Enter your Anthropic API key'
              }
              description={
                selectedProvider === 'openai'
                  ? 'Get your API key from https://platform.openai.com/api-keys'
                  : 'Get your API key from https://console.anthropic.com/'
              }
            />
          </Stack>

          <Separator />

          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <PrimaryButton
              text="Save Configuration"
              onClick={handleSaveConfig}
              disabled={!apiKey.trim()}
            />
            <DefaultButton
              text="Cancel"
              onClick={() => setShowConfig(false)}
            />
          </Stack>
        </Stack>
      </Panel>
    </Stack>
  );
}; 