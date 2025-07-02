export interface RefreshInitiator {
  type: 'refresh';
}

export interface AppLoaded {
  type: 'app-loaded';
}

export interface TokenChanged {
  type: 'token-changed';
  token: string;
  apiUrl: string;
}

export interface AIApiCall {
  type: 'ai-api-call';
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export type Actions = RefreshInitiator | TokenChanged | AppLoaded | AIApiCall;
