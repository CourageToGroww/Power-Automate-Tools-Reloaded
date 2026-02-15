import { ComponentType } from 'react';

/** Credentials stored per-service */
export interface ServiceCredentials {
  token: string;
  apiUrl: string;
  context: Record<string, string>;
  receivedAt: number;
  expiresAt?: Date;
}

/** Context extracted from an intercepted request URL */
export interface ServiceContext {
  serviceId: string;
  apiUrl: string;
  ids: Record<string, string>;
}

/** Pattern for webRequest.onBeforeSendHeaders URL matching */
export interface UrlPattern {
  /** Chrome webRequest URL pattern, e.g. "https://*.api.flow.microsoft.com/*" */
  pattern: string;
}

/** Route definition for a module */
export interface RouteDefinition {
  /** Path relative to module root, e.g. "/" or "/failures" */
  path: string;
  /** React component to render */
  element: ComponentType;
  /** If true, this is the index route */
  index?: boolean;
}

/** Navigation item for a module */
export interface NavItem {
  id: string;
  label: string;
  path: string;
}

/** API client interface that modules implement */
export interface ServiceApiClient {
  get(url: string): Promise<unknown>;
  patch(url: string, data: unknown): Promise<unknown>;
  post(url: string, data: unknown): Promise<unknown>;
}

/** The main module interface every service must implement */
export interface ServiceModule {
  /** Unique ID, e.g. 'power-automate', 'sharepoint' */
  id: string;
  /** Display name for the tab/UI */
  name: string;
  /** Lucide icon name */
  icon: string;
  /** Tab ordering (lower = further left) */
  navOrder: number;
  /** URL patterns for webRequest token interception */
  urlPatterns: UrlPattern[];
  /** manifest.json host_permissions needed by this module */
  hostPermissions: string[];
  /** Extract service context (IDs) from an intercepted request URL + headers */
  extractContext(
    url: string,
    headers?: chrome.webRequest.HttpHeader[]
  ): ServiceContext | null;
  /** React Router routes this module provides */
  routes: RouteDefinition[];
  /** Sub-navigation items within this module */
  navItems: NavItem[];
  /** Create an API client given credentials */
  createApiClient(creds: ServiceCredentials): ServiceApiClient;
}
