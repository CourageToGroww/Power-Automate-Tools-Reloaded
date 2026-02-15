import * as http from 'http';
import {
  storeCredentials,
  getCredentials,
  getStatus,
  getServiceCredentials,
  getAuthenticatedServiceIds,
} from './auth-store';
import { AuthPayload } from './types';

const MAX_BODY_SIZE = 1024 * 1024; // 1MB

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  data: unknown
): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      body += chunk.toString();
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function isValidAuthPayload(data: unknown): data is AuthPayload {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.token === 'string' &&
    obj.token.length > 0 &&
    typeof obj.apiUrl === 'string' &&
    obj.apiUrl.length > 0
  );
}

function parseUrl(reqUrl: string | undefined): { pathname: string; searchParams: URLSearchParams } {
  try {
    const parsed = new URL(reqUrl || '/', 'http://localhost');
    return { pathname: parsed.pathname, searchParams: parsed.searchParams };
  } catch {
    return { pathname: reqUrl || '/', searchParams: new URLSearchParams() };
  }
}

export function createRelayServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    // CORS headers for extension requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const { pathname, searchParams } = parseUrl(req.url);

    // POST /api/auth - Extension sends credentials
    if (pathname === '/api/auth' && req.method === 'POST') {
      try {
        const body = await readBody(req);
        const data = parseJson(body);

        if (!isValidAuthPayload(data)) {
          sendJson(res, 400, { error: 'Invalid auth payload. Required: token, apiUrl' });
          return;
        }

        // Ensure backward compat: if no serviceId, default fields from PA payload
        const payload = data as AuthPayload;
        if (!payload.serviceId) {
          // Legacy PA payload - need envId and flowId
          if (!payload.envId || !payload.flowId) {
            sendJson(res, 400, { error: 'Invalid auth payload. PA payloads require envId and flowId.' });
            return;
          }
        }

        storeCredentials(payload);
        const serviceId = payload.serviceId || 'power-automate';
        console.log(
          `[relay] Credentials received for service=${serviceId}` +
            (payload.envId ? ` env=${payload.envId}` : '') +
            (payload.flowId ? ` flow=${payload.flowId}` : '')
        );
        sendJson(res, 200, { ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal error';
        sendJson(res, 500, { error: message });
      }
      return;
    }

    // GET /api/status - Health check (no secrets)
    if (pathname === '/api/status' && req.method === 'GET') {
      sendJson(res, 200, getStatus());
      return;
    }

    // GET /api/credentials - MCP server fetches credentials (localhost only)
    // Supports ?serviceId=X for specific service
    if (pathname === '/api/credentials' && req.method === 'GET') {
      const serviceId = searchParams.get('serviceId');

      if (serviceId) {
        // Return credentials for specific service
        const creds = getServiceCredentials(serviceId);
        if (!creds) {
          sendJson(res, 200, { authenticated: false, serviceId });
        } else {
          // Convert to legacy format for backward compat with MCP tools
          sendJson(res, 200, {
            authenticated: true,
            serviceId,
            credentials: {
              token: creds.token,
              apiUrl: creds.apiUrl,
              envId: creds.context.envId || '',
              flowId: creds.context.flowId || '',
              context: creds.context,
              receivedAt: creds.receivedAt,
            },
          });
        }
      } else {
        // Legacy: return PA credentials
        const creds = getCredentials();
        if (!creds) {
          sendJson(res, 200, { authenticated: false });
        } else {
          sendJson(res, 200, { authenticated: true, credentials: creds });
        }
      }
      return;
    }

    // GET /api/services - List authenticated services
    if (pathname === '/api/services' && req.method === 'GET') {
      sendJson(res, 200, { services: getAuthenticatedServiceIds() });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  });

  return server;
}
