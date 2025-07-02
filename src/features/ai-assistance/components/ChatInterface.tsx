import React, { useState, useRef, useEffect } from 'react';
import {
  Stack,
  Text,
  TextField,
  PrimaryButton,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize
} from '@fluentui/react';
import { ChatMessage, AIProvider } from '../types';

interface ChatInterfaceProps {
  provider: AIProvider;
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  provider,
  messages,
  onSendMessage,
  isLoading,
  error
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const message = inputMessage.trim();
    setInputMessage('');
    
    try {
      await onSendMessage(message);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const getProviderName = () => {
    return provider === 'openai' ? 'GPT-4' : 'Claude';
  };

  return (
    <Stack styles={{ root: { height: '100%', border: '1px solid #e1e1e1', borderRadius: '4px' } }}>
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
          Chat with {getProviderName()}
        </Text>
        <Text variant="small" styles={{ root: { color: '#666' } }}>
          Describe what you want to change in your flow
        </Text>
      </Stack>

      {error && (
        <MessageBar messageBarType={MessageBarType.error}>
          {error}
        </MessageBar>
      )}

      <Stack
        styles={{
          root: {
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            minHeight: 0
          }
        }}
        tokens={{ childrenGap: 12 }}
      >
        {messages.length === 0 ? (
          <Stack
            horizontalAlign="center"
            verticalAlign="center"
            styles={{ root: { flex: 1, color: '#666' } }}
            tokens={{ childrenGap: 8 }}
          >
            <Text variant="medium">Start a conversation with AI</Text>
            <Text variant="small">
              Try saying: "Add a condition to check if the email subject contains 'urgent'"
            </Text>
          </Stack>
        ) : (
          messages.map((message) => (
            <Stack
              key={message.id}
              styles={{
                root: {
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: message.role === 'user' ? '#e3f2fd' : '#f5f5f5',
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }
              }}
            >
              <Text
                variant="small"
                styles={{
                  root: {
                    fontWeight: 'bold',
                    color: message.role === 'user' ? '#1976d2' : '#666',
                    marginBottom: '4px'
                  }
                }}
              >
                {message.role === 'user' ? 'You' : getProviderName()}
              </Text>
              <Text
                variant="small"
                styles={{
                  root: {
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.4'
                  }
                }}
              >
                {message.content}
              </Text>
              <Text
                variant="tiny"
                styles={{
                  root: {
                    color: '#999',
                    marginTop: '4px'
                  }
                }}
              >
                {message.timestamp.toLocaleTimeString()}
              </Text>
            </Stack>
          ))
        )}
        
        {isLoading && (
          <Stack
            horizontal
            verticalAlign="center"
            styles={{
              root: {
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#f5f5f5',
                alignSelf: 'flex-start',
                maxWidth: '80%'
              }
            }}
            tokens={{ childrenGap: 8 }}
          >
            <Spinner size={SpinnerSize.small} />
            <Text variant="small" styles={{ root: { color: '#666' } }}>
              {getProviderName()} is thinking...
            </Text>
          </Stack>
        )}
        
        <div ref={messagesEndRef} />
      </Stack>

      <Stack
        styles={{
          root: {
            padding: '16px',
            borderTop: '1px solid #e1e1e1'
          }
        }}
        horizontal
        tokens={{ childrenGap: 8 }}
      >
        <TextField
          styles={{ root: { flex: 1 } }}
          value={inputMessage}
          onChange={(_, newValue) => setInputMessage(newValue || '')}
          onKeyPress={handleKeyPress}
          placeholder="Describe what you want to change in your flow..."
          multiline
          rows={2}
          disabled={isLoading}
        />
        <PrimaryButton
          text="Send"
          iconProps={{ iconName: 'Send' }}
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || isLoading}
          styles={{ root: { alignSelf: 'flex-end' } }}
        />
      </Stack>
    </Stack>
  );
}; 