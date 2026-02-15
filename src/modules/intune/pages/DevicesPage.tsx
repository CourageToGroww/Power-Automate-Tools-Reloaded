import React, { useState, useEffect, useCallback } from 'react';
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

interface ManagedDevice {
  id: string;
  deviceName: string;
  operatingSystem: string;
  osVersion: string;
  complianceState: string;
  lastSyncDateTime: string;
  userPrincipalName: string;
  managedDeviceOwnerType?: string;
  enrolledDateTime?: string;
  model?: string;
  manufacturer?: string;
}

interface GraphResponse {
  value: ManagedDevice[];
}

/**
 * Devices page showing all Intune-managed devices.
 * Displays device details including compliance status.
 */
export const DevicesPage: React.FC = () => {
  const intuneApi = useServiceApi('intune');

  const [devices, setDevices] = useState<ManagedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);

  const isConnected = intuneApi !== null && intuneApi.isApiReady;

  const fetchDevices = useCallback(async () => {
    if (!intuneApi) {
      setError(
        'Intune API is not connected. Navigate to the Intune portal so the extension can capture an auth token.'
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await intuneApi.get('/deviceManagement/managedDevices') as GraphResponse;
      setDevices(result.value || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [intuneApi]);

  useEffect(() => {
    if (isConnected) {
      fetchDevices();
    }
  }, [isConnected, fetchDevices]);

  const getComplianceVariant = (state: string): 'success' | 'destructive' | 'default' | 'secondary' => {
    switch (state?.toLowerCase()) {
      case 'compliant':
        return 'success';
      case 'noncompliant':
        return 'destructive';
      case 'ingraceperiod':
        return 'secondary';
      case 'configmanager':
      case 'unknown':
      default:
        return 'default';
    }
  };

  const formatDateTime = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const toggleExpandDevice = (deviceId: string) => {
    setExpandedDeviceId(expandedDeviceId === deviceId ? null : deviceId);
  };

  return (
    <div className="flex flex-col gap-4 p-4 w-full max-w-full">
      {/* Connection status */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'success' : 'destructive'}>
            {isConnected ? 'Connected' : 'Not Connected'}
          </Badge>
          {!isConnected && (
            <span className="text-sm text-muted-foreground">
              Visit the Intune portal to capture auth credentials
            </span>
          )}
        </div>
        {isConnected && (
          <Button
            onClick={fetchDevices}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive font-medium">Error</p>
            <p className="text-sm text-destructive/90 mt-1 break-words">
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Devices list */}
      {isConnected && !error && (
        <Card>
          <CardHeader>
            <CardTitle>Managed Devices</CardTitle>
            <CardDescription>
              {devices.length} device{devices.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && devices.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Loading devices...
              </div>
            ) : devices.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No devices found
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Mobile: Cards, Desktop: Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-2 px-2 font-medium">Device Name</th>
                        <th className="pb-2 px-2 font-medium">OS</th>
                        <th className="pb-2 px-2 font-medium">Version</th>
                        <th className="pb-2 px-2 font-medium">Compliance</th>
                        <th className="pb-2 px-2 font-medium">Last Sync</th>
                        <th className="pb-2 px-2 font-medium">User</th>
                        <th className="pb-2 px-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map((device) => (
                        <React.Fragment key={device.id}>
                          <tr className="border-b hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-2 font-medium">
                              {device.deviceName || 'Unknown'}
                            </td>
                            <td className="py-3 px-2">
                              {device.operatingSystem || 'N/A'}
                            </td>
                            <td className="py-3 px-2">
                              {device.osVersion || 'N/A'}
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant={getComplianceVariant(device.complianceState)}>
                                {device.complianceState || 'Unknown'}
                              </Badge>
                            </td>
                            <td className="py-3 px-2 text-xs text-muted-foreground">
                              {formatDateTime(device.lastSyncDateTime)}
                            </td>
                            <td className="py-3 px-2 text-xs">
                              {device.userPrincipalName || 'N/A'}
                            </td>
                            <td className="py-3 px-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpandDevice(device.id)}
                              >
                                {expandedDeviceId === device.id ? 'Hide' : 'Details'}
                              </Button>
                            </td>
                          </tr>
                          {expandedDeviceId === device.id && (
                            <tr className="bg-muted/30">
                              <td colSpan={7} className="py-4 px-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="font-medium">Device ID:</span>
                                    <span className="ml-2 text-muted-foreground font-mono text-xs">
                                      {device.id}
                                    </span>
                                  </div>
                                  {device.manufacturer && (
                                    <div>
                                      <span className="font-medium">Manufacturer:</span>
                                      <span className="ml-2 text-muted-foreground">
                                        {device.manufacturer}
                                      </span>
                                    </div>
                                  )}
                                  {device.model && (
                                    <div>
                                      <span className="font-medium">Model:</span>
                                      <span className="ml-2 text-muted-foreground">
                                        {device.model}
                                      </span>
                                    </div>
                                  )}
                                  {device.enrolledDateTime && (
                                    <div>
                                      <span className="font-medium">Enrolled:</span>
                                      <span className="ml-2 text-muted-foreground text-xs">
                                        {formatDateTime(device.enrolledDateTime)}
                                      </span>
                                    </div>
                                  )}
                                  {device.managedDeviceOwnerType && (
                                    <div>
                                      <span className="font-medium">Owner Type:</span>
                                      <span className="ml-2 text-muted-foreground">
                                        {device.managedDeviceOwnerType}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile view: cards */}
                <div className="lg:hidden flex flex-col gap-3">
                  {devices.map((device) => (
                    <Card key={device.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">
                            {device.deviceName || 'Unknown'}
                          </CardTitle>
                          <Badge variant={getComplianceVariant(device.complianceState)}>
                            {device.complianceState || 'Unknown'}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {device.operatingSystem || 'N/A'} {device.osVersion || ''}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-xs">User:</span>
                          <span className="text-xs">{device.userPrincipalName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-xs">Last Sync:</span>
                          <span className="text-xs">{formatDateTime(device.lastSyncDateTime)}</span>
                        </div>
                        {expandedDeviceId === device.id && (
                          <div className="pt-2 border-t space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground text-xs">Device ID:</span>
                              <span className="text-xs font-mono break-all">{device.id}</span>
                            </div>
                            {device.manufacturer && (
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs">Manufacturer:</span>
                                <span className="text-xs">{device.manufacturer}</span>
                              </div>
                            )}
                            {device.model && (
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs">Model:</span>
                                <span className="text-xs">{device.model}</span>
                              </div>
                            )}
                            {device.enrolledDateTime && (
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs">Enrolled:</span>
                                <span className="text-xs">{formatDateTime(device.enrolledDateTime)}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => toggleExpandDevice(device.id)}
                        >
                          {expandedDeviceId === device.id ? 'Hide Details' : 'Show Details'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
