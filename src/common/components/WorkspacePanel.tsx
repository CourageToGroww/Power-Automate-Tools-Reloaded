import React, { useState, useRef } from 'react';
import { useWorkspace } from '../providers/WorkspaceContext';
import { cn } from '../../lib/utils';
import {
  Camera,
  Download,
  Upload,
  Plus,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  FolderOpen,
} from 'lucide-react';

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const WorkspacePanel: React.FC = () => {
  const {
    activeWorkspace,
    workspaces,
    snapshots,
    snapshotInProgress,
    createWorkspace,
    loadWorkspace,
    renameWorkspace,
    deleteWorkspace,
    takeSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    exportToFile,
    importFromFile,
    exportSnapshotToFile,
  } = useWorkspace();

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [showLoad, setShowLoad] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [snapshotsExpanded, setSnapshotsExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await createWorkspace(name);
    setNewName('');
    setShowNew(false);
  };

  const handleRename = async () => {
    const name = editName.trim();
    if (!name) return;
    await renameWorkspace(name);
    setEditing(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importFromFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const workspaceSnapshots = snapshots.filter(
    (s) => s.workspaceId === activeWorkspace?.id
  );

  return (
    <div className="border-t dark:border-gray-800">
      <div className="px-3 py-2 border-b dark:border-gray-800">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Workspace
        </span>
      </div>

      <div className="px-3 py-2 space-y-2">
        {/* Active workspace header */}
        {activeWorkspace ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              {editing ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename();
                      if (e.key === 'Escape') setEditing(false);
                    }}
                    className="flex-1 min-w-0 text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:bg-gray-800"
                    autoFocus
                  />
                  <button
                    onClick={handleRename}
                    className="p-0.5 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                    title="Save"
                  >
                    <Check className="w-3 h-3 text-green-600" />
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                    title="Cancel"
                  >
                    <X className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-xs font-medium truncate flex-1 min-w-0">
                    {activeWorkspace.name}
                  </span>
                  <button
                    onClick={() => {
                      setEditName(activeWorkspace.name);
                      setEditing(true);
                    }}
                    className="p-0.5 hover:bg-muted rounded shrink-0"
                    title="Rename"
                  >
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                </>
              )}
            </div>

            <div className="text-[10px] text-muted-foreground">
              {activeWorkspace.dataSources.length} sources,{' '}
              {activeWorkspace.exportedData.length} exports
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={takeSnapshot}
                disabled={snapshotInProgress}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors',
                  'bg-primary/10 hover:bg-primary/20 text-primary',
                  snapshotInProgress && 'opacity-50 cursor-not-allowed'
                )}
                title="Take a snapshot (re-fetches all data)"
              >
                {snapshotInProgress ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
                <span className="hidden lg:inline">
                  {snapshotInProgress ? 'Snapshotting...' : 'Snapshot'}
                </span>
              </button>

              <button
                onClick={exportToFile}
                className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-muted hover:bg-muted/80 transition-colors"
                title="Save workspace to file"
              >
                <Download className="w-3 h-3" />
                <span className="hidden lg:inline">Save</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-muted hover:bg-muted/80 transition-colors"
                title="Import workspace from file"
              >
                <Upload className="w-3 h-3" />
                <span className="hidden lg:inline">Import</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-2">
            No workspace active
          </div>
        )}

        {/* New / Load buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => { setShowNew(!showNew); setShowLoad(false); }}
            className={cn(
              'flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors flex-1 justify-center',
              showNew ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            )}
          >
            <Plus className="w-3 h-3" />
            New
          </button>
          <button
            onClick={() => { setShowLoad(!showLoad); setShowNew(false); }}
            className={cn(
              'flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors flex-1 justify-center',
              showLoad ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            )}
          >
            <FolderOpen className="w-3 h-3" />
            Load
          </button>
        </div>

        {/* New workspace form */}
        {showNew && (
          <div className="flex gap-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="Workspace name"
              className="flex-1 min-w-0 text-xs px-2 py-1 border rounded dark:border-gray-600 dark:bg-gray-800"
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-2 py-1 text-[10px] bg-primary text-primary-foreground rounded disabled:opacity-50"
            >
              Create
            </button>
          </div>
        )}

        {/* Load workspace list */}
        {showLoad && workspaces.length > 0 && (
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className={cn(
                  'flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer transition-colors',
                  ws.id === activeWorkspace?.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
              >
                <button
                  onClick={() => { loadWorkspace(ws.id); setShowLoad(false); }}
                  className="flex-1 text-left truncate min-w-0"
                >
                  {ws.name}
                </button>
                {ws.id !== activeWorkspace?.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteWorkspace(ws.id); }}
                    className="p-0.5 hover:bg-destructive/10 rounded shrink-0 ml-1"
                    title="Delete workspace"
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {showLoad && workspaces.length === 0 && (
          <div className="text-[10px] text-muted-foreground text-center py-1">
            No saved workspaces
          </div>
        )}

        {/* Snapshots section */}
        {activeWorkspace && workspaceSnapshots.length > 0 && (
          <div>
            <button
              onClick={() => setSnapshotsExpanded(!snapshotsExpanded)}
              className="flex items-center gap-1 w-full text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-1"
            >
              {snapshotsExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              Snapshots ({workspaceSnapshots.length})
            </button>

            {snapshotsExpanded && (
              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                {workspaceSnapshots
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((snap) => (
                    <div
                      key={snap.id}
                      className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted text-[10px] group"
                    >
                      <span className="flex-1 truncate min-w-0 text-muted-foreground">
                        {formatTimestamp(snap.timestamp)}
                      </span>
                      <button
                        onClick={() => restoreSnapshot(snap.id)}
                        className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-primary/10 rounded transition-opacity shrink-0"
                        title="Restore snapshot"
                      >
                        <RotateCcw className="w-3 h-3 text-primary" />
                      </button>
                      <button
                        onClick={() => exportSnapshotToFile(snap.id)}
                        className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted/80 rounded transition-opacity shrink-0"
                        title="Download snapshot"
                      >
                        <Download className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => deleteSnapshot(snap.id)}
                        className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded transition-opacity shrink-0"
                        title="Delete snapshot"
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
};
