import { ServiceModule } from '../../core/modules/ServiceModule.interface';
import { ModuleRegistry } from '../../core/modules/ModuleRegistry';
import { FormsClient } from './api/FormsClient';

/**
 * Extract context from Microsoft Forms request URLs.
 * Forms API uses forms.office.com and forms.microsoft.com domains.
 * Attempts to extract form ID from URL path if present.
 */
function extractFormsContext(
  url: string,
  _headers?: chrome.webRequest.HttpHeader[]
) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === 'forms.office.com' || parsedUrl.hostname === 'forms.microsoft.com') {
      const ids: Record<string, string> = {};

      // Try to extract form ID from URL path
      // Common patterns: /formapi/api/forms/{formId} or /pages/designpagev2.aspx?id={formId}
      const formIdMatch = parsedUrl.pathname.match(/\/forms\/([^/]+)/);
      if (formIdMatch) {
        ids.formId = formIdMatch[1];
      } else {
        // Try query parameter
        const formIdParam = parsedUrl.searchParams.get('id');
        if (formIdParam) {
          ids.formId = formIdParam;
        }
      }

      return {
        serviceId: 'forms',
        apiUrl: 'https://forms.office.com',
        ids,
      };
    }
  } catch {
    // Invalid URL, return null
  }
  return null;
}

/**
 * Microsoft Forms module definition (background-safe).
 * Does NOT import any React components.
 * Routes must be registered separately via registerFormsRoutes() in the frontend.
 */
const FormsModule: ServiceModule = {
  id: 'forms',
  name: 'Microsoft Forms',
  icon: 'ClipboardList',
  navOrder: 50,
  urlPatterns: [
    { pattern: 'https://forms.office.com/*' },
    { pattern: 'https://forms.microsoft.com/*' },
  ],
  hostPermissions: [
    'https://forms.office.com/',
    'https://forms.microsoft.com/',
  ],
  extractContext: extractFormsContext,
  routes: [],
  navItems: [
    { id: 'editor', label: 'Form Editor', path: '/forms' },
    { id: 'responses', label: 'Responses', path: '/forms/responses' },
  ],
  createApiClient: (creds) => new FormsClient(creds),
};

// Auto-register on import
ModuleRegistry.register(FormsModule);

export default FormsModule;
