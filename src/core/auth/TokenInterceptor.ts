import jwtDecode from 'jwt-decode';
import { ModuleRegistry } from '../modules/ModuleRegistry';
import { MultiServiceTokenStore } from './MultiServiceTokenStore';
import { ServiceContext, ServiceCredentials } from '../modules/ServiceModule.interface';

const DEBUG = true;

function debugLog(...args: unknown[]) {
  if (DEBUG) {
    console.log('[TokenInterceptor]', ...args);
  }
}

function debugError(...args: unknown[]) {
  if (DEBUG) {
    console.error('[TokenInterceptor Error]', ...args);
  }
}

export interface InterceptResult {
  serviceId: string;
  context: ServiceContext;
  credentials: ServiceCredentials;
  isNew: boolean;
}

/**
 * Handles webRequest interceptions and routes tokens to the correct module.
 * Tries each registered module's extractContext() until one matches.
 */
export function handleInterceptedRequest(
  details: chrome.webRequest.WebRequestHeadersDetails
): InterceptResult | null {
  const modules = ModuleRegistry.getAll();

  let matchedContext: ServiceContext | null = null;

  for (const mod of modules) {
    matchedContext = mod.extractContext(details.url, details.requestHeaders);
    if (matchedContext) {
      break;
    }
  }

  if (!matchedContext) {
    debugLog('No module matched URL:', details.url);
    return null;
  }

  const authHeader = details.requestHeaders?.find(
    (h) => h.name.toLowerCase() === 'authorization'
  );
  const token = authHeader?.value;

  if (!token) {
    debugLog('No authorization header for', matchedContext.serviceId);
    return null;
  }

  const existing = MultiServiceTokenStore.get(matchedContext.serviceId);
  const isNewToken = !existing || existing.token !== token;

  let expiresAt: Date | undefined;
  try {
    const decoded = jwtDecode(token) as { exp?: number };
    if (decoded.exp) {
      expiresAt = new Date(decoded.exp * 1000);
    }
  } catch {
    debugError('Failed to decode JWT for', matchedContext.serviceId);
  }

  const creds: ServiceCredentials = {
    token,
    apiUrl: matchedContext.apiUrl,
    context: matchedContext.ids,
    receivedAt: Date.now(),
    expiresAt,
  };

  MultiServiceTokenStore.store(matchedContext.serviceId, creds);

  if (isNewToken) {
    debugLog(
      `New token stored for ${matchedContext.serviceId}`,
      `context:`, matchedContext.ids
    );
  }

  return {
    serviceId: matchedContext.serviceId,
    context: matchedContext,
    credentials: creds,
    isNew: isNewToken,
  };
}
