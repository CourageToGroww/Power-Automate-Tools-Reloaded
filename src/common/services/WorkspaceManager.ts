import { Workspace, WorkspaceSnapshot, WorkspaceSource } from '../types/workspace';

const WORKSPACE_KEY = 'workbench_workspaces';
const SNAPSHOT_KEY = 'workbench_snapshots';
const ACTIVE_KEY = 'workbench_active_workspace';

export class WorkspaceManager {
  static async getActiveWorkspace(): Promise<Workspace | null> {
    const result = await chrome.storage.local.get(ACTIVE_KEY);
    return result[ACTIVE_KEY] || null;
  }

  static async setActiveWorkspace(workspace: Workspace): Promise<void> {
    await chrome.storage.local.set({ [ACTIVE_KEY]: workspace });
  }

  static async createWorkspace(name: string): Promise<Workspace> {
    const workspace: Workspace = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dataSources: [],
      exportedData: [],
    };
    await this.saveWorkspace(workspace);
    await this.setActiveWorkspace(workspace);
    return workspace;
  }

  static async saveWorkspace(workspace: Workspace): Promise<void> {
    workspace.updatedAt = Date.now();
    const all = await this.listWorkspaces();
    const idx = all.findIndex(w => w.id === workspace.id);
    if (idx >= 0) all[idx] = workspace;
    else all.push(workspace);
    await chrome.storage.local.set({ [WORKSPACE_KEY]: all });
  }

  static async listWorkspaces(): Promise<Workspace[]> {
    const result = await chrome.storage.local.get(WORKSPACE_KEY);
    return result[WORKSPACE_KEY] || [];
  }

  static async deleteWorkspace(id: string): Promise<void> {
    const all = await this.listWorkspaces();
    await chrome.storage.local.set({ [WORKSPACE_KEY]: all.filter(w => w.id !== id) });
  }

  static async addExportData(workspaceId: string, source: WorkspaceSource): Promise<void> {
    const all = await this.listWorkspaces();
    const ws = all.find(w => w.id === workspaceId);
    if (!ws) return;
    // Replace if same actionId + context combo exists
    const key = `${source.actionId}:${JSON.stringify(source.context)}`;
    ws.exportedData = ws.exportedData.filter(s =>
      `${s.actionId}:${JSON.stringify(s.context)}` !== key
    );
    ws.exportedData.push(source);
    ws.updatedAt = Date.now();
    await chrome.storage.local.set({ [WORKSPACE_KEY]: all });
    const active = await this.getActiveWorkspace();
    if (active?.id === workspaceId) {
      await this.setActiveWorkspace(ws);
    }
  }

  static async createSnapshot(workspaceId: string): Promise<WorkspaceSnapshot> {
    const all = await this.listWorkspaces();
    const ws = all.find(w => w.id === workspaceId);
    if (!ws) throw new Error('Workspace not found');
    const snapshot: WorkspaceSnapshot = {
      id: crypto.randomUUID(),
      workspaceId: ws.id,
      workspaceName: ws.name,
      timestamp: Date.now(),
      workspace: JSON.parse(JSON.stringify(ws)),
    };
    const snapshots = await this.listSnapshots();
    snapshots.push(snapshot);
    await chrome.storage.local.set({ [SNAPSHOT_KEY]: snapshots });
    return snapshot;
  }

  static async listSnapshots(): Promise<WorkspaceSnapshot[]> {
    const result = await chrome.storage.local.get(SNAPSHOT_KEY);
    return result[SNAPSHOT_KEY] || [];
  }

  static async getSnapshot(snapshotId: string): Promise<WorkspaceSnapshot | null> {
    const all = await this.listSnapshots();
    return all.find(s => s.id === snapshotId) || null;
  }

  static async restoreSnapshot(snapshotId: string): Promise<Workspace> {
    const snapshot = await this.getSnapshot(snapshotId);
    if (!snapshot) throw new Error('Snapshot not found');
    const restored = { ...snapshot.workspace, updatedAt: Date.now() };
    await this.saveWorkspace(restored);
    await this.setActiveWorkspace(restored);
    return restored;
  }

  static async deleteSnapshot(snapshotId: string): Promise<void> {
    const all = await this.listSnapshots();
    await chrome.storage.local.set({ [SNAPSHOT_KEY]: all.filter(s => s.id !== snapshotId) });
  }

  static exportToFile(workspace: Workspace): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${workspace.name.replace(/[^a-zA-Z0-9\-_]/g, '_')}_${timestamp}.json`;
    const json = JSON.stringify(workspace, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  static async importFromFile(file: File): Promise<Workspace> {
    const text = await file.text();
    const ws: Workspace = JSON.parse(text);
    if (!ws.id || !ws.name || !Array.isArray(ws.dataSources) || !Array.isArray(ws.exportedData)) {
      throw new Error('Invalid workspace file');
    }
    ws.updatedAt = Date.now();
    await this.saveWorkspace(ws);
    await this.setActiveWorkspace(ws);
    return ws;
  }

  static exportSnapshotToFile(snapshot: WorkspaceSnapshot): void {
    const timestamp = new Date(snapshot.timestamp).toISOString().replace(/[:.]/g, '-');
    const filename = `snapshot_${snapshot.workspaceName.replace(/[^a-zA-Z0-9\-_]/g, '_')}_${timestamp}.json`;
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
