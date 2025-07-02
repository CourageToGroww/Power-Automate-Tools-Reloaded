import { useState, useContext, useCallback, useEffect } from 'react';
import { ApiProviderContext } from '../../common/providers/ApiProvider';
import { AIProvider, ChatMessage, FlowDefinition, AIAssistanceState } from './types';
import { aiService } from './services/aiService';

interface UseAIAssistanceResult extends AIAssistanceState {
  sendMessage: (message: string) => Promise<void>;
  updateFlow: (flowDefinition: FlowDefinition) => Promise<void>;
  clearMessages: () => void;
}

export const useAIAssistance = (provider: AIProvider, apiKey: string): UseAIAssistanceResult => {
  const [state, setState] = useState<AIAssistanceState>({
    messages: [],
    isLoading: false,
    error: null,
    flowDefinition: null
  });

  const apiProvider = useContext(ApiProviderContext);

  const getCurrentFlow = useCallback(async () => {
    if (!apiProvider.isApiReady) return null;
    
    try {
      // Get current flow definition from Power Automate
      const urlParams = new URLSearchParams(window.location.search);
      const flowId = urlParams.get('flowId');
      const envId = urlParams.get('envId');
      if (!flowId || !envId) return null;
      
      // Use the correct Power Automate API path with provider
      const response = await apiProvider.get(`providers/Microsoft.ProcessSimple/environments/${envId}/flows/${flowId}`);
      return response.properties?.definition;
    } catch (error) {
      console.error('Failed to get current flow:', error);
      return null;
    }
  }, [apiProvider]);

  const sendMessage = useCallback(async (message: string) => {
    if (!apiKey || !message.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null
    }));

    try {
      // Get current flow context
      const currentFlow = await getCurrentFlow();
      
      // Send message to AI service
      const response = await aiService.sendMessage(
        provider,
        apiKey,
        [...state.messages, userMessage],
        currentFlow
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
        flowDefinition: response.flowDefinition ? {
          ...response.flowDefinition,
          isModified: true // Mark as modified by AI
        } : prev.flowDefinition
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      }));
    }
  }, [provider, apiKey, state.messages, getCurrentFlow]);

  const updateFlow = useCallback(async (flowDefinition: FlowDefinition) => {
    if (!apiProvider.isApiReady) {
      throw new Error('API provider not ready');
    }

    try {
      // Update the flow definition in Power Automate
      const urlParams = new URLSearchParams(window.location.search);
      const flowId = urlParams.get('flowId');
      const envId = urlParams.get('envId');
      if (!flowId || !envId) {
        throw new Error('Flow ID or Environment ID not found in URL parameters');
      }
      
      await apiProvider.patch(`providers/Microsoft.ProcessSimple/environments/${envId}/flows/${flowId}`, {
        properties: {
          definition: flowDefinition.definition
        }
      });

      setState(prev => ({
        ...prev,
        flowDefinition: null // Clear after successful update
      }));

    } catch (error) {
      throw new Error('Failed to update flow: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [apiProvider]);

  const clearMessages = useCallback(() => {
    setState({
      messages: [],
      isLoading: false,
      error: null,
      flowDefinition: null
    });
  }, []);

  // Load current flow on mount
  useEffect(() => {
    const loadCurrentFlow = async () => {
      if (apiProvider.isApiReady) {
        const currentFlow = await getCurrentFlow();
        if (currentFlow) {
          setState(prev => ({
            ...prev,
            flowDefinition: { 
              definition: currentFlow,
              isModified: false // Mark as original flow
            }
          }));
        }
      }
    };
    
    loadCurrentFlow();
  }, [apiProvider.isApiReady, getCurrentFlow]);

  return {
    ...state,
    sendMessage,
    updateFlow,
    clearMessages
  };
}; 