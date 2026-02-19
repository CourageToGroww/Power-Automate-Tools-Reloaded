import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { ServiceType, ServiceContext } from '../services/ServiceDetector';
import type { Actions } from '../types/backgroundActions';

interface ServiceToken {
  service: ServiceType;
  token: string;
  apiUrl: string;
  context: ServiceContext;
}

interface ServiceApiClient {
  get(endpoint: string): Promise<unknown>;
  post(endpoint: string, data: unknown): Promise<unknown>;
  patch(endpoint: string, data: unknown): Promise<unknown>;
  isReady: boolean;
}

interface MultiServiceApi {
  getClient(service: ServiceType): ServiceApiClient;
  activeServices: ServiceType[];
  serviceStatus: Record<string, { hasToken: boolean }>;
  relayStatus: { connected: boolean; transport: 'native' | 'http' | 'none' };
  toggleRelay(enabled: boolean): Promise<void>;
}

const MultiServiceApiContext = createContext<MultiServiceApi>({} as MultiServiceApi);

const DEBUG = false;

function debugLog(...args: unknown[]) {
  if (DEBUG) {
    console.log('[MultiServiceApi]', ...args);
  }
}

export function MultiServiceApiProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<Map<ServiceType, ServiceToken>>(new Map());
  const [relayStatus, setRelayStatus] = useState<{
    connected: boolean;
    transport: 'native' | 'http' | 'none';
  }>({ connected: false, transport: 'none' });

  useEffect(() => {
    const listener = (action: Actions, _sender: unknown, sendResponse: () => void) => {
      if (action.type === 'service-token-changed') {
        debugLog('Token changed for service:', action.service);
        setTokens(prev => {
          const next = new Map(prev);
          next.set(action.service, {
            service: action.service,
            token: action.token,
            apiUrl: action.apiUrl,
            context: action.context || {},
          });
          return next;
        });
      }
      if (action.type === 'relay-status') {
        debugLog('Relay status:', action.connected, action.transport);
        setRelayStatus({ connected: action.connected, transport: action.transport });
      }
      sendResponse();
    };

    chrome.runtime.onMessage.addListener(listener);

    // Request current service status from background
    chrome.runtime.sendMessage({ type: 'get-service-status' } as Actions, (resp) => {
      if (chrome.runtime.lastError) {
        debugLog('Failed to get service status:', chrome.runtime.lastError.message);
        return;
      }
      if (resp?.services) {
        debugLog('Got initial service status:', resp.services);
      }
    });

    // Also send app-loaded to trigger sendAllServiceTokens from background
    // This ensures we receive all stored tokens even if our listener registered
    // after the initial app-loaded broadcast
    chrome.runtime.sendMessage({ type: 'app-loaded' } as Actions, () => {
      if (chrome.runtime.lastError) {
        debugLog('Failed to send app-loaded:', chrome.runtime.lastError.message);
      }
    });

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  const makeClient = useCallback((service: ServiceType): ServiceApiClient => {
    const tokenData = tokens.get(service);

    const request = async (endpoint: string, _method: string, _data?: unknown): Promise<unknown> => {
      if (!tokenData) {
        throw new Error(`No authentication token available for ${service}. Visit the service in your browser to connect.`);
      }

      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'get-service-data', service, endpoint } as Actions,
          (resp) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message || 'Communication error with background script'));
              return;
            }
            if (resp?.error) {
              reject(new Error(resp.error));
            } else {
              resolve(resp?.data);
            }
          }
        );
      });
    };

    return {
      get: (endpoint: string) => request(endpoint, 'GET'),
      post: (endpoint: string, data: unknown) => request(endpoint, 'POST', data),
      patch: (endpoint: string, data: unknown) => request(endpoint, 'PATCH', data),
      isReady: Boolean(tokenData),
    };
  }, [tokens]);

  const toggleRelay = useCallback(async (enabled: boolean) => {
    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: 'relay-toggle', enabled } as Actions, (resp) => {
        if (chrome.runtime.lastError) {
          debugLog('Failed to toggle relay:', chrome.runtime.lastError.message);
          resolve();
          return;
        }
        if (resp?.transport) {
          setRelayStatus({ connected: resp.connected, transport: resp.transport });
        }
        resolve();
      });
    });
  }, []);

  const value = useMemo<MultiServiceApi>(() => ({
    getClient: makeClient,
    activeServices: Array.from(tokens.keys()),
    serviceStatus: Object.fromEntries(
      Array.from(tokens.entries()).map(([svc]) => [svc, { hasToken: true }])
    ),
    relayStatus,
    toggleRelay,
  }), [makeClient, tokens, relayStatus, toggleRelay]);

  return (
    <MultiServiceApiContext.Provider value={value}>
      {children}
    </MultiServiceApiContext.Provider>
  );
}

export function useMultiServiceApi(): MultiServiceApi {
  return useContext(MultiServiceApiContext);
}

export function useServiceApi(service: ServiceType): ServiceApiClient {
  const api = useMultiServiceApi();
  return api.getClient(service);
}
