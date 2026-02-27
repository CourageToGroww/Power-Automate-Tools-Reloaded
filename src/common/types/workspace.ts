export interface WorkspaceSource {
  id: string;
  actionId: string;
  serviceType: string;
  label: string;
  data: any;
  capturedAt: number;
  context: Record<string, string>;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  dataSources: Array<{
    id: string;
    serviceType: string;
    label: string;
    context: Record<string, string>;
    sourceUrl: string;
    capturedAt: number;
  }>;
  exportedData: WorkspaceSource[];
}

export interface WorkspaceSnapshot {
  id: string;
  workspaceId: string;
  workspaceName: string;
  timestamp: number;
  workspace: Workspace;
}

export interface WorkspaceMetadata {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sourceCount: number;
  exportCount: number;
  snapshotCount: number;
}
