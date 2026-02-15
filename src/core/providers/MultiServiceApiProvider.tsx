import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Actions } from '../../common/types/backgroundActions';
import { ModuleRegistry } from '../modules/ModuleRegistry';
import { ServiceApiClient, ServiceCredentials } from '../modules/ServiceModule.interface';

const DEBUG = true;

function debugLog(...args: unknown[]) {
  if (DEBUG) {
    console.log('[MultiServiceAPI]', ...args);
  }
}

function debugError(...args: unknown[]) {
  if (DEBUG) {
    console.error('[MultiServiceAPI Error]', ...args);
  }
}

interface ServiceState {
  token: string;
  apiUrl: string;
  context: Record<string, string>;
  isReady: boolean;
}

interface MultiServiceApiState {
  services: Map<string, ServiceState>;
  /** Legacy: overall API readiness (true if any service is ready) */
  isApiReady: boolean;
}

/**
 * Legacy-compatible API provider interface.
 * Kept for backward compatibility with existing PA pages that use useApiProviderContext().
 */
export interface IApiProvider {
  get(url: string): Promise<any>;
  patch(url: string, data: any): Promise<any>;
  post(url: string, data: any): Promise<any>;
  isApiReady: boolean;
}

// Legacy context (backward compat with existing pages)
export const ApiProviderContext = createContext<IApiProvider>({} as IApiProvider);

// New multi-service context
interface MultiServiceContextValue {
  getServiceApi(serviceId: string): IApiProvider | null;
  isServiceReady(serviceId: string): boolean;
  isAnyServiceReady: boolean;
}

const MultiServiceContext = createContext<MultiServiceContextValue>({
  getServiceApi: () => null,
  isServiceReady: () => false,
  isAnyServiceReady: false,
});

export const useMultiServiceApi = () => useContext(MultiServiceContext);
export const useApiProviderContext = () => useContext(ApiProviderContext);

/**
 * Hook to get API client for a specific service.
 */
export function useServiceApi(serviceId: string): IApiProvider | null {
  const ctx = useContext(MultiServiceContext);
  return ctx.getServiceApi(serviceId);
}

const PA_API_VERSION = '2016-11-01';

/**
 * Provider that manages API clients for all registered services.
 * Handles both legacy token-changed and new service-token-changed messages.
 */
export const MultiServiceApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<MultiServiceApiState>({
    services: new Map(),
    isApiReady: false,
  });

  useEffect(() => {
    const cb = (action: Actions, _sender: unknown, sendResponse: () => void) => {
      // Legacy: single-service token message (for backward compat)
      if (action.type === 'token-changed') {
        debugLog('Legacy token-changed received');
        setState((prev) => {
          const next = new Map(prev.services);
          next.set('power-automate', {
            token: action.token,
            apiUrl: action.apiUrl,
            context: {},
            isReady: Boolean(action.apiUrl && action.token),
          });
          return { services: next, isApiReady: true };
        });
      }

      // New: multi-service token message
      if (action.type === 'service-token-changed') {
        debugLog('Service token changed:', action.serviceId);
        setState((prev) => {
          const next = new Map(prev.services);
          next.set(action.serviceId, {
            token: action.credentials.token,
            apiUrl: action.credentials.apiUrl,
            context: action.credentials.context,
            isReady: Boolean(action.credentials.apiUrl && action.credentials.token),
          });
          return {
            services: next,
            isApiReady: Array.from(next.values()).some((s) => s.isReady),
          };
        });
      }

      sendResponse();
    };

    chrome.runtime.onMessage.addListener(cb);

    debugLog('Sending app-loaded message');
    chrome.runtime.sendMessage({ type: 'app-loaded' } as Actions, (response) => {
      if (chrome.runtime.lastError) {
        debugError('Failed to send app-loaded:', chrome.runtime.lastError);
      } else {
        debugLog('App-loaded sent successfully');
      }
    });

    return () => {
      chrome.runtime.onMessage.removeListener(cb);
    };
  }, []);

  // Build per-service API clients
  const multiServiceValue = useMemo<MultiServiceContextValue>(() => {
    const makeClient = (serviceId: string): IApiProvider | null => {
      const svc = state.services.get(serviceId);
      if (!svc || !svc.isReady) return null;

      const mod = ModuleRegistry.get(serviceId);
      if (mod) {
        // Use module's createApiClient factory
        const creds: ServiceCredentials = {
          token: svc.token,
          apiUrl: svc.apiUrl,
          context: svc.context,
          receivedAt: Date.now(),
        };
        const client = mod.createApiClient(creds);
        return {
          get: (url: string) => client.get(url),
          patch: (url: string, data: unknown) => client.patch(url, data),
          post: (url: string, data: unknown) => client.post(url, data),
          isApiReady: true,
        };
      }

      // Fallback: generic HTTP client (shouldn't normally happen)
      const http = async (url: string, method: string, data?: unknown): Promise<unknown> => {
        const fullUrl = svc.apiUrl + url;
        const response = await fetch(fullUrl, {
          method,
          headers: {
            authorization: svc.token,
            'Content-Type': 'application/json',
          },
          body: data ? JSON.stringify(data) : undefined,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      };

      return {
        get: (url: string) => http(url, 'GET'),
        patch: (url: string, data: unknown) => http(url, 'PATCH', data),
        post: (url: string, data: unknown) => http(url, 'POST', data),
        isApiReady: true,
      };
    };

    return {
      getServiceApi: makeClient,
      isServiceReady: (id: string) => state.services.get(id)?.isReady ?? false,
      isAnyServiceReady: state.isApiReady,
    };
  }, [state]);

  // Legacy PA provider (backward compat for existing pages using useApiProviderContext)
  const legacyPaApi = useMemo<IApiProvider>(() => {
    const paSvc = state.services.get('power-automate');
    if (!paSvc || !paSvc.isReady) {
      return {
        get: () => Promise.reject(new Error('API not ready')),
        patch: () => Promise.reject(new Error('API not ready')),
        post: () => Promise.reject(new Error('API not ready')),
        isApiReady: false,
      };
    }

    const http = async (url: string, method: string, data?: unknown, retryCount = 0): Promise<unknown> => {
      const maxRetries = 3;
      const retryDelay = 1000;

      const endpointUrl = paSvc.apiUrl + url;
      const fullUrl = endpointUrl +
        (endpointUrl.includes('?')
          ? `&api-version=${PA_API_VERSION}`
          : `?api-version=${PA_API_VERSION}`);

      try {
        const response = await fetch(fullUrl, {
          method,
          body: data ? JSON.stringify(data) : undefined,
          headers: {
            authorization: paSvc.token,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return response.json();
          }
          const text = await response.text();
          return text ? { message: text } : {};
        }

        if (response.status === 401) {
          throw new Error('Authentication failed. Please refresh the Power Automate page and try again.');
        }
        if (response.status === 403) {
          throw new Error('Access forbidden. You may not have permission to modify this flow.');
        }
        if (response.status === 404) {
          throw new Error('Flow not found. It may have been deleted or moved.');
        }
        if ((response.status === 429 || response.status >= 500) && retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * (retryCount + 1)));
          return http(url, method, data, retryCount + 1);
        }

        const body = await response.json().catch(() => ({}));
        const errorMessage = (body as Record<string, unknown>)?.error
          ? String(((body as Record<string, unknown>).error as Record<string, unknown>)?.message)
          : `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes('Authentication failed') ||
            error.message.includes('Access forbidden') ||
            error.message.includes('Flow not found'))
        ) {
          throw error;
        }
        if (error instanceof TypeError && error.message.includes('fetch') && retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * (retryCount + 1)));
          return http(url, method, data, retryCount + 1);
        }
        throw error;
      }
    };

    return {
      get: (url: string) => http(url, 'GET'),
      patch: (url: string, data: unknown) => http(url, 'PATCH', data),
      post: (url: string, data: unknown) => http(url, 'POST', data),
      isApiReady: true,
    };
  }, [state]);

  return (
    <MultiServiceContext.Provider value={multiServiceValue}>
      <ApiProviderContext.Provider value={legacyPaApi}>
        {children}
      </ApiProviderContext.Provider>
    </MultiServiceContext.Provider>
  );
};
