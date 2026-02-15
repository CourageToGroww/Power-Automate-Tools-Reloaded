export interface RefreshInitiator {
  type: 'refresh';
}

export interface AppLoaded {
  type: 'app-loaded';
}

/** Legacy single-service token message (backward compat) */
export interface TokenChanged {
  type: 'token-changed';
  token: string;
  apiUrl: string;
}

/** New multi-service token message */
export interface ServiceTokenChanged {
  type: 'service-token-changed';
  serviceId: string;
  credentials: {
    token: string;
    apiUrl: string;
    context: Record<string, string>;
  };
}

export interface AIApiCall {
  type: 'ai-api-call';
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface ToggleRelay {
  type: 'toggle-relay';
  enabled: boolean;
}

export interface GetRelayState {
  type: 'get-relay-state';
}

/** Relay state push from background to app */
export interface RelayStateChanged {
  type: 'relay-state-changed';
  enabled: boolean;
  status: string;
}

export type Actions =
  | RefreshInitiator
  | TokenChanged
  | ServiceTokenChanged
  | AppLoaded
  | AIApiCall
  | ToggleRelay
  | GetRelayState
  | RelayStateChanged;
