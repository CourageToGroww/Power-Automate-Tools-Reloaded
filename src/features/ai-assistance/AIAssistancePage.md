# AIAssistancePage Component

## Purpose and Functionality Overview
The AIAssistancePage is the main React component for the AI-powered flow assistance feature in the Power Automate Tools Chrome extension. It provides users with the ability to chat with AI (OpenAI GPT-4 or Anthropic Claude) to get help modifying and improving their Power Automate flows through natural language conversations.

## Dependencies and Imports
- **React**: Core React library for component functionality
- **@fluentui/react**: Microsoft Fluent UI components for consistent design
- **ApiProviderContext**: Context for Power Automate API access
- **ChatInterface**: Component for AI conversation interface
- **FlowPreview**: Component for previewing proposed flow changes
- **useAIAssistance**: Custom hook for AI functionality management
- **AIProvider**: Type definition for AI service providers

## Function/Method Documentation

### Component Props
This component takes no props as it's a page-level component.

### State Management
- `selectedProvider`: Currently selected AI provider ('openai' | 'claude')
- `apiKey`: API key for the selected AI provider
- `isConfigured`: Boolean indicating if AI is properly configured
- `showConfig`: Boolean controlling configuration panel visibility
- `configMessage`: Success/error messages for user feedback

### Key Methods

#### `handleSaveConfig()`
**Parameters**: None
**Returns**: void
**Purpose**: Saves AI provider configuration to localStorage and initializes the AI service

#### `handleClearConfig()`
**Parameters**: None
**Returns**: void
**Purpose**: Clears stored AI configuration and resets the interface

#### `handleProviderChange(item?: PivotItem)`
**Parameters**: 
- `item`: Fluent UI PivotItem containing the selected provider
**Returns**: void
**Purpose**: Switches between OpenAI and Claude providers

#### `handleApplyFlowChanges()`
**Parameters**: None
**Returns**: Promise<void>
**Purpose**: Applies AI-suggested flow changes to the actual Power Automate flow

## Usage Examples

### Basic Usage
```tsx
import { AIAssistancePage } from './features/ai-assistance/AIAssistancePage';

// In your router
<Route path="ai-assistance" element={<AIAssistancePage />} />
```

### Configuration Flow
1. User clicks "Configure AI" button
2. Selects AI provider (OpenAI or Claude)
3. Enters API key
4. Saves configuration
5. Can now chat with AI about flow modifications

### Chat Flow
1. User types natural language request: "Add a condition to check if email subject contains 'urgent'"
2. AI analyzes current flow and responds with explanation
3. If applicable, AI provides modified flow definition
4. User can preview changes and apply them to their flow

## Integration Points

### Power Automate API Integration
- Connects to Power Automate through ApiProviderContext
- Retrieves current flow definitions for AI context
- Updates flows with AI-suggested modifications

### AI Service Integration
- Supports both OpenAI GPT-4 and Anthropic Claude
- Manages API key storage and authentication
- Handles AI response parsing and flow definition extraction

### Navigation Integration
- Integrated into main application navigation
- Accessible via "/ai-assistance" route
- Consistent with other feature pages

## Configuration Requirements

### API Keys
- **OpenAI**: Requires valid OpenAI API key (sk-...)
- **Claude**: Requires valid Anthropic API key
- Keys are stored securely in browser localStorage
- Keys are encrypted in transit to AI services

### Power Automate Connection
- Requires active Power Automate session
- Flow ID must be available in URL parameters
- User must have edit permissions for the target flow

## Error Handling Approach

### Configuration Errors
- Invalid API key format validation
- Storage failure handling with user feedback
- Provider switching error recovery

### AI Communication Errors
- Network failure retry logic
- API rate limiting handling
- Invalid response format recovery

### Flow Update Errors
- Permission denied handling
- Flow not found error recovery
- Validation failure feedback

## Performance Considerations

### API Call Optimization
- Debounced user input to prevent excessive API calls
- Cached flow definitions to reduce Power Automate API usage
- Efficient message history management

### Memory Management
- Limited chat history to prevent memory bloat
- Cleanup of unused state on provider switching
- Proper component unmounting cleanup

### Network Efficiency
- Compressed API payloads where possible
- Efficient error retry strategies
- Background API key validation

## Security Considerations

### API Key Management
- Keys stored only in browser localStorage
- No server-side key storage or logging
- Secure transmission to AI providers
- Option to clear keys at any time

### Flow Data Protection
- Flow definitions only sent to AI when explicitly requested
- No persistent storage of flow data
- User consent implied through configuration

## Future Extension Guidelines

### Adding New AI Providers
1. Update `AIProvider` type in types.ts
2. Add provider option to configuration pivot
3. Implement provider-specific API calls in aiService.ts
4. Update provider name display logic

### Enhanced Flow Analysis
1. Add flow complexity analysis methods
2. Implement flow performance suggestions
3. Create flow best practices validation
4. Add automated testing suggestions

### Advanced Chat Features
1. Implement conversation history persistence
2. Add conversation templates/presets
3. Create flow modification history tracking
4. Add collaborative features for team flows

### Integration Enhancements
1. Add support for other Microsoft Power Platform tools
2. Implement direct integration with Power Platform APIs
3. Add support for custom connectors and actions
4. Create integration with Power Platform governance tools

## Change History
- **[2024-01-XX]**: Initial implementation with OpenAI and Claude support
- **[2024-01-XX]**: Added flow preview and modification capabilities
- **[2024-01-XX]**: Implemented secure API key management 