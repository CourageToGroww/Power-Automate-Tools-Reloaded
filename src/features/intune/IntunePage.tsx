import React, { useState } from 'react';
import { useServiceApi } from '../../common/providers/MultiServiceApiProvider';
import { useDevices, useDevice, usePolicies, ManagedDevice } from './useIntune';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { JsonTreeViewer } from '../../components/ui/json-tree-viewer';
import { cn } from '../../lib/utils';
import {
  Monitor,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldQuestion,
  Unplug,
  ArrowLeft,
} from 'lucide-react';

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '--';
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null) return '--';
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function getComplianceBadge(state: ManagedDevice['complianceState']) {
  switch (state) {
    case 'compliant':
      return <Badge variant="success">Compliant</Badge>;
    case 'noncompliant':
      return <Badge variant="destructive">Non-Compliant</Badge>;
    case 'unknown':
      return <Badge variant="warning">Unknown</Badge>;
    case 'inGracePeriod':
      return <Badge variant="warning">Grace Period</Badge>;
    case 'conflict':
      return <Badge variant="destructive">Conflict</Badge>;
    case 'error':
      return <Badge variant="destructive">Error</Badge>;
    case 'configManager':
      return <Badge variant="secondary">Config Manager</Badge>;
    default:
      return <Badge variant="outline">{state}</Badge>;
  }
}

function getComplianceIcon(state: ManagedDevice['complianceState']) {
  switch (state) {
    case 'compliant':
      return <ShieldCheck className="w-4 h-4 text-green-500" />;
    case 'noncompliant':
      return <ShieldX className="w-4 h-4 text-red-500" />;
    case 'unknown':
    case 'inGracePeriod':
      return <ShieldQuestion className="w-4 h-4 text-yellow-500" />;
    default:
      return <Shield className="w-4 h-4 text-muted-foreground" />;
  }
}

const NotConnected: React.FC = () => (
  <div className="h-full flex items-center justify-center p-6">
    <Card className="max-w-md w-full">
      <CardContent className="flex flex-col items-center text-center py-12 px-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Unplug className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Intune Not Connected</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Connect to Intune by visiting the Intune portal or Endpoint Manager
          in your browser. The extension will capture your authentication automatically.
        </p>
      </CardContent>
    </Card>
  </div>
);

const ErrorMessage: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <Card className="border-destructive/50">
    <CardContent className="flex items-center gap-3 py-4">
      <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
      <p className="text-sm text-destructive flex-1">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </CardContent>
  </Card>
);

const LoadingSpinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-muted-foreground" />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  </div>
);

interface DeviceDetailViewProps {
  deviceId: string;
  deviceName: string;
  onBack: () => void;
}

const DeviceDetailView: React.FC<DeviceDetailViewProps> = ({ deviceId, deviceName, onBack }) => {
  const { device, isLoading, error, refetch } = useDevice(deviceId);

  if (isLoading) {
    return <LoadingSpinner label="Loading device details..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  if (!device) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Device not found.</p>
      </div>
    );
  }

  // Build a hardware info object for the JSON tree viewer
  const hardwareInfo: Record<string, unknown> = {
    model: device.model,
    manufacturer: device.manufacturer,
    serialNumber: device.serialNumber,
    operatingSystem: device.operatingSystem,
    osVersion: device.osVersion,
    totalStorage: formatBytes(device.totalStorageSpaceInBytes),
    freeStorage: formatBytes(device.freeStorageSpaceInBytes),
    physicalMemory: formatBytes(device.physicalMemoryInBytes),
    isEncrypted: device.isEncrypted,
    isSupervised: device.isSupervised,
    jailBroken: device.jailBroken,
    wiFiMacAddress: device.wiFiMacAddress,
    ethernetMacAddress: device.ethernetMacAddress,
    azureADRegistered: device.azureADRegistered,
    azureADDeviceId: device.azureADDeviceId,
    managementAgent: device.managementAgent,
    deviceRegistrationState: device.deviceRegistrationState,
    managedDeviceOwnerType: device.managedDeviceOwnerType,
    enrolledDateTime: device.enrolledDateTime,
    lastSyncDateTime: device.lastSyncDateTime,
    userPrincipalName: device.userPrincipalName,
    userDisplayName: device.userDisplayName,
  };

  // Remove undefined values for cleaner display
  const cleanedHardwareInfo = Object.fromEntries(
    Object.entries(hardwareInfo).filter(([_, v]) => v !== undefined && v !== null)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold truncate">{deviceName}</h2>
          <div className="flex items-center gap-2 mt-1">
            {getComplianceBadge(device.complianceState)}
            <span className="text-xs text-muted-foreground">
              {device.operatingSystem} {device.osVersion || ''}
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} className="shrink-0">
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Device info summary cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">User</p>
            <p className="text-sm font-medium truncate">
              {device.userDisplayName || device.userPrincipalName || '--'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Last Sync</p>
            <p className="text-sm font-medium">{formatDate(device.lastSyncDateTime)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Enrolled</p>
            <p className="text-sm font-medium">{formatDate(device.enrolledDateTime)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Hardware info as JSON tree */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Monitor className="w-4 h-4 text-muted-foreground" />
            Hardware Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          <JsonTreeViewer data={cleanedHardwareInfo} defaultExpanded={2} />
        </CardContent>
      </Card>

      {/* Raw hardware info from API if available */}
      {device.hardwareInformation && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Raw Hardware Data</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <JsonTreeViewer data={device.hardwareInformation} defaultExpanded={1} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export const IntunePage: React.FC = () => {
  const client = useServiceApi('intune');
  const { devices, isLoading: isLoadingDevices, error: devicesError, refetch: refetchDevices, isReady } = useDevices();
  const { policies, isLoading: isLoadingPolicies, error: policiesError, refetch: refetchPolicies } = usePolicies();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedDeviceName, setSelectedDeviceName] = useState<string>('');
  const [showPolicies, setShowPolicies] = useState(false);

  if (!client.isReady && !isReady) {
    return <NotConnected />;
  }

  // Device detail view
  if (selectedDeviceId) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="p-4 md:p-6 border-b">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Intune</h1>
          <p className="text-muted-foreground text-sm mt-1">Device Details</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6">
            <DeviceDetailView
              deviceId={selectedDeviceId}
              deviceName={selectedDeviceName}
              onBack={() => {
                setSelectedDeviceId(null);
                setSelectedDeviceName('');
              }}
            />
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Page Header */}
      <div className="p-4 md:p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Intune</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Managed devices and compliance policies
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchDevices}
            disabled={isLoadingDevices}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoadingDevices && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-6">
          {/* Devices Table */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                  Managed Devices
                </CardTitle>
                <Badge variant="secondary">{devices.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-4">
              {devicesError && <ErrorMessage message={devicesError} onRetry={refetchDevices} />}
              {isLoadingDevices ? (
                <LoadingSpinner label="Loading devices..." />
              ) : devices.length === 0 ? (
                <div className="text-center py-12">
                  <Monitor className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No managed devices found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Device Name</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground hidden sm:table-cell">OS</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground hidden md:table-cell">Compliance</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground hidden lg:table-cell">Last Sync</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map((device) => (
                        <tr
                          key={device.id}
                          className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedDeviceId(device.id);
                            setSelectedDeviceName(device.deviceName);
                          }}
                        >
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2 min-w-0">
                              {getComplianceIcon(device.complianceState)}
                              <div className="min-w-0">
                                <p className="font-medium truncate">{device.deviceName}</p>
                                <p className="text-xs text-muted-foreground truncate sm:hidden">
                                  {device.operatingSystem}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 hidden sm:table-cell">
                            <span className="text-sm">{device.operatingSystem}</span>
                            {device.osVersion && (
                              <span className="text-xs text-muted-foreground ml-1">
                                {device.osVersion}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 hidden md:table-cell">
                            {getComplianceBadge(device.complianceState)}
                          </td>
                          <td className="py-2.5 pr-4 text-xs text-muted-foreground hidden lg:table-cell">
                            {formatDate(device.lastSyncDateTime)}
                          </td>
                          <td className="py-2.5">
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance Policies (collapsible) */}
          <Card>
            <CardHeader
              className="cursor-pointer py-3 px-4"
              onClick={() => setShowPolicies(!showPolicies)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {showPolicies ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Compliance Policies</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{policies.length}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      refetchPolicies();
                    }}
                    disabled={isLoadingPolicies}
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', isLoadingPolicies && 'animate-spin')} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {showPolicies && (
              <CardContent className="pt-0 px-4 pb-4">
                {policiesError && <ErrorMessage message={policiesError} onRetry={refetchPolicies} />}
                {isLoadingPolicies ? (
                  <LoadingSpinner label="Loading policies..." />
                ) : policies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No compliance policies found.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {policies.map((policy) => (
                      <Card key={policy.id} className="bg-muted/20">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-medium truncate">{policy.displayName}</h4>
                              {policy.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {policy.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {policy.platformType && (
                                  <Badge variant="outline" className="text-xs">
                                    {policy.platformType}
                                  </Badge>
                                )}
                                {policy.version !== undefined && (
                                  <span className="text-xs text-muted-foreground">
                                    v{policy.version}
                                  </span>
                                )}
                                {policy.lastModifiedDateTime && (
                                  <span className="text-xs text-muted-foreground">
                                    Modified: {formatDate(policy.lastModifiedDateTime)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};
