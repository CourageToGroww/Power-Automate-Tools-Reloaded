import React, { useState } from 'react';
import { getActionsForService, ExportAction } from '../types/exportActions';

interface ExportActionsProps {
  serviceType: string;
  context: Record<string, string>;
  onExportComplete?: (actionId: string, data: any) => void;
}

export const ExportActions: React.FC<ExportActionsProps> = ({
  serviceType,
  context,
  onExportComplete,
}) => {
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { data: any; error?: string }>>({});

  const actions = getActionsForService(serviceType).filter(action =>
    !action.requiresContext || action.requiresContext.every(k => context[k])
  );

  if (actions.length === 0) return null;

  const runExport = async (action: ExportAction) => {
    setRunning(action.id);
    try {
      const response: any = await chrome.runtime.sendMessage({
        type: 'execute-export',
        actionId: action.id,
        context,
      });
      setResults(prev => ({ ...prev, [action.id]: { data: response.data, error: response.error } }));
      if (response.data && !response.error) {
        const json = JSON.stringify(response.data, null, 2);
        await navigator.clipboard.writeText(json);
        onExportComplete?.(action.id, response.data);
      }
    } catch (err: any) {
      setResults(prev => ({ ...prev, [action.id]: { data: null, error: err.message } }));
    } finally {
      setRunning(null);
    }
  };

  const downloadResult = (action: ExportAction) => {
    const result = results[action.id];
    if (!result?.data) return;
    const json = JSON.stringify(result.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${action.id}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="export-actions-panel">
      <h3 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        Export Data
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.map(action => {
          const result = results[action.id];
          const isRunning = running === action.id;
          return (
            <div key={action.id} className="border rounded-lg p-3 dark:border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{action.label}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => runExport(action)}
                    disabled={isRunning}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isRunning ? 'Running...' : 'Export'}
                  </button>
                  {result?.data && (
                    <button
                      onClick={() => downloadResult(action)}
                      className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
                    >
                      Save
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500">{action.description}</p>
              {result?.error && (
                <p className="text-xs text-red-500 mt-1">{result.error}</p>
              )}
              {result?.data && !result.error && (
                <p className="text-xs text-green-600 mt-1">
                  Exported {Array.isArray(result.data) ? `${result.data.length} items` : '1 item'} - copied to clipboard
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
