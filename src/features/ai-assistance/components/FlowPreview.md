# FlowPreview Component

## Purpose and Functionality Overview
The FlowPreview component displays AI-suggested modifications to Power Automate flows in a user-friendly preview interface. It allows users to review proposed changes, view detailed flow definitions, and apply modifications to their actual flows with confidence and understanding.

## Dependencies and Imports
- **React**: useState hook for local state management
- **@fluentui/react**: Fluent UI components for consistent Microsoft design
- **FlowDefinition**: Type definition for flow structure

## Component Props Interface
```typescript
interface FlowPreviewProps {
  flowDefinition: FlowDefinition | null;  // AI-suggested flow definition
  onApplyChanges: () => Promise<void>;     // Callback to apply changes
  hasChanges: boolean;                     // Whether there are pending changes
}
```

## Function/Method Documentation

### State Management
- `showFullPreview`: Boolean controlling full definition panel visibility
- `isApplying`: Boolean indicating if changes are being applied

### Key Methods

#### `handleApplyChanges()`
**Parameters**: None
**Returns**: Promise<void>
**Purpose**: Manages the flow change application process with loading states

**Implementation Flow**:
1. Sets applying state to true for UI feedback
2. Calls parent component's onApplyChanges callback
3. Ensures applying state is reset in finally block
4. Provides visual feedback during the process

#### `getChangesSummary()`
**Parameters**: None
**Returns**: Object with flow statistics or null
**Purpose**: Analyzes flow definition to provide summary statistics

**Return Object Structure**:
```typescript
{
  actionCount: number;      // Number of actions in flow
  triggerCount: number;     // Number of triggers in flow
  hasConditions: boolean;   // Whether flow contains conditional logic
  hasLoops: boolean;        // Whether flow contains loops/iterations
}
```

**Analysis Logic**:
- Counts actions and triggers from flow definition
- Detects conditional logic (If actions)
- Identifies loop constructs (Foreach actions)
- Provides null for invalid or missing definitions

## Usage Examples

### Basic Usage
```tsx
import { FlowPreview } from './components/FlowPreview';

const MyComponent = () => {
  const [flowDefinition, setFlowDefinition] = useState<FlowDefinition | null>(null);
  
  const handleApplyChanges = async () => {
    // Implementation for applying flow changes
    await updateFlowInPowerAutomate(flowDefinition);
  };

  return (
    <FlowPreview
      flowDefinition={flowDefinition}
      onApplyChanges={handleApplyChanges}
      hasChanges={!!flowDefinition}
    />
  );
};
```

### Flow Definition Structure Example
```typescript
const exampleFlowDefinition: FlowDefinition = {
  definition: {
    triggers: {
      "manual": {
        type: "Request",
        kind: "Button"
      }
    },
    actions: {
      "condition_1": {
        type: "If",
        expression: "@contains(triggerBody()['subject'], 'urgent')"
      },
      "send_email": {
        type: "ApiConnection",
        inputs: {
          // Email action configuration
        }
      }
    }
  }
};
```

## Integration Points

### Parent Component Integration
- Receives flow definition from AI assistance hook
- Reports change application through callback
- Displays changes based on parent state
- Coordinates with chat interface for user workflow

### Power Automate Integration
- Previews actual flow structures that will be applied
- Validates flow definition format before display
- Provides safe preview before making changes
- Maintains compatibility with Power Automate schemas

### User Workflow Integration
- Integrated into AI conversation workflow
- Provides confirmation step before applying changes
- Maintains user control over flow modifications
- Supports iterative flow improvement process

## UI/UX Design Principles

### Information Hierarchy
- Clear distinction between preview and no-changes states
- Prominent action buttons for user decisions
- Structured summary information display
- Progressive disclosure of detailed information

### Visual Feedback
- Loading states during change application
- Success/error messaging integration
- Clear change indicators and summaries
- Professional color coding and iconography

### User Control
- Explicit apply action required from user
- Full definition preview available on demand
- Clear summary of what changes will be made
- Safe preview without automatic application

## Component States

### No Changes State
- Displays helpful message about getting AI suggestions
- Provides guidance on how to use the feature
- Maintains clean, uncluttered interface
- Encourages user interaction with AI

### Changes Available State
- Shows informational message about pending changes
- Displays flow summary with key statistics
- Provides action buttons for user decisions
- Maintains clear visual hierarchy

### Loading State
- Disables interactive elements during processing
- Provides visual feedback for user confidence
- Maintains interface responsiveness
- Prevents duplicate submissions

## Flow Analysis Features

### Statistical Analysis
- Counts triggers and actions for complexity assessment
- Identifies conditional logic for flow sophistication
- Detects loops for processing complexity
- Provides overview of flow structure

### Validation Features
- Checks for valid flow definition structure
- Validates required properties and formats
- Provides safe preview of malformed definitions
- Handles edge cases gracefully

### Preview Capabilities
- Full JSON definition display in formatted view
- Syntax highlighting for better readability
- Scrollable view for large flow definitions
- Copy-friendly formatting for debugging

## Performance Considerations

### Rendering Optimization
- Efficient flow definition analysis
- Lazy loading of full preview panel
- Optimized re-renders with proper dependencies
- Minimal DOM manipulation for better performance

### Memory Management
- Efficient object analysis without deep copying
- Proper cleanup of event listeners
- Garbage collection friendly patterns
- Limited memory footprint for large flows

### User Experience
- Immediate feedback for user actions
- Responsive interface during processing
- Smooth panel transitions and animations
- Progressive loading for complex flows

## Error Handling Approach

### Invalid Flow Definitions
- Graceful handling of malformed JSON
- Safe preview of incomplete definitions
- Clear error messaging for users
- Fallback display options

### Application Failures
- Error propagation to parent components
- User-friendly error messaging
- Maintains interface state consistency
- Provides recovery options

### Edge Cases
- Empty or null flow definitions
- Missing required properties
- Circular references in flow structure
- Oversized flow definitions

## Future Extension Guidelines

### Enhanced Analysis
1. Add flow performance impact analysis
2. Implement best practices validation
3. Create flow complexity scoring
4. Add security and compliance checking

### Visualization Improvements
1. Add graphical flow representation
2. Implement flow diff visualization
3. Create interactive flow exploration
4. Add flow dependency mapping

### User Experience Enhancements
1. Add change history and versioning
2. Implement collaborative review features
3. Create flow testing integration
4. Add automated flow validation

### Integration Expansions
1. Add support for custom connectors
2. Implement Power Platform governance integration
3. Create flow template suggestions
4. Add integration with Power Platform Center of Excellence

## Testing Guidelines

### Unit Testing
- Test flow definition analysis logic
- Verify state management and transitions
- Test error handling scenarios
- Validate component prop handling

### Integration Testing
- Test with various flow definition formats
- Verify parent component integration
- Test change application workflow
- Validate error propagation

### User Experience Testing
- Test with real Power Automate flows
- Verify accessibility features
- Test responsive design behavior
- Validate performance with large flows

## Accessibility Features

### Screen Reader Support
- Proper ARIA labels for all interactive elements
- Semantic HTML structure for content hierarchy
- Clear descriptions of flow changes and statistics
- Accessible panel controls and navigation

### Keyboard Navigation
- Full keyboard accessibility for all features
- Logical tab order through interface elements
- Keyboard shortcuts for common actions
- Accessible modal and panel interactions

### Visual Accessibility
- High contrast design for better visibility
- Scalable interface elements and text
- Clear visual indicators for different states
- Consistent interaction patterns

## Change History
- **[2024-01-XX]**: Initial implementation with basic preview functionality
- **[2024-01-XX]**: Added flow analysis and summary features
- **[2024-01-XX]**: Enhanced error handling and accessibility features 