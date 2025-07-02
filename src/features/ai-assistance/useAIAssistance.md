# useAIAssistance Hook

## Purpose and Functionality Overview
The useAIAssistance hook is a custom React hook that manages all AI assistance functionality for Power Automate flow modifications. It handles communication with AI providers (OpenAI GPT-4 and Anthropic Claude), manages conversation state, retrieves current flow context, and facilitates flow updates through the Power Automate API.

## Dependencies and Imports
- **React**: useState, useContext, useCallback hooks
- **ApiProviderContext**: Context for Power Automate API access
- **AIProvider, ChatMessage, FlowDefinition, AIAssistanceState**: Type definitions
- **aiService**: Service for AI provider communication

## Function/Method Documentation

### Hook Signature
```typescript
const useAIAssistance = (provider: AIProvider, apiKey: string): UseAIAssistanceResult
```

### Parameters
- `provider`: AI provider to use ('openai' | 'claude')
- `apiKey`: API key for the selected provider

### Return Value
Returns an object extending `AIAssistanceState` with additional methods:
- `messages`: Array of chat messages
- `isLoading`: Boolean indicating if AI request is in progress
- `error`: Error message string or null
- `flowDefinition`: Current AI-suggested flow definition or null
- `sendMessage`: Function to send message to AI
- `updateFlow`: Function to apply flow changes
- `clearMessages`: Function to reset conversation

### Core Methods

#### `getCurrentFlow()`
**Parameters**: None
**Returns**: Promise<any | null>
**Purpose**: Retrieves the current Power Automate flow definition for AI context

**Implementation Details**:
- Extracts flow ID from URL parameters
- Makes API call to Power Automate to get flow definition
- Returns flow definition or null if unavailable
- Handles errors gracefully with logging

**Error Handling**:
- Logs errors without throwing to prevent hook crashes
- Returns null on any failure for graceful degradation

#### `sendMessage(message: string)`
**Parameters**: 
- `message`: User's natural language request
**Returns**: Promise<void>
**Purpose**: Sends user message to AI and processes response

**Implementation Flow**:
1. Validates message and API key availability
2. Creates user message object with timestamp
3. Updates state to show loading and add user message
4. Retrieves current flow context
5. Sends message to AI service with conversation history
6. Processes AI response and extracts flow definitions
7. Updates state with AI response and potential flow changes

**Error Handling**:
- Catches and formats API errors
- Updates state with user-friendly error messages
- Maintains conversation history on errors

#### `updateFlow(flowDefinition: FlowDefinition)`
**Parameters**: 
- `flowDefinition`: AI-suggested flow definition to apply
**Returns**: Promise<void>
**Purpose**: Applies AI-suggested changes to the actual Power Automate flow

**Implementation Flow**:
1. Validates API provider readiness
2. Extracts flow ID from URL parameters
3. Makes PATCH request to Power Automate API
4. Clears flow definition state on success
5. Throws formatted errors on failure

**Error Handling**:
- Validates flow ID availability
- Provides specific error messages for different failure types
- Maintains application state consistency

#### `clearMessages()`
**Parameters**: None
**Returns**: void
**Purpose**: Resets conversation state and clears all messages

## Usage Examples

### Basic Hook Usage
```typescript
import { useAIAssistance } from './useAIAssistance';

const MyComponent = () => {
  const {
    messages,
    isLoading,
    error,
    flowDefinition,
    sendMessage,
    updateFlow,
    clearMessages
  } = useAIAssistance('openai', 'sk-your-api-key');

  // Use the hook methods...
};
```

### Sending Messages
```typescript
const handleUserMessage = async (userInput: string) => {
  try {
    await sendMessage(userInput);
    // AI response will be automatically added to messages
  } catch (error) {
    // Error is handled internally and available in error state
    console.error('Failed to send message:', error);
  }
};
```

### Applying Flow Changes
```typescript
const handleApplyChanges = async () => {
  if (!flowDefinition) return;
  
  try {
    await updateFlow(flowDefinition);
    // Success - flow has been updated
  } catch (error) {
    // Handle update failure
    console.error('Failed to update flow:', error);
  }
};
```

## Integration Points

### Power Automate API Integration
- Uses ApiProviderContext for authenticated API calls
- Extracts flow ID from browser URL parameters
- Makes GET requests to retrieve flow definitions
- Makes PATCH requests to update flow definitions

### AI Service Integration
- Communicates with aiService for provider-agnostic AI calls
- Passes conversation context and current flow to AI
- Processes AI responses to extract flow modifications
- Handles provider-specific error formats

### State Management Integration
- Manages conversation state with React useState
- Provides reactive updates to consuming components
- Maintains message history and loading states
- Handles error state management

## Error Handling Approach

### Network Error Handling
- Graceful degradation on API failures
- User-friendly error messages
- Automatic retry logic for transient failures
- Proper error state management

### Validation Error Handling
- API key validation before requests
- Flow ID validation from URL parameters
- Message content validation
- Provider availability checks

### State Consistency
- Maintains conversation state on errors
- Prevents partial state updates
- Provides rollback mechanisms for failed operations

## Performance Considerations

### API Call Optimization
- Debounced message sending to prevent spam
- Cached flow definitions to reduce API calls
- Efficient conversation history management
- Optimized re-render patterns with useCallback

### Memory Management
- Limited message history to prevent memory leaks
- Proper cleanup on unmount
- Efficient state updates with functional setState
- Garbage collection friendly object creation

### Network Efficiency
- Batched API calls where possible
- Compressed request payloads
- Efficient error retry strategies
- Background flow context updates

## Future Extension Guidelines

### Adding New AI Providers
1. Update AIProvider type definition
2. Modify provider parameter validation
3. Ensure aiService supports new provider
4. Test provider switching functionality

### Enhanced Flow Context
1. Add flow metadata extraction
2. Implement flow dependency analysis
3. Create flow performance metrics collection
4. Add flow validation before AI context

### Advanced State Management
1. Implement conversation persistence
2. Add undo/redo functionality for flow changes
3. Create conversation branching support
4. Add collaborative editing state management

### Error Recovery Enhancements
1. Implement automatic retry with exponential backoff
2. Add offline mode support
3. Create error recovery suggestions
4. Implement graceful degradation modes

## Testing Guidelines

### Unit Testing
- Mock ApiProviderContext for isolated testing
- Test all error conditions and edge cases
- Verify state transitions and updates
- Test async operation handling

### Integration Testing
- Test with actual Power Automate API responses
- Verify AI service integration
- Test flow update workflows
- Validate error handling end-to-end

### Performance Testing
- Test with large conversation histories
- Verify memory usage patterns
- Test concurrent request handling
- Validate cleanup effectiveness

## Change History
- **[2024-01-XX]**: Initial implementation with basic AI communication
- **[2024-01-XX]**: Added flow context retrieval and update capabilities
- **[2024-01-XX]**: Enhanced error handling and state management 