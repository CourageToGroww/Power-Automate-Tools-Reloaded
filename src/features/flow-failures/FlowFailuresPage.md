# FlowFailuresPage Component Documentation

## Purpose and Functionality Overview
React component that provides a comprehensive interface for viewing and analyzing Power Automate flow failures. Displays a list of failed runs and provides detailed JSON views with highlighted failed actions for debugging purposes.

## Dependencies and Imports
- `@fluentui/react/lib/CommandBar` - Command bar for actions
- `@fluentui/react/lib/DetailsList` - Data table for failures list
- `@fluentui/react/lib/Panel` - Side panel for detailed views
- `@fluentui/react/lib/Spinner` - Loading indicators
- `@fluentui/react/lib/Stack` - Layout components
- `@fluentui/react/lib/Text` - Text components
- `@fluentui/react/lib/Styling` - CSS-in-JS styling
- `@monaco-editor/react` - Monaco code editor for JSON display
- `monaco-editor/esm/vs/editor/editor.api` - Monaco editor API
- `react` - React hooks (useMemo, useState, useEffect)
- `../../common/components/LoaderModal` - Loading modal component
- `../../common/components/Messages` - Message display component
- `./types` - FlowFailure interface
- `./useFlowFailures` - Custom hook for data management

## Component Documentation

### FlowFailuresPage
Main functional component that renders the flow failures interface.

**Props:** None

**State:**
- `editor: monaco.editor.IStandaloneCodeEditor | null` - Monaco editor instance
- `isPanelOpen: boolean` - Controls detail panel visibility

**Key Features:**
- Displays failures in a sortable, filterable table
- Shows detailed JSON with syntax highlighting
- Highlights failed actions with visual indicators
- Provides hover tooltips with error details
- Responsive layout with panel-based details view

## Usage Examples

```typescript
// Basic usage in routing
<Route path="failures" element={<FlowFailuresPage />} />

// The component automatically:
// 1. Loads failed runs on mount
// 2. Displays them in a table
// 3. Allows clicking to view details
// 4. Highlights failed actions in JSON
```

## Integration Points
- **useFlowFailures Hook**: Primary data source for failures and run details
- **Monaco Editor**: Renders JSON with syntax highlighting and decorations
- **Fluent UI Components**: Uses DetailsList, Panel, CommandBar for UI
- **Router**: Integrated as a route in the main application
- **NavBar**: Accessible via the "Flow Failures" tab

## Configuration Requirements
- Requires valid `envId` and `flowId` URL parameters
- Requires active Power Automate session for API access
- Monaco editor must be initialized in the application

## Error Handling Approach
- **Loading States**: Shows spinners during data fetching
- **Empty States**: Displays helpful messages when no failures exist
- **API Errors**: Handled by useFlowFailures hook and displayed via Messages component
- **Editor Errors**: Gracefully handles Monaco editor initialization failures

## Performance Considerations
- **Lazy Loading**: Run details only loaded when failure is selected
- **Virtual Scrolling**: DetailsList handles large failure lists efficiently
- **Editor Optimization**: Monaco editor uses automatic layout for responsiveness
- **Decoration Caching**: Failed action highlights are computed once per selection
- **Memory Management**: Cleans up editor decorations on component updates

## Component Structure

### Main Layout
```
FlowFailuresPage
├── LoaderModal (conditional)
├── Messages (notifications)
├── CommandBar (refresh action)
├── DetailsList (failures table)
└── Panel (detailed view)
    ├── Loading state
    ├── Run details summary
    └── Monaco Editor (JSON with highlights)
```

### Table Columns
- **Run ID**: Unique identifier for the run
- **Start Time**: When the run began (formatted)
- **End Time**: When the run ended (formatted)
- **Status**: Run status (typically "Failed")
- **Failed Actions**: Count of failed actions + trigger status
- **Tracking ID**: Client tracking identifier

### JSON Highlighting
- **Failed Actions**: Highlighted in red background with left border
- **Error Tooltips**: Hover to see error messages
- **Syntax Highlighting**: Full JSON syntax highlighting via Monaco
- **Folding**: Collapsible JSON sections for better navigation

## Future Extension Guidelines

### TO EXTEND THIS COMPONENT:
1. **Add filtering controls**: Add date range, status, or action type filters above the table
2. **Add export functionality**: Add buttons to export failure data as CSV/JSON
3. **Add comparison view**: Allow comparing multiple failed runs side-by-side
4. **Add action-specific views**: Create drill-down views for individual failed actions
5. **Add failure analytics**: Add charts/graphs showing failure trends over time

### INTEGRATION POINTS:
- Connect to external logging systems for enhanced error details
- Integrate with notification systems for failure alerts
- Connect to Power BI for advanced analytics

### PERFORMANCE NOTES:
- Consider implementing virtual scrolling for very large failure lists
- Add pagination for run history to improve initial load times
- Consider caching run details to avoid repeated API calls

## Styling Classes

### CSS-in-JS Styles
- `containerClassName`: Main container with flex layout
- `listContainerClassName`: Table container with padding
- `editorContainerClassName`: Editor container with full height

### Dynamic Styles (Injected)
- `failed-action-highlight`: Red background for failed actions
- `failed-action-glyph`: Red glyph marker in editor margin
- `failed-action-glyph::after`: Warning icon content

## Accessibility Considerations
- **Keyboard Navigation**: Full keyboard support via Fluent UI components
- **Screen Readers**: Proper ARIA labels and roles
- **High Contrast**: Styling works with high contrast themes
- **Focus Management**: Proper focus handling in panel navigation

## Testing Considerations
- **Mock Data**: Create mock FlowFailure objects for testing
- **API Mocking**: Mock useFlowFailures hook responses
- **User Interactions**: Test table clicking and panel navigation
- **Error States**: Test error handling and empty states
- **Editor Integration**: Test Monaco editor highlighting functionality

## Change History
- **[2024-12-19]**: Initial creation with comprehensive failure analysis interface
  - Implemented failures table with sortable columns
  - Added detailed JSON view with Monaco editor integration
  - Implemented failed action highlighting with hover tooltips
  - Added responsive panel-based layout for details
  - Integrated with useFlowFailures hook for data management 