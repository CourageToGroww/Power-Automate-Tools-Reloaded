export interface FlowRun {
  name: string;
  id: string;
  type: string;
  properties: {
    waitEndTime?: string;
    startTime: string;
    endTime?: string;
    status: 'Running' | 'Succeeded' | 'Failed' | 'Cancelled' | 'Skipped';
    correlation: {
      clientTrackingId: string;
    };
    trigger: {
      name: string;
      inputsLink?: {
        uri: string;
        contentVersion: string;
        contentSize: number;
        contentHash: {
          algorithm: string;
          value: string;
        };
      };
      outputsLink?: {
        uri: string;
        contentVersion: string;
        contentSize: number;
        contentHash: {
          algorithm: string;
          value: string;
        };
      };
      startTime: string;
      endTime?: string;
      scheduledTime?: string;
      originHistoryName?: string;
      correlation: {
        clientTrackingId: string;
      };
      code?: string;
      status: string;
    };
    outputs?: any;
    response?: any;
  };
}

export interface FlowRunAction {
  name: string;
  type: string;
  inputs?: any;
  outputs?: any;
  startTime?: string;
  endTime?: string;
  status: 'Succeeded' | 'Failed' | 'Skipped' | 'Running' | 'Cancelled';
  code?: string;
  error?: {
    code: string;
    message: string;
  };
  trackedProperties?: any;
}

export interface FlowRunDetails {
  name: string;
  id: string;
  type: string;
  properties: {
    startTime: string;
    endTime?: string;
    status: string;
    correlation: {
      clientTrackingId: string;
    };
    trigger: FlowRunAction;
    actions?: { [key: string]: FlowRunAction };
    outputs?: any;
  };
}

export interface FlowFailure {
  runId: string;
  runName: string;
  startTime: string;
  endTime?: string;
  status: string;
  failedActions: FlowRunAction[];
  triggerFailed: boolean;
  clientTrackingId: string;
} 