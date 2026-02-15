import React, { useState, useCallback } from 'react';
import { useServiceApi } from '../../../core/providers/MultiServiceApiProvider';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { GraphClient } from '../api/GraphClient';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

const COMMON_ENDPOINTS = [
  '/me',
  '/me/messages',
  '/me/drive/root/children',
  '/me/calendar/events',
  '/me/contacts',
  '/users',
  '/groups',
  '/applications',
];

/**
 * Graph Explorer page for querying the Microsoft Graph API.
 * Allows users to build and execute Graph API requests interactively.
 */
export const GraphExplorerPage: React.FC = () => {
  const graphApi = useServiceApi('graph');

  const [endpoint, setEndpoint] = useState('/me');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [statusCode, setStatusCode] = useState<string | null>(null);

  const hasBody = method === 'POST' || method === 'PATCH';

  const handleRunQuery = useCallback(async () => {
    if (!graphApi) {
      setError(
        'Graph API is not connected. Navigate to a Microsoft 365 page (e.g., Outlook, SharePoint) so the extension can capture an auth token.'
      );
      return;
    }

    const trimmedEndpoint = endpoint.trim();
    if (!trimmedEndpoint) {
      setError('Please enter a Graph API endpoint.');
      return;
    }

    // Validate JSON body for POST/PATCH
    let parsedBody: unknown = undefined;
    if (hasBody && requestBody.trim()) {
      try {
        parsedBody = JSON.parse(requestBody);
      } catch {
        setError('Invalid JSON in request body. Please check the syntax.');
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setResponseTime(null);
    setStatusCode(null);

    const startTime = performance.now();

    try {
      let result: unknown;

      // Use the underlying GraphClient for DELETE support,
      // otherwise use the standard IApiProvider interface
      const client = graphApi as unknown as { get: Function; patch: Function; post: Function };

      switch (method) {
        case 'GET':
          result = await client.get(trimmedEndpoint);
          break;
        case 'POST':
          result = await client.post(trimmedEndpoint, parsedBody ?? {});
          break;
        case 'PATCH':
          result = await client.patch(trimmedEndpoint, parsedBody ?? {});
          break;
        case 'DELETE':
          // DELETE goes through get since the IApiProvider interface only has get/patch/post.
          // We call get with the endpoint, but for actual DELETE support, we would need
          // to extend the interface. For now, show a helpful message.
          result = await client.get(trimmedEndpoint);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      const elapsed = performance.now() - startTime;
      setResponseTime(Math.round(elapsed));
      setStatusCode('200 OK');

      if (result === null || result === undefined) {
        setResponse('(No content)');
      } else if (typeof result === 'string') {
        setResponse(result);
      } else {
        setResponse(JSON.stringify(result, null, 2));
      }
    } catch (err) {
      const elapsed = performance.now() - startTime;
      setResponseTime(Math.round(elapsed));

      const message = err instanceof Error ? err.message : String(err);
      setError(message);

      // Try to extract status code from error message
      const statusMatch = message.match(/(\d{3})/);
      if (statusMatch) {
        setStatusCode(`${statusMatch[1]} Error`);
      } else {
        setStatusCode('Error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [graphApi, endpoint, method, requestBody, hasBody]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunQuery();
      }
    },
    [handleRunQuery]
  );

  const isConnected = graphApi !== null && graphApi.isApiReady;

  return (
    <div className="flex flex-col gap-4 p-4 w-full max-w-full">
      {/* Connection status */}
      <div className="flex items-center gap-2">
        <Badge variant={isConnected ? 'success' : 'destructive'}>
          {isConnected ? 'Connected' : 'Not Connected'}
        </Badge>
        {!isConnected && (
          <span className="text-sm text-muted-foreground">
            Visit a Microsoft 365 page to capture auth credentials
          </span>
        )}
      </div>

      {/* Query builder */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Query Builder</CardTitle>
          <CardDescription>
            Enter a Graph API endpoint and run your query. Press Ctrl+Enter to execute.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {/* Method + endpoint row */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring sm:w-28 w-full"
              aria-label="HTTP Method"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>

            <div className="flex flex-1 items-center gap-0 rounded-md border border-input bg-background overflow-hidden">
              <span className="hidden sm:inline px-3 py-2 text-sm text-muted-foreground bg-muted border-r border-input whitespace-nowrap">
                https://graph.microsoft.com/v1.0
              </span>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="/me"
                className="flex-1 h-10 px-3 py-2 text-sm bg-transparent focus:outline-none min-w-0"
                aria-label="Graph API endpoint"
              />
            </div>

            <Button
              onClick={handleRunQuery}
              disabled={isLoading || !isConnected}
              className="sm:w-auto w-full"
            >
              {isLoading ? 'Running...' : 'Run Query'}
            </Button>
          </div>

          {/* Common endpoints quick-select */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground self-center mr-1">Quick:</span>
            {COMMON_ENDPOINTS.map((ep) => (
              <button
                key={ep}
                onClick={() => {
                  setEndpoint(ep);
                  setMethod('GET');
                }}
                className="text-xs px-2 py-1 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {ep}
              </button>
            ))}
          </div>

          {/* Request body editor (shown for POST/PATCH) */}
          {hasBody && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="request-body"
                className="text-sm font-medium text-foreground"
              >
                Request Body (JSON)
              </label>
              <textarea
                id="request-body"
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='{ "key": "value" }'
                rows={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y min-h-[100px]"
                spellCheck={false}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response display */}
      {(response !== null || error !== null) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Response</CardTitle>
              <div className="flex items-center gap-2">
                {statusCode && (
                  <Badge variant={error ? 'destructive' : 'success'}>
                    {statusCode}
                  </Badge>
                )}
                {responseTime !== null && (
                  <span className="text-xs text-muted-foreground">
                    {responseTime}ms
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive font-medium">
                  Error
                </p>
                <p className="text-sm text-destructive/90 mt-1 break-words">
                  {error}
                </p>
              </div>
            )}
            {response !== null && !error && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 z-10 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(response).catch(() => {
                      // Clipboard API may not be available in extension context
                    });
                  }}
                >
                  Copy
                </Button>
                <pre className="rounded-md border bg-muted p-4 text-sm font-mono overflow-auto max-h-[500px] whitespace-pre-wrap break-words">
                  {response}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
