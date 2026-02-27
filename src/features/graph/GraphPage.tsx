import React, { useMemo } from 'react';
import { useServiceApi } from '../../common/providers/MultiServiceApiProvider';
import { ServiceEditor } from '../../common/components/ServiceEditor';
import { GRAPH_TABS } from './graphEditorConfig';
import type { ServiceContext } from '../../common/types/serviceEditor';
import { Card, CardContent } from '../../components/ui/card';
import { Unplug } from 'lucide-react';

const NotConnected: React.FC = () => (
  <div className="h-full flex items-center justify-center p-6">
    <Card className="max-w-md w-full">
      <CardContent className="flex flex-col items-center text-center py-12 px-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Unplug className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Graph Not Connected</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Connect to Microsoft Graph by visiting any Microsoft 365 service in your browser.
          The extension will capture your authentication automatically.
        </p>
      </CardContent>
    </Card>
  </div>
);

export const GraphPage: React.FC = () => {
  const client = useServiceApi('graph');

  const editorContext = useMemo<ServiceContext>(() => ({
    client,
  }), [client]);

  if (!client.isReady) {
    return <NotConnected />;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-4 py-3 border-b shrink-0">
        <h1 className="text-lg font-semibold">Microsoft Graph</h1>
        <p className="text-xs text-muted-foreground">
          Users, groups, teams, mail rules, calendar, and more
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <ServiceEditor
          tabs={GRAPH_TABS}
          context={editorContext}
        />
      </div>
    </div>
  );
};
