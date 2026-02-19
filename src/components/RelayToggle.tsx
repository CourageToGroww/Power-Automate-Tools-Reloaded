import React, { useState } from 'react';
import { useMultiServiceApi } from '../common/providers/MultiServiceApiProvider';

export const RelayToggle: React.FC = () => {
  const { relayStatus, toggleRelay } = useMultiServiceApi();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await toggleRelay(!relayStatus.connected);
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = relayStatus.connected
    ? `Connected (${relayStatus.transport})`
    : 'Disconnected';

  const statusColor = relayStatus.connected ? 'bg-green-500' : 'bg-gray-400';

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border dark:border-gray-700 hover:bg-muted transition-colors disabled:opacity-50"
      title={`MCP Relay: ${statusLabel}`}
    >
      <span className={`w-2 h-2 rounded-full ${statusColor}`} />
      <span className="hidden sm:inline">MCP</span>
      <span className="font-mono text-muted-foreground">{statusLabel}</span>
    </button>
  );
};
