import { ServiceModule } from '../../core/modules/ServiceModule.interface';
import { ModuleRegistry } from '../../core/modules/ModuleRegistry';
import { SharePointClient } from './api/SharePointClient';

// URL patterns that SharePoint uses - intercept REST API calls
// SharePoint REST API: https://*.sharepoint.com/_api/*
// SharePoint modern pages: https://*.sharepoint.com/sites/*/...
function extractSharePointContext(
  url: string,
  _headers?: chrome.webRequest.HttpHeader[]
) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.endsWith('.sharepoint.com')) {
      // Extract site URL from path (e.g., /sites/MySite)
      const siteMatch = parsedUrl.pathname.match(/^(\/sites\/[^/]+)/);
      const siteUrl = siteMatch ? siteMatch[1] : '';
      return {
        serviceId: 'sharepoint',
        apiUrl: `${parsedUrl.origin}${siteUrl}`,
        ids: {
          siteUrl: `${parsedUrl.origin}${siteUrl}`,
          ...(siteMatch ? { sitePath: siteMatch[1] } : {}),
        },
      };
    }
  } catch {
    // Invalid URL
  }
  return null;
}

const SharePointModule: ServiceModule = {
  id: 'sharepoint',
  name: 'SharePoint',
  icon: 'FileSpreadsheet',
  navOrder: 30,
  urlPatterns: [
    { pattern: 'https://*.sharepoint.com/_api/*' },
    { pattern: 'https://*.sharepoint.com/_vti_bin/*' },
    { pattern: 'https://*.sharepoint.com/sites/*/_api/*' },
  ],
  hostPermissions: [
    'https://*.sharepoint.com/',
  ],
  extractContext: extractSharePointContext,
  routes: [],
  navItems: [
    { id: 'lists', label: 'Lists', path: '/sharepoint' },
    { id: 'formatting', label: 'Column Formatting', path: '/sharepoint/formatting' },
    { id: 'permissions', label: 'Permissions', path: '/sharepoint/permissions' },
  ],
  createApiClient: (creds) => new SharePointClient(creds),
};

ModuleRegistry.register(SharePointModule);
export default SharePointModule;
