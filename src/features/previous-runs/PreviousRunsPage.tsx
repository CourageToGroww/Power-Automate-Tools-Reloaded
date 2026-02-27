import React, { useState } from 'react';
import { usePreviousRuns } from './usePreviousRuns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { FlowRunEditor } from './components/FlowRunEditor';
import { ChevronRight, Clock, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FlowFailure } from './types';

export const PreviousRunsPage: React.FC = () => {
  const [selectedRun, setSelectedRun] = useState<FlowFailure | null>(null);
  const {
    isLoading,
    isLoadingDetails,
    failures: runs,
    selectedRunDetails,
    loadStatus,
    selectFailure: selectRun,
    refreshFailures: refreshRuns,
    messages,
    onDismissed,
  } = usePreviousRuns();

  const handleRunClick = (run: FlowFailure) => {
    setSelectedRun(run);
    selectRun(run);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Succeeded':
        return <Badge variant="success">Succeeded</Badge>;
      case 'Failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'Running':
        return <Badge variant="warning">Running</Badge>;
      case 'Cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Succeeded':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'Running':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'Cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (selectedRun) {
    if (isLoadingDetails) {
      return (
        <div className="h-full flex items-center justify-center bg-background">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-lg">Loading run details...</p>
          </div>
        </div>
      );
    }
    
    if (selectedRunDetails) {
      return (
        <FlowRunEditor
          run={selectedRun}
          runDetails={selectedRunDetails}
          onBack={() => {
            setSelectedRun(null);
          }}
        />
      );
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Previous Runs</h1>
            <p className="text-muted-foreground mt-1">
              View and analyze your flow execution history
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={refreshRuns} disabled={isLoading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Run List */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {loadStatus.state !== 'ready' ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                {loadStatus.state === 'waiting-auth' ? (
                  <RefreshCw className="w-12 h-12 text-muted-foreground mb-4 animate-spin" />
                ) : (
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                )}
                <p className="text-lg font-medium text-muted-foreground">
                  {loadStatus.message}
                </p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : runs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No runs found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This flow hasn't been executed yet
                </p>
              </CardContent>
            </Card>
          ) : (
            runs.map((run) => (
              <Card
                key={run.runId}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                onClick={() => handleRunClick(run)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(run.status)}
                      <div>
                        <CardTitle className="text-lg">Run {run.runId}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(run.startTime)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(run.status)}
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Duration:</span>{' '}
                      <span className="font-medium">
                        {run.endTime
                          ? `${Math.round(
                              (new Date(run.endTime).getTime() -
                                new Date(run.startTime).getTime()) /
                                1000
                            )}s`
                          : 'Running...'}
                      </span>
                    </div>
                    {run.failedActions.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Failed Actions:</span>{' '}
                        <span className="font-medium text-destructive">
                          {run.failedActions.length}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Tracking ID:</span>{' '}
                      <span className="font-mono text-xs">{run.clientTrackingId}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};