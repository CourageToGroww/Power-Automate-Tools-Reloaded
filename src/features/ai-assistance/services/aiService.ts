import { AIProvider, ChatMessage, FlowDefinition, AIResponse, OpenAIMessage, ClaudeMessage } from '../types';

class AIService {
  private readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  private readonly CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

  async sendMessage(
    provider: AIProvider,
    apiKey: string,
    messages: ChatMessage[],
    currentFlow?: any
  ): Promise<AIResponse> {
    if (provider === 'openai') {
      return this.sendOpenAIMessage(apiKey, messages, currentFlow);
    } else {
      return this.sendClaudeMessage(apiKey, messages, currentFlow);
    }
  }

  private async sendOpenAIMessage(
    apiKey: string,
    messages: ChatMessage[],
    currentFlow?: any
  ): Promise<AIResponse> {
    const systemPrompt = this.getSystemPrompt(currentFlow);
    
    const openAIMessages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ];

    // Use background script proxy to avoid CORS issues
    const data = await new Promise<any>((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'ai-api-call',
        url: this.OPENAI_API_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: openAIMessages,
          temperature: 0.7,
          max_tokens: 2000
        })
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (!response) {
          reject(new Error('No response received from background script'));
          return;
        }
        
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Unknown API error'));
        }
      });
    });
    const content = data.choices[0]?.message?.content || '';

    return this.parseAIResponse(content);
  }

  private async sendClaudeMessage(
    apiKey: string,
    messages: ChatMessage[],
    currentFlow?: any
  ): Promise<AIResponse> {
    const systemPrompt = this.getSystemPrompt(currentFlow);
    
    const claudeMessages: ClaudeMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      // Use background script proxy to avoid CORS issues
      const data = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'ai-api-call',
          url: this.CLAUDE_API_URL,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 64000,
            system: systemPrompt,
            messages: claudeMessages
          })
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (!response) {
            reject(new Error('No response received from background script'));
            return;
          }
          
          if (response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response.error || 'Unknown API error'));
          }
        });
      });

      const content = data.content?.[0]?.text || '';
      return this.parseAIResponse(content);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Network error')) {
        throw new Error('Network error: Unable to connect to Claude API. Please check your internet connection and API key.');
      }
      throw error;
    }
  }

  private getSystemPrompt(currentFlow?: any): string {
    const flowContext = currentFlow ? `

Current Flow Definition:
\`\`\`json
${JSON.stringify(currentFlow, null, 2)}
\`\`\`
` : '';

    return `You are an AI assistant specialized in Microsoft Power Automate flows. Your role is to help users modify and improve their flows based on their requests.

When a user asks for changes to their flow, you should:
1. Understand their request clearly
2. Provide a helpful explanation of what you're going to do
3. If the request involves modifying the flow definition, provide the updated JSON

Guidelines:
- Always explain your changes clearly
- Maintain the existing flow structure when possible
- Use proper Power Automate action types and syntax
- Be helpful and educational in your responses
- If you're providing a modified flow definition, wrap it in <FLOW_DEFINITION> tags

Example response format:
I'll help you add a condition to your flow. Here's what I'm going to do:

[Explanation of changes]

<FLOW_DEFINITION>
{
  "definition": {
    // Updated flow definition here
  }
}
</FLOW_DEFINITION>
${flowContext}

Please help the user with their Power Automate flow requests.`;
  }

  private parseAIResponse(content: string): AIResponse {
    // Extract flow definition if present
    const flowDefMatch = content.match(/<FLOW_DEFINITION>([\s\S]*?)<\/FLOW_DEFINITION>/);
    let flowDefinition: FlowDefinition | undefined;

    if (flowDefMatch) {
      try {
        flowDefinition = JSON.parse(flowDefMatch[1].trim());
      } catch (error) {
        console.error('Failed to parse flow definition:', error);
      }
    }

    // Remove flow definition tags from message
    const message = content.replace(/<FLOW_DEFINITION>[\s\S]*?<\/FLOW_DEFINITION>/g, '').trim();

    return {
      message,
      flowDefinition
    };
  }
}

export const aiService = new AIService(); 