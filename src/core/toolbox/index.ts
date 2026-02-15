import { ServiceModule } from '../modules/ServiceModule.interface';
import { ModuleRegistry } from '../modules/ModuleRegistry';

/**
 * Extract context for Toolbox module.
 * Since Toolbox doesn't intercept any URLs, this always returns null.
 */
function extractToolboxContext(
  _url: string,
  _headers?: chrome.webRequest.HttpHeader[]
) {
  return null;
}

/**
 * Toolbox module definition (background-safe).
 * Does NOT import any React components.
 * Routes must be registered separately via registerToolboxRoutes() in the frontend.
 */
const ToolboxModule: ServiceModule = {
  id: 'toolbox',
  name: 'Toolbox',
  icon: 'Wrench',
  navOrder: 100,
  urlPatterns: [],
  hostPermissions: [],
  extractContext: extractToolboxContext,
  routes: [],
  navItems: [
    { id: 'toolbox', label: 'Toolbox', path: '/toolbox' },
  ],
  createApiClient: () => ({
    get: () => Promise.reject(new Error('Toolbox has no API client')),
    patch: () => Promise.reject(new Error('Toolbox has no API client')),
    post: () => Promise.reject(new Error('Toolbox has no API client')),
  }),
};

// Auto-register on import
ModuleRegistry.register(ToolboxModule);

export default ToolboxModule;
