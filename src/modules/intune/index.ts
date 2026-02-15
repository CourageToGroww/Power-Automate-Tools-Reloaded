import { ServiceModule } from '../../core/modules/ServiceModule.interface';
import { ModuleRegistry } from '../../core/modules/ModuleRegistry';
import { IntuneClient } from './api/IntuneClient';

/**
 * Extract context from Intune portal request URLs.
 * Intune uses Microsoft Graph API under the hood for deviceManagement endpoints.
 */
function extractIntuneContext(
  url: string,
  _headers?: chrome.webRequest.HttpHeader[]
) {
  try {
    const parsedUrl = new URL(url);
    // Match Intune portal domains
    if (
      parsedUrl.hostname === 'intune.microsoft.com' ||
      parsedUrl.hostname.endsWith('.manage.microsoft.com')
    ) {
      return {
        serviceId: 'intune',
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
 * Intune module definition (background-safe).
 * Does NOT import any React components.
 * Routes must be registered separately via registerIntuneRoutes() in the frontend.
 */
const IntuneModule: ServiceModule = {
  id: 'intune',
  name: 'Intune',
  icon: 'Monitor',
  navOrder: 40,
  urlPatterns: [
    { pattern: 'https://intune.microsoft.com/*' },
    { pattern: 'https://*.manage.microsoft.com/*' },
  ],
  hostPermissions: [
    'https://intune.microsoft.com/',
    'https://*.manage.microsoft.com/',
  ],
  extractContext: extractIntuneContext,
  routes: [],
  navItems: [
    { id: 'devices', label: 'Devices', path: '/intune' },
    { id: 'policies', label: 'Policies', path: '/intune/policies' },
  ],
  createApiClient: (creds) => new IntuneClient(creds),
};

// Auto-register on import
ModuleRegistry.register(IntuneModule);

export default IntuneModule;
