import { ServiceModule } from '../../core/modules/ServiceModule.interface';
import { ModuleRegistry } from '../../core/modules/ModuleRegistry';
import { PA_URL_PATTERNS, PA_HOST_PERMISSIONS, extractPAContext } from './urlPatterns';
import { PowerAutomateClient } from './api/PowerAutomateClient';

/**
 * Power Automate module definition (background-safe).
 * Does NOT import any React components.
 * Routes must be registered separately via registerPARoutes() in the frontend.
 */
const PowerAutomateModule: ServiceModule = {
  id: 'power-automate',
  name: 'Power Automate',
  icon: 'Activity',
  navOrder: 10,
  urlPatterns: PA_URL_PATTERNS,
  hostPermissions: PA_HOST_PERMISSIONS,
  extractContext: extractPAContext,
  routes: [],
  navItems: [
    { id: 'editor', label: 'Flow Editor', path: '/' },
    { id: 'failures', label: 'Previous Runs', path: '/failures' },
  ],
  createApiClient: (creds) => new PowerAutomateClient(creds),
};

// Auto-register on import
ModuleRegistry.register(PowerAutomateModule);

export default PowerAutomateModule;
