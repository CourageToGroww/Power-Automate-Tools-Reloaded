import { Credentials, AuthPayload, ServiceCredentials, RelayStatus } from './types';

// Multi-service credential store: Map<serviceId, ServiceCredentials>
const serviceCredentials: Map<string, ServiceCredentials> = new Map();

// Legacy single-slot credentials (for backward compat with existing PA tools)
let legacyCredentials: Credentials | null = null;

/**
 * Store credentials from the extension.
 * Handles both legacy PA-only payload and new multi-service payload.
 */
export function storeCredentials(payload: AuthPayload): void {
  const serviceId = payload.serviceId || 'power-automate';

  // Always store in multi-service map
  const context: Record<string, string> = {};
  // Extract known context fields
  if (payload.envId) context.envId = payload.envId;
  if (payload.flowId) context.flowId = payload.flowId;
  // Copy any other string fields as context
  for (const [key, value] of Object.entries(payload)) {
    if (['token', 'apiUrl', 'serviceId'].includes(key)) continue;
    if (typeof value === 'string') {
      context[key] = value;
    }
  }

  serviceCredentials.set(serviceId, {
    serviceId,
    token: payload.token,
    apiUrl: payload.apiUrl,
    context,
    receivedAt: Date.now(),
  });

  // Also update legacy credentials for backward compat
  if (serviceId === 'power-automate') {
    legacyCredentials = {
      token: payload.token,
      apiUrl: payload.apiUrl,
      envId: payload.envId,
      flowId: payload.flowId,
      receivedAt: Date.now(),
    };
  }
}

/** Get credentials for a specific service */
export function getServiceCredentials(serviceId: string): ServiceCredentials | null {
  return serviceCredentials.get(serviceId) || null;
}

/** Get all service IDs that have credentials */
export function getAuthenticatedServiceIds(): string[] {
  return Array.from(serviceCredentials.keys());
}

/** Legacy: get PA credentials (backward compat) */
export function getCredentials(): Credentials | null {
  // Try multi-service store first
  const pa = serviceCredentials.get('power-automate');
  if (pa) {
    return {
      token: pa.token,
      apiUrl: pa.apiUrl,
      envId: pa.context.envId || '',
      flowId: pa.context.flowId || '',
      receivedAt: pa.receivedAt,
    };
  }
  return legacyCredentials;
}

export function getStatus(): RelayStatus {
  const services = getAuthenticatedServiceIds();
  if (services.length === 0) {
    return { authenticated: false };
  }

  // Include legacy PA fields for backward compat
  const pa = serviceCredentials.get('power-automate');
  return {
    authenticated: true,
    services,
    envId: pa?.context.envId,
    flowId: pa?.context.flowId,
    receivedAt: pa?.receivedAt || serviceCredentials.values().next().value?.receivedAt,
  };
}

export function clearCredentials(): void {
  serviceCredentials.clear();
  legacyCredentials = null;
}

/** Remote credential fetch used by the MCP server */
export async function fetchCredentialsFromRelay(
  relayUrl: string,
  serviceId?: string
): Promise<Credentials | null> {
  const url = serviceId
    ? `${relayUrl}/api/credentials?serviceId=${encodeURIComponent(serviceId)}`
    : `${relayUrl}/api/credentials`;

  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { authenticated: boolean; credentials?: Credentials };
  if (!data.authenticated) {
    return null;
  }
  return data.credentials ?? null;
}
