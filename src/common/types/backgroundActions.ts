import { ServiceType, ServiceContext } from '../services/ServiceDetector';
import type { DataSource } from './dataSource';

export interface RefreshInitiator {
  type: 'refresh';
}

export interface AppLoaded {
  type: 'app-loaded';
}

export interface TokenChanged {
  type: 'token-changed';
  token: string;
  apiUrl: string;
}

export interface AIApiCall {
  type: 'ai-api-call';
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

// --- Multi-service actions ---

export interface ServiceDetected {
  type: 'service-detected';
  service: ServiceType;
  context: ServiceContext;
}

export interface ServiceTokenChanged {
  type: 'service-token-changed';
  service: ServiceType;
  token: string;
  apiUrl: string;
  context: ServiceContext;
}

export interface GetServiceData {
  type: 'get-service-data';
  service: ServiceType;
  endpoint: string;
}

export interface ServiceDataResponse {
  type: 'service-data-response';
  data: unknown;
  error?: string;
}

export interface GetServiceStatus {
  type: 'get-service-status';
}

export interface ServiceStatusResponse {
  type: 'service-status-response';
  services: Record<string, { hasToken: boolean; expired: boolean }>;
}

export interface RelayToggle {
  type: 'relay-toggle';
  enabled: boolean;
}

export interface RelayStatus {
  type: 'relay-status';
  connected: boolean;
  transport: 'native' | 'http' | 'none';
}

export interface CaptureSource {
  type: 'capture-source';
  source: DataSource;
}

export interface FlowDefinitionCaptured {
  type: 'flow-definition-captured';
  envId: string;
  flowId: string;
  flowData: any;
}

export interface GetCachedFlow {
  type: 'get-cached-flow';
  envId: string;
  flowId: string;
}

export interface CachedFlowResponse {
  type: 'cached-flow-response';
  flowData: any | null;
  envId?: string;
  flowId?: string;
}

export interface GetAllCachedFlows {
  type: 'get-all-cached-flows';
}

export interface AllCachedFlowsResponse {
  type: 'all-cached-flows-response';
  flows: Array<{ envId: string; flowId: string; displayName: string; capturedAt: number }>;
}

// --- Export actions ---

export interface ExecuteExportAction {
  type: 'execute-export';
  actionId: string;
  context: Record<string, string>;
}

export interface ExportActionResult {
  type: 'export-action-result';
  actionId: string;
  data: any;
  error?: string;
}

export interface ExportAllForWorkspace {
  type: 'export-all-workspace';
  sourceContexts: Array<{ serviceType: string; context: Record<string, string> }>;
}

export interface ExportAllResult {
  type: 'export-all-result';
  results: Array<{ actionId: string; data: any; error?: string }>;
}

export type Actions =
  | RefreshInitiator
  | TokenChanged
  | AppLoaded
  | AIApiCall
  | ServiceDetected
  | ServiceTokenChanged
  | GetServiceData
  | ServiceDataResponse
  | GetServiceStatus
  | ServiceStatusResponse
  | RelayToggle
  | RelayStatus
  | CaptureSource
  | FlowDefinitionCaptured
  | GetCachedFlow
  | CachedFlowResponse
  | GetAllCachedFlows
  | AllCachedFlowsResponse
  | ExecuteExportAction
  | ExportActionResult
  | ExportAllForWorkspace
  | ExportAllResult;
