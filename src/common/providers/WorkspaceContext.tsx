import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Workspace, WorkspaceSnapshot, WorkspaceSource } from '../types/workspace';
import { WorkspaceManager } from '../services/WorkspaceManager';
import { getActionById } from '../types/exportActions';

interface WorkspaceContextValue {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  snapshots: WorkspaceSnapshot[];
  snapshotInProgress: boolean;
  createWorkspace: (name: string) => Promise<Workspace>;
  loadWorkspace: (id: string) => Promise<void>;
  renameWorkspace: (name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  saveExportData: (actionId: string, data: any, context: Record<string, string>) => Promise<void>;
  takeSnapshot: () => Promise<void>;
  restoreSnapshot: (snapshotId: string) => Promise<void>;
  deleteSnapshot: (snapshotId: string) => Promise<void>;
  exportToFile: () => void;
  importFromFile: (file: File) => Promise<void>;
  exportSnapshotToFile: (snapshotId: string) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({} as WorkspaceContextValue);

export const useWorkspace = () => useContext(WorkspaceContext);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [snapshots, setSnapshots] = useState<WorkspaceSnapshot[]>([]);
  const [snapshotInProgress, setSnapshotInProgress] = useState(false);

  const refreshWorkspaces = useCallback(async () => {
    const [ws, snaps, active] = await Promise.all([
      WorkspaceManager.listWorkspaces(),
      WorkspaceManager.listSnapshots(),
      WorkspaceManager.getActiveWorkspace(),
    ]);
    setWorkspaces(ws);
    setSnapshots(snaps);
    setActiveWorkspace(active);
  }, []);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const createWorkspace = useCallback(async (name: string) => {
    const ws = await WorkspaceManager.createWorkspace(name);
    await refreshWorkspaces();
    return ws;
  }, [refreshWorkspaces]);

  const loadWorkspace = useCallback(async (id: string) => {
    const all = await WorkspaceManager.listWorkspaces();
    const ws = all.find(w => w.id === id);
    if (ws) {
      await WorkspaceManager.setActiveWorkspace(ws);
      setActiveWorkspace(ws);
    }
  }, []);

  const renameWorkspace = useCallback(async (name: string) => {
    if (!activeWorkspace) return;
    activeWorkspace.name = name;
    await WorkspaceManager.saveWorkspace(activeWorkspace);
    await WorkspaceManager.setActiveWorkspace(activeWorkspace);
    setActiveWorkspace({ ...activeWorkspace });
    await refreshWorkspaces();
  }, [activeWorkspace, refreshWorkspaces]);

  const deleteWorkspace = useCallback(async (id: string) => {
    await WorkspaceManager.deleteWorkspace(id);
    if (activeWorkspace?.id === id) {
      setActiveWorkspace(null);
    }
    await refreshWorkspaces();
  }, [activeWorkspace, refreshWorkspaces]);

  const saveExportData = useCallback(async (actionId: string, data: any, context: Record<string, string>) => {
    if (!activeWorkspace) return;
    const action = getActionById(actionId);
    const source: WorkspaceSource = {
      id: crypto.randomUUID(),
      actionId,
      serviceType: action?.serviceType || 'unknown',
      label: action?.label || actionId,
      data,
      capturedAt: Date.now(),
      context,
    };
    await WorkspaceManager.addExportData(activeWorkspace.id, source);
    await refreshWorkspaces();
  }, [activeWorkspace, refreshWorkspaces]);

  const takeSnapshot = useCallback(async () => {
    if (!activeWorkspace) return;
    setSnapshotInProgress(true);
    try {
      const sourceContexts = activeWorkspace.dataSources.map(ds => ({
        serviceType: ds.serviceType,
        context: ds.context,
      }));

      if (sourceContexts.length === 0) {
        // No data sources to snapshot - just create a snapshot of current state
        await WorkspaceManager.createSnapshot(activeWorkspace.id);
        await refreshWorkspaces();
        return;
      }

      const response: any = await chrome.runtime.sendMessage({
        type: 'export-all-workspace',
        sourceContexts,
      });

      const exportedData: WorkspaceSource[] = (response.results || [])
        .filter((r: any) => r.data && !r.error)
        .map((r: any) => {
          const action = getActionById(r.actionId);
          return {
            id: crypto.randomUUID(),
            actionId: r.actionId,
            serviceType: action?.serviceType || 'unknown',
            label: action?.label || r.actionId,
            data: r.data,
            capturedAt: Date.now(),
            context: sourceContexts.find(sc => sc.serviceType === action?.serviceType)?.context || {},
          };
        });

      activeWorkspace.exportedData = exportedData;
      await WorkspaceManager.saveWorkspace(activeWorkspace);
      await WorkspaceManager.createSnapshot(activeWorkspace.id);
      await refreshWorkspaces();
    } finally {
      setSnapshotInProgress(false);
    }
  }, [activeWorkspace, refreshWorkspaces]);

  const restoreSnapshot = useCallback(async (snapshotId: string) => {
    const ws = await WorkspaceManager.restoreSnapshot(snapshotId);
    setActiveWorkspace(ws);
    await refreshWorkspaces();
  }, [refreshWorkspaces]);

  const deleteSnapshot = useCallback(async (snapshotId: string) => {
    await WorkspaceManager.deleteSnapshot(snapshotId);
    await refreshWorkspaces();
  }, [refreshWorkspaces]);

  const exportToFile = useCallback(() => {
    if (!activeWorkspace) return;
    WorkspaceManager.exportToFile(activeWorkspace);
  }, [activeWorkspace]);

  const importFromFile = useCallback(async (file: File) => {
    const ws = await WorkspaceManager.importFromFile(file);
    setActiveWorkspace(ws);
    await refreshWorkspaces();
  }, [refreshWorkspaces]);

  const exportSnapshotToFile = useCallback((snapshotId: string) => {
    const snap = snapshots.find(s => s.id === snapshotId);
    if (snap) {
      WorkspaceManager.exportSnapshotToFile(snap);
    }
  }, [snapshots]);

  return (
    <WorkspaceContext.Provider value={{
      activeWorkspace,
      workspaces,
      snapshots,
      snapshotInProgress,
      createWorkspace,
      loadWorkspace,
      renameWorkspace,
      deleteWorkspace,
      saveExportData,
      takeSnapshot,
      restoreSnapshot,
      deleteSnapshot,
      exportToFile,
      importFromFile,
      exportSnapshotToFile,
      refreshWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};
