// Credentials stored by the relay and fetched by the MCP server
export interface Credentials {
  token: string;
  apiUrl: string;
  envId: string;
  flowId: string;
  receivedAt: number;
}

// Multi-service credentials
export interface ServiceCredentials {
  serviceId: string;
  token: string;
  apiUrl: string;
  context: Record<string, string>;
  receivedAt: number;
}

// What the extension POSTs to the relay (new multi-service format)
export interface MultiServiceAuthPayload {
  serviceId: string;
  token: string;
  apiUrl: string;
  [key: string]: unknown; // service-specific context fields
}

// Legacy: what the extension POSTs to the relay (PA only)
export interface AuthPayload {
  token: string;
  apiUrl: string;
  envId: string;
  flowId: string;
  serviceId?: string; // optional for backward compat
}

// Relay status response (no secrets)
export interface RelayStatus {
  authenticated: boolean;
  services?: string[];
  envId?: string;
  flowId?: string;
  receivedAt?: number;
}

// Power Automate flow run status
export type RunStatus = 'Running' | 'Succeeded' | 'Failed' | 'Cancelled' | 'Skipped';

// Flow run from the PA API
export interface FlowRun {
  name: string;
  id: string;
  type: string;
  properties: {
    startTime: string;
    endTime?: string;
    status: RunStatus;
    correlation: {
      clientTrackingId: string;
    };
    trigger: FlowRunAction;
  };
}

// Action details within a flow run
export interface FlowRunAction {
  name: string;
  type: string;
  inputs?: unknown;
  outputs?: unknown;
  startTime?: string;
  endTime?: string;
  status: string;
  code?: string;
  error?: {
    code: string;
    message: string;
  };
  inputsLink?: ContentLink;
  outputsLink?: ContentLink;
}

export interface ContentLink {
  uri: string;
  contentVersion: string;
  contentSize: number;
  contentHash: {
    algorithm: string;
    value: string;
  };
}

// Flow run details (includes actions)
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
    actions?: Record<string, FlowRunAction>;
    definition?: Record<string, unknown>;
  };
}

// Flow definition from the PA API
export interface FlowDefinition {
  name: string;
  id: string;
  type: string;
  properties: {
    displayName: string;
    state: string;
    definition: {
      triggers?: Record<string, unknown>;
      actions?: Record<string, unknown>;
      [key: string]: unknown;
    };
    connectionReferences?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

// PA API list response wrapper
export interface PAListResponse<T> {
  value: T[];
  nextLink?: string;
}
