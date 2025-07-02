import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { FlowFailure, FlowRunDetails, FlowRunAction } from '../types';
import { ActionCard } from './ActionCard';
import { ArrowLeft, Copy, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface FlowRunEditorProps {
  run: FlowFailure;
  runDetails: FlowRunDetails;
  onBack: () => void;
}

export const FlowRunEditor: React.FC<FlowRunEditorProps> = ({
  run,
  runDetails,
  onBack,
}) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const copyFullJson = () => {
    const json = JSON.stringify(runDetails, null, 2);
    navigator.clipboard.writeText(json);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Succeeded':
        return <Badge variant="success">Succeeded</Badge>;
      case 'Failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'Skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      case 'Running':
        return <Badge variant="warning">Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Build action tree structure
  const buildActionTree = () => {
    const actions = runDetails.properties.actions || {};
    const trigger = runDetails.properties.trigger;
    
    // For now, we'll display actions in a linear flow
    // In a real implementation, you'd parse the flow definition to understand the tree structure
    const actionList: (FlowRunAction & { id: string })[] = [
      { ...trigger, id: 'trigger' },
      ...Object.entries(actions).map(([id, action]) => ({
        ...action,
        id,
      })),
    ];

    return actionList;
  };

  const actionTree = buildActionTree();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Flow Run Details</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Run ID: {run.runId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowJson(!showJson)}
            >
              {showJson ? (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Show Visual
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Show JSON
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyFullJson}
            >
              <Copy className="w-4 h-4 mr-2" />
              {copiedJson ? 'Copied!' : 'Copy JSON'}
            </Button>
            {getStatusBadge(run.status)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {/* Flow Visualization */}
        <div className="flex-1 overflow-hidden">
          {showJson ? (
            <ScrollArea className="h-full">
              <div className="p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Full Run JSON</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs overflow-x-auto">
                      <code>{JSON.stringify(runDetails, null, 2)}</code>
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-6">
                <div className="space-y-4">
                  {actionTree.map((action, index) => (
                    <div key={action.id}>
                      <ActionCard
                        action={action}
                        isSelected={selectedAction === action.id}
                        onClick={() => setSelectedAction(action.id)}
                        isTrigger={action.id === 'trigger'}
                      />
                      {index < actionTree.length - 1 && (
                        <div className="flex justify-center my-2">
                          <div className="w-0.5 h-8 bg-border" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Action Details Panel */}
        {selectedAction && !showJson && (
          <div className="w-96 border-l bg-card">
            <ScrollArea className="h-full">
              <div className="p-6">
                <ActionDetails
                  action={actionTree.find(a => a.id === selectedAction)!}
                  onClose={() => setSelectedAction(null)}
                />
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
};

interface ActionDetailsProps {
  action: FlowRunAction & { id: string };
  onClose: () => void;
}

const ActionDetails: React.FC<ActionDetailsProps> = ({ action, onClose }) => {
  const [editingJson, setEditingJson] = useState(false);
  const [jsonValue, setJsonValue] = useState(JSON.stringify(action, null, 2));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{action.name}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <XCircle className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Status</h3>
          {getStatusBadge(action.status)}
        </div>

        {action.startTime && (
          <div>
            <h3 className="text-sm font-medium mb-2">Timing</h3>
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Start:</span>{' '}
                {new Date(action.startTime).toLocaleString()}
              </div>
              {action.endTime && (
                <>
                  <div>
                    <span className="text-muted-foreground">End:</span>{' '}
                    {new Date(action.endTime).toLocaleString()}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>{' '}
                    {Math.round(
                      (new Date(action.endTime).getTime() -
                        new Date(action.startTime).getTime()) /
                        1000
                    )}s
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {action.error && (
          <div>
            <h3 className="text-sm font-medium mb-2 text-destructive">Error</h3>
            <Card className="border-destructive/50">
              <CardContent className="pt-4">
                <p className="text-sm font-mono">{action.error.code}</p>
                <p className="text-sm mt-2">{action.error.message}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Action JSON</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingJson(!editingJson)}
            >
              {editingJson ? 'View' : 'Edit'}
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              {editingJson ? (
                <textarea
                  className="w-full h-96 p-2 font-mono text-xs bg-background border rounded"
                  value={jsonValue}
                  onChange={(e) => setJsonValue(e.target.value)}
                />
              ) : (
                <pre className="text-xs overflow-x-auto">
                  <code>{jsonValue}</code>
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Succeeded':
      return <Badge variant="success">Succeeded</Badge>;
    case 'Failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'Skipped':
      return <Badge variant="secondary">Skipped</Badge>;
    case 'Running':
      return <Badge variant="warning">Running</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Add missing import
import { XCircle } from 'lucide-react';