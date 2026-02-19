import * as http from 'http';
import { URL } from 'url';
import { authStore, ServiceType } from './auth-store';

interface CredentialUpdate {
  service: ServiceType;
  token: string;
  apiUrl: string;
  context: Record<string, any>;
}

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res: http.ServerResponse, status: number, data: any): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function startRelay(port: number = 8321): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    // CORS headers for local extension
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (req.method === 'POST' && url.pathname === '/api/credentials') {
        const data: CredentialUpdate = await parseBody(req);

        if (!data.service || !data.token || !data.apiUrl) {
          sendJSON(res, 400, { error: 'Missing required fields: service, token, apiUrl' });
          return;
        }

        authStore.set(data.service, data.token, data.apiUrl, data.context || {});
        sendJSON(res, 200, { ok: true, message: `Credentials stored for ${data.service}` });

      } else if (req.method === 'GET' && url.pathname === '/api/credentials') {
        const service = url.searchParams.get('service') as ServiceType | null;

        if (!service) {
          sendJSON(res, 400, { error: 'Missing service parameter' });
          return;
        }

        const cred = authStore.get(service);
        if (!cred) {
          sendJSON(res, 404, { error: `No credentials found for service: ${service}` });
          return;
        }

        sendJSON(res, 200, cred);

      } else if (req.method === 'GET' && url.pathname === '/api/status') {
        sendJSON(res, 200, { ok: true, services: authStore.getStatus() });

      } else {
        sendJSON(res, 404, { error: 'Not found' });
      }
    } catch (err: any) {
      console.error('Relay error:', err);
      sendJSON(res, 500, { error: err.message || 'Internal server error' });
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.error(`M365 Workbench relay server listening on http://127.0.0.1:${port}`);
  });

  return server;
}
