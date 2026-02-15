import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Radio, RadioTower } from 'lucide-react';
import { cn } from '../lib/utils';

type RelayStatus = 'off' | 'connected' | 'unreachable' | 'error';

const statusConfig: Record<RelayStatus, { color: string; label: string }> = {
  off: { color: 'text-muted-foreground', label: 'MCP relay off' },
  connected: { color: 'text-emerald-600 dark:text-emerald-400', label: 'MCP relay connected' },
  unreachable: { color: 'text-amber-600 dark:text-amber-400', label: 'MCP relay unreachable - start Docker container' },
  error: { color: 'text-red-600 dark:text-red-400', label: 'MCP relay error' },
};

export const RelayToggle: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<RelayStatus>('off');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial state from background script
    chrome.runtime.sendMessage(
      { type: 'get-relay-state' },
      (response) => {
        if (chrome.runtime.lastError) {
          setLoading(false);
          return;
        }
        if (response) {
          setEnabled(response.enabled);
          setStatus(response.enabled ? (response.status || 'off') : 'off');
        }
        setLoading(false);
      }
    );

    // Listen for state pushes from the background script
    const listener = (message: any) => {
      if (message.type === 'relay-state-changed') {
        setEnabled(message.enabled);
        setStatus(message.enabled ? (message.status || 'off') : 'off');
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const toggle = () => {
    const next = !enabled;
    // Optimistically update UI
    setEnabled(next);
    setStatus(next ? 'off' : 'off');

    chrome.runtime.sendMessage(
      { type: 'toggle-relay', enabled: next },
      (response) => {
        if (chrome.runtime.lastError) return;
        if (response) {
          setEnabled(response.enabled);
          setStatus(response.enabled ? (response.status || 'off') : 'off');
        }
      }
    );
  };

  if (loading) return null;

  const cfg = statusConfig[enabled ? status : 'off'];

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className={cn('h-8 gap-1.5 text-xs font-normal', cfg.color)}
      title={cfg.label}
    >
      {enabled ? (
        <RadioTower className="h-3.5 w-3.5" />
      ) : (
        <Radio className="h-3.5 w-3.5" />
      )}
      <span>MCP</span>
      {enabled && status === 'connected' && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      )}
      {enabled && status === 'unreachable' && (
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
      )}
    </Button>
  );
};
