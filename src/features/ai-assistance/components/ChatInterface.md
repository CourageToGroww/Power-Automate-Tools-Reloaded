# ChatInterface Component

## Purpose and Functionality Overview
The ChatInterface component provides a conversational user interface for interacting with AI assistants (GPT-4 or Claude) in the context of Power Automate flow modifications. It displays chat messages, handles user input, and provides a smooth messaging experience with loading states and error handling.

## Dependencies and Imports
- **React**: useState, useRef, useEffect hooks
- **@fluentui/react**: Fluent UI components for consistent Microsoft design
- **ChatMessage, AIProvider**: Type definitions for message structure and AI providers

## Component Props Interface
```typescript
interface ChatInterfaceProps {
  provider: AIProvider;           // Current AI provider ('openai' | 'claude')
  messages: ChatMessage[];        // Array of conversation messages
  onSendMessage: (message: string) => Promise<void>; // Callback for sending messages
  isLoading: boolean;            // Loading state indicator
  error: string | null;          // Error message to display
}
```

## Function/Method Documentation

### State Management
- `inputMessage`: Current user input text
- `messagesEndRef`: Ref for auto-scrolling to latest message

### Key Methods

#### `scrollToBottom()`
**Parameters**: None
**Returns**: void
**Purpose**: Automatically scrolls the message container to show the latest message

**Implementation**: Uses smooth scrolling behavior to enhance user experience

#### `handleSendMessage()`
**Parameters**: None
**Returns**: Promise<void>
**Purpose**: Processes user message submission

**Implementation Flow**:
1. Validates message content and loading state
2. Trims whitespace from message
3. Clears input field immediately for better UX
4. Calls parent component's onSendMessage callback
5. Handles errors gracefully (delegated to parent)

#### `handleKeyPress(event: React.KeyboardEvent)`
**Parameters**: 
- `event`: Keyboard event from input field
**Returns**: void
**Purpose**: Handles keyboard shortcuts for message sending

**Implementation**: 
- Enter key sends message (without shift modifier)
- Shift+Enter creates new line in multiline input
- Prevents default form submission behavior

#### `getProviderName()`
**Parameters**: None
**Returns**: string
**Purpose**: Returns user-friendly name for current AI provider

**Implementation**: Maps 'openai' to 'GPT-4' and 'claude' to 'Claude'

## Usage Examples

### Basic Usage
```tsx
import { ChatInterface } from './components/ChatInterface';

const MyComponent = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async (message: string) => {
    // Implementation for sending message to AI
  };

  return (
    <ChatInterface
      provider="openai"
      messages={messages}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
      error={error}
    />
  );
};
```

### Message Flow Example
```typescript
// Example message structure
const exampleMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'Add a condition to check if email subject contains urgent',
    timestamp: new Date()
  },
  {
    id: '2',
    role: 'assistant',
    content: 'I\'ll help you add a condition to your flow...',
    timestamp: new Date()
  }
];
```

## Integration Points

### Parent Component Integration
- Receives conversation state from parent hook (useAIAssistance)
- Delegates message sending to parent component
- Reports user interactions through callback props
- Displays error states managed by parent

### Fluent UI Integration
- Uses consistent Microsoft design language
- Responsive layout with proper spacing
- Accessible form controls and navigation
- Professional color scheme and typography

### Keyboard Navigation
- Enter key for quick message sending
- Shift+Enter for multiline input
- Tab navigation through interface elements
- Accessible focus management

## UI/UX Design Principles

### Message Display
- User messages aligned to the right with blue background
- AI messages aligned to the left with gray background
- Clear role indicators (You vs GPT-4/Claude)
- Timestamp display for message context
- Proper text wrapping for long messages

### Input Interface
- Multiline text field for complex requests
- Send button with clear iconography
- Disabled state during loading
- Placeholder text with example usage
- Visual feedback for user actions

### Loading States
- Spinner indicator during AI processing
- "AI is thinking..." message for context
- Disabled input during processing
- Clear visual feedback for user

### Error Handling
- Prominent error message bar
- Dismissible error notifications
- Non-blocking error display
- Maintains conversation context

## Performance Considerations

### Rendering Optimization
- Efficient message list rendering
- Proper key props for React optimization
- Minimal re-renders with useCallback usage
- Optimized scroll behavior

### Memory Management
- Efficient message storage
- Proper cleanup of event listeners
- Garbage collection friendly patterns
- Limited DOM manipulation

### User Experience
- Immediate input clearing for responsiveness
- Smooth scrolling animations
- Debounced auto-scroll to prevent conflicts
- Responsive design for different screen sizes

## Accessibility Features

### Screen Reader Support
- Proper ARIA labels and descriptions
- Semantic HTML structure
- Focus management for keyboard users
- Clear role and state announcements

### Keyboard Navigation
- Full keyboard accessibility
- Logical tab order
- Keyboard shortcuts for common actions
- Escape key handling for modal interactions

### Visual Accessibility
- High contrast color schemes
- Scalable text and interface elements
- Clear visual hierarchy
- Consistent interaction patterns

## Future Extension Guidelines

### Enhanced Message Types
1. Add support for rich message content (markdown, code blocks)
2. Implement message reactions and feedback
3. Add message editing and deletion capabilities
4. Create message threading for complex conversations

### Advanced UI Features
1. Implement conversation search functionality
2. Add message export/import capabilities
3. Create conversation templates and presets
4. Add collaborative features for team conversations

### Customization Options
1. Add theme customization support
2. Implement font size and layout preferences
3. Create custom AI persona options
4. Add conversation history management

### Integration Enhancements
1. Add file attachment support for flow imports
2. Implement voice input and output
3. Create integration with Power Platform documentation
4. Add support for flow screenshots and annotations

## Testing Guidelines

### Unit Testing
- Test message rendering with various content types
- Verify keyboard event handling
- Test loading and error states
- Validate accessibility features

### Integration Testing
- Test with parent component integration
- Verify message sending workflow
- Test error handling scenarios
- Validate responsive design

### User Experience Testing
- Test with actual AI conversations
- Verify scrolling behavior with long conversations
- Test keyboard navigation workflows
- Validate accessibility with screen readers

## Change History
- **[2024-01-XX]**: Initial implementation with basic chat functionality
- **[2024-01-XX]**: Added keyboard shortcuts and accessibility features
- **[2024-01-XX]**: Enhanced error handling and loading states 