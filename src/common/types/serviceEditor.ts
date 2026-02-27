/**
 * Universal Service Editor type definitions.
 * Plugin-style architecture: each service defines tabs as config entries.
 * Adding a new feature = adding an entry to the tabs array.
 */

export interface ServiceContext {
  /** The service API client with get/post/patch/delete */
  client: {
    get: (endpoint: string) => Promise<unknown>;
    post: (endpoint: string, data: unknown) => Promise<unknown>;
    patch: (endpoint: string, data: unknown) => Promise<unknown>;
  };
  /** SharePoint base URL, e.g. https://tenant.sharepoint.com/sites/SiteName */
  siteUrl?: string;
  /** SharePoint list GUID */
  listId?: string;
  /** SharePoint list display name */
  listName?: string;
  /** Power Automate environment ID */
  envId?: string;
  /** Power Automate flow ID */
  flowId?: string;
  /** Intune device ID */
  deviceId?: string;
  /** Forms form ID */
  formId?: string;
  /** Tenant ID */
  tenantId?: string;
  /** User ID (for Forms) */
  userId?: string;
  /** Any additional context */
  [key: string]: unknown;
}

export interface SaveResult {
  success: boolean;
  message: string;
  /** Updated data after save (if the API returns it) */
  updatedData?: unknown;
  /** Per-item results for batch operations */
  itemResults?: Array<{ id: string; success: boolean; error?: string }>;
}

export interface EditorTabConfig {
  /** Unique tab ID */
  id: string;
  /** Display label */
  label: string;
  /** Short description shown below tab */
  description: string;
  /** Service this tab belongs to */
  service: string;
  /** Fetch data from the service */
  fetchData: (context: ServiceContext) => Promise<unknown>;
  /** Save modified data back to the service. Null = read-only tab. */
  saveData: ((context: ServiceContext, original: unknown, modified: unknown) => Promise<SaveResult>) | null;
  /** Whether this tab is read-only */
  readOnly?: boolean;
  /** Required context keys - tab is disabled if any are missing */
  requiresContext?: string[];
}

export interface ServiceEditorConfig {
  /** Service type identifier */
  serviceType: string;
  /** Display label */
  label: string;
  /** All available editor tabs for this service */
  tabs: EditorTabConfig[];
}
