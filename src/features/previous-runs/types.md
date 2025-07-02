# Flow Failures Types Documentation

## Purpose and Functionality Overview
This file defines TypeScript interfaces for handling Power Automate flow run failures, including data structures for flow runs, actions, and failure analysis.

## Dependencies and Imports
No external dependencies - contains only TypeScript interface definitions.

## Interface Documentation

### FlowRun
Represents a Power Automate flow run with complete metadata.

**Properties:**
- `name: string` - Unique identifier for the run
- `id: string` - Flow run ID
- `type: string` - Resource type identifier
- `properties: object` - Run properties containing:
  - `startTime: string` - ISO timestamp when run started
  - `endTime?: string` - ISO timestamp when run ended (optional)
  - `status: 'Running' | 'Succeeded' | 'Failed' | 'Cancelled' | 'Skipped'` - Run status
  - `correlation: object` - Correlation data with clientTrackingId
  - `trigger: object` - Trigger execution details
  - `outputs?: any` - Run outputs (optional)
  - `response?: any` - Run response data (optional)

### FlowRunAction
Represents an individual action within a flow run.

**Properties:**
- `name: string` - Action name/identifier
- `type: string` - Action type
- `inputs?: any` - Action input data (optional)
- `outputs?: any` - Action output data (optional)
- `startTime?: string` - Action start timestamp (optional)
- `endTime?: string` - Action end timestamp (optional)
- `status: 'Succeeded' | 'Failed' | 'Skipped' | 'Running' | 'Cancelled'` - Action status
- `code?: string` - Status code (optional)
- `error?: object` - Error details with code and message (optional)
- `trackedProperties?: any` - Additional tracked properties (optional)

### FlowRunDetails
Detailed information about a specific flow run including all actions.

**Properties:**
- `name: string` - Run identifier
- `id: string` - Run ID
- `type: string` - Resource type
- `properties: object` - Detailed run properties:
  - `startTime: string` - Run start time
  - `endTime?: string` - Run end time (optional)
  - `status: string` - Run status
  - `correlation: object` - Correlation information
  - `trigger: FlowRunAction` - Trigger action details
  - `actions?: { [key: string]: FlowRunAction }` - Map of all actions (optional)
  - `outputs?: any` - Run outputs (optional)

### FlowFailure
Processed failure information for display and analysis.

**Properties:**
- `runId: string` - Unique run identifier
- `runName: string` - Display name for the run
- `startTime: string` - When the run started
- `endTime?: string` - When the run ended (optional)
- `status: string` - Failure status
- `failedActions: FlowRunAction[]` - Array of actions that failed
- `triggerFailed: boolean` - Whether the trigger failed
- `clientTrackingId: string` - Client tracking identifier

## Usage Examples

```typescript
// Creating a flow failure from run data
const failure: FlowFailure = {
  runId: run.name,
  runName: run.name,
  startTime: run.properties.startTime,
  endTime: run.properties.endTime,
  status: run.properties.status,
  failedActions: [],
  triggerFailed: run.properties.trigger?.status === 'Failed',
  clientTrackingId: run.properties.correlation.clientTrackingId,
};

// Filtering failed actions
const failedActions = Object.values(runDetails.properties.actions || {})
  .filter(action => action.status === 'Failed');
```

## Integration Points
- Used by `useFlowFailures.ts` for data management
- Used by `FlowFailuresPage.tsx` for UI display
- Integrates with Power Automate API response structures

## Configuration Requirements
No configuration required - pure TypeScript definitions.

## Error Handling Approach
Types include optional error properties for graceful handling of incomplete data:
- Optional properties marked with `?`
- Error objects with structured code and message format
- Status enums for type safety

## Performance Considerations
- Lightweight interface definitions with no runtime overhead
- Structured for efficient filtering and mapping operations
- Designed for minimal memory footprint when processing large run histories

## Future Extension Guidelines
To extend these types:

1. **Adding new status types**: Update the union types for status fields
2. **Adding new action properties**: Extend FlowRunAction interface
3. **Adding failure analysis**: Extend FlowFailure with additional computed fields
4. **Adding filtering criteria**: Create new interfaces that extend existing ones

## Change History
- **[2024-12-19]**: Initial creation with core flow failure types
  - Defined FlowRun, FlowRunAction, FlowRunDetails, and FlowFailure interfaces
  - Added comprehensive property documentation
  - Structured for Power Automate API compatibility 