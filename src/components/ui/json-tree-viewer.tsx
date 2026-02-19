import React, { useState, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, Copy, ChevronsDownUp, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

interface JsonTreeViewerProps {
  data: unknown;
  defaultExpanded?: number;
  className?: string;
  onCopy?: (path: string, value: unknown) => void;
}

interface TreeNodeProps {
  keyName: string | number | null;
  value: unknown;
  path: string;
  depth: number;
  defaultExpanded: number;
  expandAll: boolean | null;
  searchTerm: string;
  onCopy?: (path: string, value: unknown) => void;
}

function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function isArray(val: unknown): val is unknown[] {
  return Array.isArray(val);
}

function matchesSearch(value: unknown, term: string): boolean {
  if (!term) return true;
  const lower = term.toLowerCase();

  if (value === null) return 'null'.includes(lower);
  if (value === undefined) return 'undefined'.includes(lower);

  if (typeof value === 'string') return value.toLowerCase().includes(lower);
  if (typeof value === 'number') return String(value).includes(lower);
  if (typeof value === 'boolean') return String(value).includes(lower);

  if (isArray(value)) {
    return value.some(item => matchesSearch(item, term));
  }

  if (isObject(value)) {
    return Object.entries(value).some(
      ([k, v]) => k.toLowerCase().includes(lower) || matchesSearch(v, term)
    );
  }

  return false;
}

function getValuePreview(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    if (value.length > 60) return `"${value.substring(0, 57)}..."`;
    return `"${value}"`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isArray(value)) return `Array(${value.length})`;
  if (isObject(value)) {
    const keys = Object.keys(value);
    return `{${keys.length} ${keys.length === 1 ? 'key' : 'keys'}}`;
  }
  return String(value);
}

function getValueColorClass(value: unknown): string {
  if (value === null || value === undefined) return 'text-gray-400 dark:text-gray-500';
  if (typeof value === 'string') return 'text-green-600 dark:text-green-400';
  if (typeof value === 'number') return 'text-blue-600 dark:text-blue-400';
  if (typeof value === 'boolean') return 'text-purple-600 dark:text-purple-400';
  return 'text-foreground';
}

function copyToClipboard(text: string): void {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback: do nothing on failure
    });
  }
}

const TreeNode: React.FC<TreeNodeProps> = ({
  keyName,
  value,
  path,
  depth,
  defaultExpanded,
  expandAll,
  searchTerm,
  onCopy,
}) => {
  const isExpandable = isObject(value) || isArray(value);
  const [isExpanded, setIsExpanded] = useState(depth < defaultExpanded);
  const [copied, setCopied] = useState(false);

  // Override local state when expandAll changes
  const effectiveExpanded = expandAll !== null ? expandAll : isExpanded;

  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const serialized = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    copyToClipboard(serialized);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    if (onCopy) onCopy(path, value);
  }, [value, path, onCopy]);

  // Filter out non-matching nodes when searching
  if (searchTerm && !matchesSearch(value, searchTerm)) {
    if (keyName !== null && String(keyName).toLowerCase().includes(searchTerm.toLowerCase())) {
      // Key matches even if value doesn't -- show it
    } else {
      return null;
    }
  }

  const indent = depth * 16;

  if (!isExpandable) {
    return (
      <div
        className="group flex items-center py-0.5 hover:bg-muted/50 rounded-sm transition-colors"
        style={{ paddingLeft: `${indent + 20}px` }}
      >
        {keyName !== null && (
          <span className="text-foreground font-medium mr-1 shrink-0">
            {typeof keyName === 'number' ? `${keyName}` : `"${keyName}"`}
            <span className="text-muted-foreground">: </span>
          </span>
        )}
        <span className={cn('break-all', getValueColorClass(value))}>
          {getValuePreview(value)}
        </span>
        <button
          onClick={handleCopy}
          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted shrink-0"
          title="Copy value"
        >
          <Copy className="w-3 h-3 text-muted-foreground" />
        </button>
        {copied && (
          <span className="ml-1 text-xs text-green-600 dark:text-green-400 shrink-0">
            Copied
          </span>
        )}
      </div>
    );
  }

  const entries = isArray(value)
    ? value.map((item, i) => [i, item] as [number, unknown])
    : Object.entries(value as Record<string, unknown>);

  const collapsedLabel = isArray(value)
    ? `Array(${value.length})`
    : `{${Object.keys(value as Record<string, unknown>).length} ${Object.keys(value as Record<string, unknown>).length === 1 ? 'key' : 'keys'}}`;

  return (
    <div>
      <div
        className="group flex items-center py-0.5 hover:bg-muted/50 rounded-sm transition-colors cursor-pointer"
        style={{ paddingLeft: `${indent}px` }}
        onClick={handleToggle}
      >
        <span className="shrink-0 w-5 flex items-center justify-center">
          {effectiveExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </span>
        {keyName !== null && (
          <span className="text-foreground font-medium mr-1 shrink-0">
            {typeof keyName === 'number' ? `${keyName}` : `"${keyName}"`}
            <span className="text-muted-foreground">: </span>
          </span>
        )}
        {!effectiveExpanded && (
          <span className="text-muted-foreground text-sm truncate">
            {collapsedLabel}
          </span>
        )}
        {effectiveExpanded && (
          <span className="text-muted-foreground text-sm">
            {isArray(value) ? '[' : '{'}
          </span>
        )}
        <button
          onClick={handleCopy}
          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted shrink-0"
          title="Copy value"
        >
          <Copy className="w-3 h-3 text-muted-foreground" />
        </button>
        {copied && (
          <span className="ml-1 text-xs text-green-600 dark:text-green-400 shrink-0">
            Copied
          </span>
        )}
      </div>
      {effectiveExpanded && (
        <>
          {entries.map(([key, val]) => (
            <TreeNode
              key={String(key)}
              keyName={key}
              value={val}
              path={path ? `${path}.${key}` : String(key)}
              depth={depth + 1}
              defaultExpanded={defaultExpanded}
              expandAll={expandAll}
              searchTerm={searchTerm}
              onCopy={onCopy}
            />
          ))}
          <div
            className="text-muted-foreground text-sm py-0.5"
            style={{ paddingLeft: `${indent + 20}px` }}
          >
            {isArray(value) ? ']' : '}'}
          </div>
        </>
      )}
    </div>
  );
};

export const JsonTreeViewer: React.FC<JsonTreeViewerProps> = ({
  data,
  defaultExpanded = 1,
  className,
  onCopy,
}) => {
  const [expandAll, setExpandAll] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleExpandAll = useCallback(() => {
    setExpandAll(true);
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpandAll(false);
  }, []);

  const handleCopyAll = useCallback(() => {
    const serialized = JSON.stringify(data, null, 2);
    copyToClipboard(serialized);
  }, [data]);

  const isEmpty = useMemo(() => {
    if (data === null || data === undefined) return true;
    if (isArray(data) && data.length === 0) return true;
    if (isObject(data) && Object.keys(data).length === 0) return true;
    return false;
  }, [data]);

  if (isEmpty) {
    return (
      <div className={cn('p-4 text-sm text-muted-foreground', className)}>
        {data === null ? 'null' : data === undefined ? 'undefined' : 'Empty'}
      </div>
    );
  }

  return (
    <div className={cn('border rounded-md bg-card text-card-foreground', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 border-b bg-muted/30">
        <div className="relative flex-1 min-w-[120px] max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter..."
            className="w-full pl-7 pr-2 py-1 text-xs bg-background border rounded-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExpandAll}
            className="h-7 px-2 text-xs"
            title="Expand all"
          >
            <ChevronsUpDown className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Expand</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCollapseAll}
            className="h-7 px-2 text-xs"
            title="Collapse all"
          >
            <ChevronsDownUp className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Collapse</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyAll}
            className="h-7 px-2 text-xs"
            title="Copy all"
          >
            <Copy className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Copy</span>
          </Button>
        </div>
      </div>

      {/* Tree content */}
      <div className="p-2 text-xs font-mono overflow-auto max-h-[600px]">
        <TreeNode
          keyName={null}
          value={data}
          path=""
          depth={0}
          defaultExpanded={defaultExpanded}
          expandAll={expandAll}
          searchTerm={searchTerm}
          onCopy={onCopy}
        />
      </div>
    </div>
  );
};
