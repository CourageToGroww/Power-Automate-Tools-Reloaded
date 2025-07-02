# useFlowFailures Hook Documentation

## Purpose and Functionality Overview
Custom React hook that manages flow failure data, including fetching flow run history, filtering for failures, and retrieving detailed run information with error analysis.

## Dependencies and Imports
- `@fluentui/react/lib/MessageBar` - MessageBarType for user notifications
- `react` - useEffect, useState for React hooks
- `../../common/components/Messages` - useMessageBar for message management
- `../../common/providers/ApiProvider` - useApiProviderContext for API calls
- `./types` - FlowFailure, FlowRun, FlowRunDetails, FlowRunAction interfaces

## Function Documentation

### useFlowFailures()
Main hook function that provides flow failure management capabilities.

**Parameters:** None

**Return Type:**
```typescript
{
  isLoading: boolean;
  isLoadingDetails: boolean;
  failures: FlowFailure[];
  selectedFailure: FlowFailure | null;
  selectedRunDetails: FlowRunDetails | null;
  selectFailure: (failure: FlowFailure) => void;
  refreshFailures: () => void;
  messages: MessageItem[];
  onDismissed: (item: MessageItem) => void;
}
```

**Return Properties:**
- `isLoading: boolean` - Whether initial failure data is loading
- `isLoadingDetails: boolean` - Whether detailed run data is loading
- `failures: FlowFailure[]` - Array of failed flow runs
- `selectedFailure: FlowFailure | null` - Currently selected failure
- `selectedRunDetails: FlowRunDetails | null` - Detailed data for selected run
- `selectFailure: function` - Function to select and load details for a failure
- `refreshFailures: function` - Function to refresh the failures list
- `messages: MessageItem[]` - User notification messages
- `onDismissed: function` - Function to dismiss messages

### fetchFlowFailures()
Internal async function that retrieves flow run history and filters for failures.

**Process:**
1. Validates environment and flow IDs
2. Calls Power Automate API to get run history
3. Filters runs with 'Failed' status
4. Converts to FlowFailure objects
5. Updates state and shows user messages

### fetchRunDetails(runId: string)
Internal async function that retrieves detailed information for a specific failed run.

**Parameters:**
- `runId: string` - The ID of the run to fetch details for

**Process:**
1. Calls Power Automate API for run details
2. Analyzes trigger and action failures
3. Updates the failure object with failed actions
4. Sets selected run details for display

## Usage Examples

```typescript
// Basic usage in a component
const FlowFailuresComponent = () => {
  const {
    isLoading,
    failures,
    selectedFailure,
    selectedRunDetails,
    selectFailure,
    refreshFailures,
    messages,
    onDismissed,
  } = useFlowFailures();

  // Display failures list
  return (
    <div>
      {isLoading ? (
        <Spinner />
      ) : (
        <DetailsList 
          items={failures}
          onItemInvoked={selectFailure}
        />
      )}
      <Messages items={messages} onDismissed={onDismissed} />
    </div>
  );
};

// Refreshing failures
const handleRefresh = () => {
  refreshFailures();
};

// Selecting a failure for details
const handleFailureClick = (failure: FlowFailure) => {
  selectFailure(failure);
};
```

## Integration Points
- **ApiProvider**: Uses `useApiProviderContext()` for Power Automate API calls
- **Messages**: Uses `useMessageBar()` for user notifications
- **URL Parameters**: Reads `envId` and `flowId` from query string
- **FlowFailuresPage**: Primary consumer of this hook
- **Power Automate API**: Integrates with flow runs and run details endpoints

## Configuration Requirements
Requires URL parameters:
- `envId` - Power Automate environment ID
- `flowId` - Power Automate flow ID

## Error Handling Approach
- **API Errors**: Caught and displayed as user messages with MessageBarType.error
- **Network Errors**: Handled by ApiProvider with retry logic
- **Data Validation**: Validates API responses before processing
- **Missing Parameters**: Shows error messages for missing envId/flowId
- **Empty Results**: Shows informational message when no failures found

**Error Message Examples:**
- "Error loading flow failures: [error message]"
- "Error loading run details: [error message]"
- "Invalid runs response - missing or invalid value array"

## Performance Considerations
- **Lazy Loading**: Run details only loaded when failure is selected
- **Efficient Filtering**: Filters failures on client side after single API call
- **State Management**: Minimal re-renders through proper state structure
- **API Optimization**: Uses specific endpoints for run history vs. details
- **Memory Management**: Clears selected data on refresh

## Future Extension Guidelines

### TO EXTEND THIS HOOK:
1. **Add new failure analysis**: Extend `fetchRunDetails()` to compute additional failure metrics
2. **Add filtering options**: Add parameters for date range, status, etc.
3. **Add caching**: Implement local storage or memory caching for run details
4. **Add pagination**: Modify `fetchFlowFailures()` to support paged results
5. **Add real-time updates**: Add polling or SignalR integration for live updates

### INTEGRATION POINTS:
- Connect to additional Power Automate APIs for enhanced data
- Integrate with logging/analytics services
- Connect to notification systems for failure alerts

### PERFORMANCE NOTES:
- Consider implementing virtual scrolling for large failure lists
- Add debouncing for rapid refresh operations
- Consider background refresh strategies

## API Endpoints Used
- **Flow Runs**: `providers/Microsoft.ProcessSimple/environments/{envId}/flows/{flowId}/runs`
- **Run Details**: `providers/Microsoft.ProcessSimple/environments/{envId}/flows/{flowId}/runs/{runId}`

## Change History
- **[2024-12-19]**: Initial creation with core failure management functionality
  - Implemented fetchFlowFailures() for run history retrieval
  - Implemented fetchRunDetails() for detailed failure analysis
  - Added comprehensive error handling and user messaging
  - Integrated with existing ApiProvider and Messages infrastructure 