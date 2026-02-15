import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchCredentialsFromRelay } from '../auth-store';
import { GraphClient } from '../clients/GraphClient';
import { SharePointClient } from '../clients/SharePointClient';
import { IntuneClient } from '../clients/IntuneClient';
import { FormsClient } from '../clients/FormsClient';
import { PowerAutomateClient } from '../power-automate-client';

const RELAY_URL = process.env.PA_RELAY_URL || 'http://127.0.0.1:8321';

interface StoredScript {
  id: string;
  name: string;
  description: string;
  code: string;
  createdAt: number;
  updatedAt: number;
}

const scriptStore = new Map<string, StoredScript>();

function generateId(): string {
  return `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function getClientContext(): Promise<{
  graph?: GraphClient;
  sharepoint?: SharePointClient;
  intune?: IntuneClient;
  forms?: FormsClient;
  pa?: PowerAutomateClient;
}> {
  const context: {
    graph?: GraphClient;
    sharepoint?: SharePointClient;
    intune?: IntuneClient;
    forms?: FormsClient;
    pa?: PowerAutomateClient;
  } = {};

  // Try to get credentials for each service
  try {
    let creds = await fetchCredentialsFromRelay(RELAY_URL, 'graph');
    if (!creds) {
      creds = await fetchCredentialsFromRelay(RELAY_URL, 'power-automate');
    }
    if (creds) {
      context.graph = new GraphClient(creds);
    }
  } catch {
    // Graph not available
  }

  try {
    let creds = await fetchCredentialsFromRelay(RELAY_URL, 'sharepoint');
    if (!creds) {
      creds = await fetchCredentialsFromRelay(RELAY_URL, 'power-automate');
    }
    if (creds) {
      context.sharepoint = new SharePointClient(creds);
    }
  } catch {
    // SharePoint not available
  }

  try {
    let creds = await fetchCredentialsFromRelay(RELAY_URL, 'intune');
    if (!creds) {
      creds = await fetchCredentialsFromRelay(RELAY_URL, 'power-automate');
    }
    if (creds) {
      context.intune = new IntuneClient(creds);
    }
  } catch {
    // Intune not available
  }

  try {
    let creds = await fetchCredentialsFromRelay(RELAY_URL, 'forms');
    if (!creds) {
      creds = await fetchCredentialsFromRelay(RELAY_URL, 'power-automate');
    }
    if (creds) {
      context.forms = new FormsClient(creds);
    }
  } catch {
    // Forms not available
  }

  try {
    const creds = await fetchCredentialsFromRelay(RELAY_URL, 'power-automate');
    if (creds) {
      context.pa = new PowerAutomateClient(creds);
    }
  } catch {
    // Power Automate not available
  }

  return context;
}

async function executeScript(
  code: string,
  timeout: number = 30000
): Promise<{ output: unknown; logs: string[] }> {
  const logs: string[] = [];
  const context = await getClientContext();

  const captureConsole = {
    log: (...args: unknown[]) => {
      logs.push(args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    },
  };

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Script execution timeout (30 seconds)'));
    }, timeout);

    try {
      const scriptFunc = new Function(
        'graph',
        'sharepoint',
        'intune',
        'forms',
        'pa',
        'console',
        `return (async () => { ${code} })();`
      );

      const result = scriptFunc(
        context.graph,
        context.sharepoint,
        context.intune,
        context.forms,
        context.pa,
        captureConsole
      );

      if (result && typeof result.then === 'function') {
        result
          .then((output: unknown) => {
            clearTimeout(timer);
            resolve({ output, logs });
          })
          .catch((err: Error) => {
            clearTimeout(timer);
            reject(err);
          });
      } else {
        clearTimeout(timer);
        resolve({ output: result, logs });
      }
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
}

export function registerToolboxTools(server: McpServer): void {
  // toolbox__list_scripts - List all stored scripts
  server.tool(
    'toolbox__list_scripts',
    'List all stored scripts in the toolbox',
    {},
    async () => {
      try {
        const scripts = Array.from(scriptStore.values()).map(script => ({
          id: script.id,
          name: script.name,
          description: script.description,
          updatedAt: script.updatedAt,
        }));

        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(scripts, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Toolbox error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  // toolbox__save_script - Save or update a script
  server.tool(
    'toolbox__save_script',
    'Save or update a script in the toolbox',
    {
      name: z.string().describe('Name of the script'),
      code: z.string().describe('JavaScript code to execute'),
      description: z.string().optional().describe('Optional description of the script'),
      id: z.string().optional().describe('Optional ID for updating an existing script'),
    },
    async ({ name, code, description, id }) => {
      try {
        const scriptId = id || generateId();
        const now = Date.now();
        const existing = scriptStore.get(scriptId);

        const script: StoredScript = {
          id: scriptId,
          name,
          code,
          description: description || '',
          createdAt: existing?.createdAt || now,
          updatedAt: now,
        };

        scriptStore.set(scriptId, script);

        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(script, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Toolbox error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  // toolbox__get_script - Get a script by ID
  server.tool(
    'toolbox__get_script',
    'Get a script by ID including its code',
    {
      id: z.string().describe('Script ID'),
    },
    async ({ id }) => {
      try {
        const script = scriptStore.get(id);
        if (!script) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Script not found: ${id}`,
              },
            ],
          };
        }

        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(script, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Toolbox error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  // toolbox__delete_script - Delete a script
  server.tool(
    'toolbox__delete_script',
    'Delete a script from the toolbox',
    {
      id: z.string().describe('Script ID to delete'),
    },
    async ({ id }) => {
      try {
        const existed = scriptStore.has(id);
        scriptStore.delete(id);

        return {
          content: [
            {
              type: 'text' as const,
              text: existed
                ? `Script ${id} deleted successfully`
                : `Script ${id} not found`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Toolbox error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  // toolbox__execute_script - Execute a script
  server.tool(
    'toolbox__execute_script',
    'Execute a saved script or ad-hoc code with access to authenticated API clients',
    {
      scriptId: z
        .string()
        .optional()
        .describe('ID of a saved script to execute'),
      code: z
        .string()
        .optional()
        .describe('Ad-hoc JavaScript code to execute'),
    },
    async ({ scriptId, code }) => {
      try {
        if (!scriptId && !code) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Either scriptId or code must be provided',
              },
            ],
          };
        }

        let scriptCode = code;
        if (scriptId) {
          const script = scriptStore.get(scriptId);
          if (!script) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Script not found: ${scriptId}`,
                },
              ],
            };
          }
          scriptCode = script.code;
        }

        if (!scriptCode) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No code to execute',
              },
            ],
          };
        }

        const { output, logs } = await executeScript(scriptCode);

        const result = {
          output,
          logs,
          availableClients: {
            graph: await fetchCredentialsFromRelay(RELAY_URL, 'graph').then(c => !!c).catch(() => false),
            sharepoint: await fetchCredentialsFromRelay(RELAY_URL, 'sharepoint').then(c => !!c).catch(() => false),
            intune: await fetchCredentialsFromRelay(RELAY_URL, 'intune').then(c => !!c).catch(() => false),
            forms: await fetchCredentialsFromRelay(RELAY_URL, 'forms').then(c => !!c).catch(() => false),
            pa: await fetchCredentialsFromRelay(RELAY_URL, 'power-automate').then(c => !!c).catch(() => false),
          },
        };

        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Script execution error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );
}
