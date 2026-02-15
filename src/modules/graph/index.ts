import { ServiceModule } from '../../core/modules/ServiceModule.interface';
import { ModuleRegistry } from '../../core/modules/ModuleRegistry';
import { GraphClient } from './api/GraphClient';

/**
 * Extract context from Microsoft Graph API request URLs.
 * Graph API does not require environment/flow-style IDs,
 * so we return an empty ids map with the base API URL.
 */
function extractGraphContext(
  url: string,
  _headers?: chrome.webRequest.HttpHeader[]
) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === 'graph.microsoft.com') {
      return {
        serviceId: 'graph',
        apiUrl: 'https://graph.microsoft.com/v1.0',
        ids: {},
      };
    }
  } catch {
    // Invalid URL, return null
  }
  return null;
}

/**
 * Graph Explorer module definition (background-safe).
 * Does NOT import any React components.
 * Routes must be registered separately via registerGraphRoutes() in the frontend.
 */
const GraphModule: ServiceModule = {
  id: 'graph',
  name: 'Graph Explorer',
  icon: 'Globe',
  navOrder: 20,
  urlPatterns: [
    { pattern: 'https://graph.microsoft.com/*' },
  ],
  hostPermissions: [
    'https://graph.microsoft.com/',
  ],
  extractContext: extractGraphContext,
  routes: [],
  navItems: [
    { id: 'explorer', label: 'Graph Explorer', path: '/graph' },
  ],
  createApiClient: (creds) => new GraphClient(creds),
};

// Auto-register on import
ModuleRegistry.register(GraphModule);

export default GraphModule;
