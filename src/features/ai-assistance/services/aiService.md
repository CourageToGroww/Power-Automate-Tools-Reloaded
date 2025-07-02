# AI Service

## Purpose and Functionality Overview
The AI Service provides a unified interface for communicating with multiple AI providers (OpenAI GPT-4 and Anthropic Claude) in the context of Power Automate flow assistance. It handles API authentication, request formatting, response parsing, and flow definition extraction from AI responses.

## Dependencies and Imports
- **AIProvider, ChatMessage, FlowDefinition, AIResponse, OpenAIMessage, ClaudeMessage**: Type definitions for AI communication
- **Chrome Runtime API**: For background script communication to bypass CORS restrictions
- **Background Script Proxy**: Handles external API calls to avoid browser security limitations

## Class Structure

### AIService Class
The main service class that handles all AI provider communications.

#### Private Properties
- `OPENAI_API_URL`: OpenAI Chat Completions API endpoint
- `CLAUDE_API_URL`: Anthropic Messages API endpoint

## Method Documentation

### `sendMessage(provider, apiKey, messages, currentFlow?)`
**Parameters**:
- `provider`: AI provider to use ('openai' | 'claude')
- `apiKey`: API key for authentication
- `messages`: Array of conversation messages
- `currentFlow`: Optional current flow definition for context

**Returns**: Promise<AIResponse>
**Purpose**: Routes message to appropriate AI provider and returns unified response

### `sendOpenAIMessage(apiKey, messages, currentFlow?)`
**Parameters**:
- `apiKey`: OpenAI API key
- `messages`: Conversation history
- `currentFlow`: Optional flow context

**Returns**: Promise<AIResponse>
**Purpose**: Handles OpenAI GPT-4 API communication

**Implementation Details**:
- Constructs system prompt with flow context
- Formats messages for OpenAI API format
- Uses GPT-4 model with optimized parameters
- Handles API errors and rate limiting
- Parses response for flow definitions

### `sendClaudeMessage(apiKey, messages, currentFlow?)`
**Parameters**:
- `apiKey`: Anthropic API key
- `messages`: Conversation history
- `currentFlow`: Optional flow context

**Returns**: Promise<AIResponse>
**Purpose**: Handles Anthropic Claude API communication

**Implementation Details**:
- Uses Claude 3 Sonnet model
- Formats system prompt separately from messages
- Handles Anthropic-specific API format
- Processes response content array
- Extracts flow definitions from responses

### `getSystemPrompt(currentFlow?)`
**Parameters**:
- `currentFlow`: Optional current flow definition

**Returns**: string
**Purpose**: Generates system prompt for AI context

**Prompt Structure**:
- Defines AI role as Power Automate specialist
- Provides guidelines for response format
- Includes current flow context when available
- Specifies flow definition markup format

### `parseAIResponse(content)`
**Parameters**:
- `content`: Raw AI response content

**Returns**: AIResponse
**Purpose**: Extracts flow definitions and messages from AI responses

**Parsing Logic**:
- Uses regex to find `<FLOW_DEFINITION>` tags
- Attempts JSON parsing of flow definitions
- Removes markup tags from message content
- Handles parsing errors gracefully

## Usage Examples

### Basic Service Usage
```typescript
import { aiService } from './services/aiService';

const response = await aiService.sendMessage(
  'openai',
  'sk-your-api-key',
  conversationMessages,
  currentFlowDefinition
);
```

### Response Handling
```typescript
const { message, flowDefinition } = await aiService.sendMessage(
  'claude',
  'your-claude-key',
  messages
);

if (flowDefinition) {
  // AI provided a modified flow definition
  await applyFlowChanges(flowDefinition);
}
```

## Background Script Proxy

### CORS Resolution
Chrome extensions cannot directly call external APIs due to CORS (Cross-Origin Resource Sharing) restrictions. To solve this, the AI Service uses a background script proxy pattern:

1. **Message Passing**: Content script sends API request details to background script
2. **Background Execution**: Background script performs the actual fetch request
3. **Response Relay**: Background script returns response data to content script

### Proxy Implementation
```typescript
// Content script (AI Service)
const data = await new Promise((resolve, reject) => {
  chrome.runtime.sendMessage({
    type: 'ai-api-call',
    url: apiUrl,
    method: 'POST',
    headers: requestHeaders,
    body: requestBody
  }, (response) => {
    if (response.success) {
      resolve(response.data);
    } else {
      reject(new Error(response.error));
    }
  });
});
```

### Security Benefits
- API keys never leave the extension context
- Requests are made from background script with proper permissions
- No exposure to external JavaScript contexts
- Maintains Chrome extension security model

## API Integration Details

### OpenAI Integration
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Model**: GPT-4
- **Authentication**: Bearer token
- **Parameters**: Temperature 0.7, Max tokens 2000
- **Error Handling**: Comprehensive error message extraction
- **CORS Handling**: Uses background script proxy to avoid browser CORS restrictions

### Claude Integration
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **Model**: Claude Sonnet 4 (claude-sonnet-4-20250514) - Latest available model
- **Authentication**: x-api-key header with anthropic-dangerous-direct-browser-access header
- **Version**: 2023-06-01 API version
- **Parameters**: Max tokens 64000, system prompt separation
- **CORS Headers**: Requires 'anthropic-dangerous-direct-browser-access': 'true' for browser requests
- **CORS Handling**: Uses background script proxy to avoid browser CORS restrictions

## Error Handling Approach

### API Error Handling
- Extracts meaningful error messages from API responses
- Handles authentication failures
- Manages rate limiting scenarios
- Provides fallback error messages

### Network Error Handling
- Handles fetch failures gracefully
- Provides user-friendly error messages
- Maintains service availability during outages

### Parsing Error Handling
- Graceful handling of malformed JSON
- Logging of parsing failures
- Fallback to message-only responses

## Performance Considerations

### Request Optimization
- Efficient message formatting
- Minimal payload size
- Optimized token usage
- Streaming support preparation

### Response Processing
- Efficient regex parsing
- Minimal memory allocation
- Fast JSON parsing
- Error recovery mechanisms

## Security Considerations

### API Key Management
- No local storage of API keys
- Secure transmission to AI providers
- No logging of sensitive data
- Proper error message sanitization

### Data Privacy
- No persistent storage of conversations
- Minimal data transmission
- User consent through configuration
- Secure API communication

## Future Extension Guidelines

### Adding New AI Providers
1. Add provider-specific API constants
2. Implement provider-specific message formatting
3. Add provider-specific error handling
4. Update routing logic in sendMessage method

### Enhanced Flow Processing
1. Add flow validation before AI context
2. Implement flow diff generation
3. Create flow optimization suggestions
4. Add flow security analysis

### Performance Improvements
1. Implement request caching
2. Add response streaming support
3. Create batch processing capabilities
4. Add request queuing and rate limiting

## Testing Guidelines

### Unit Testing
- Mock fetch API for isolated testing
- Test all error conditions
- Verify message formatting
- Test response parsing logic

### Integration Testing
- Test with actual AI provider APIs
- Verify error handling end-to-end
- Test with various flow definitions
- Validate response format consistency

### Performance Testing
- Test with large conversation histories
- Verify memory usage patterns
- Test concurrent request handling
- Validate response time requirements

## Change History
- **[2024-01-XX]**: Initial implementation with OpenAI and Claude support
- **[2024-01-XX]**: Added flow definition parsing and extraction
- **[2024-01-XX]**: Enhanced error handling and API integration 