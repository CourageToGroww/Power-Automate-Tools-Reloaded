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

interface CompliancePolicy {
  id: string;
  displayName: string;
  lastModifiedDateTime: string;
  createdDateTime: string;
  description?: string;
  version?: number;
}

interface ConfigurationProfile {
  id: string;
  displayName: string;
  lastModifiedDateTime: string;
  createdDateTime: string;
  description?: string;
  version?: number;
}

interface GraphResponse<T> {
  value: T[];
}

type PolicyTab = 'compliance' | 'configuration';

/**
 * Policies page showing Intune compliance policies and configuration profiles.
 */
export const PoliciesPage: React.FC = () => {
  const intuneApi = useServiceApi('intune');

  const [activeTab, setActiveTab] = useState<PolicyTab>('compliance');
  const [compliancePolicies, setCompliancePolicies] = useState<CompliancePolicy[]>([]);
  const [configProfiles, setConfigProfiles] = useState<ConfigurationProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);

  const isConnected = intuneApi !== null && intuneApi.isApiReady;

  const fetchCompliancePolicies = useCallback(async () => {
    if (!intuneApi) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await intuneApi.get(
        '/deviceManagement/deviceCompliancePolicies'
      ) as GraphResponse<CompliancePolicy>;
      setCompliancePolicies(result.value || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [intuneApi]);

  const fetchConfigurationProfiles = useCallback(async () => {
    if (!intuneApi) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await intuneApi.get(
        '/deviceManagement/deviceConfigurations'
      ) as GraphResponse<ConfigurationProfile>;
      setConfigProfiles(result.value || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [intuneApi]);

  useEffect(() => {
    if (isConnected) {
      if (activeTab === 'compliance') {
        fetchCompliancePolicies();
      } else {
        fetchConfigurationProfiles();
      }
    }
  }, [isConnected, activeTab, fetchCompliancePolicies, fetchConfigurationProfiles]);

  const formatDateTime = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const toggleExpandPolicy = (policyId: string) => {
    setExpandedPolicyId(expandedPolicyId === policyId ? null : policyId);
  };

  const handleRefresh = () => {
    if (activeTab === 'compliance') {
      fetchCompliancePolicies();
    } else {
      fetchConfigurationProfiles();
    }
  };

  const policies = activeTab === 'compliance' ? compliancePolicies : configProfiles;

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
            onClick={handleRefresh}
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

      {/* Tabs */}
      {isConnected && (
        <div className="flex border-b">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'compliance'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('compliance')}
          >
            Compliance Policies ({compliancePolicies.length})
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'configuration'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('configuration')}
          >
            Configuration Profiles ({configProfiles.length})
          </button>
        </div>
      )}

      {/* Policies list */}
      {isConnected && !error && (
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === 'compliance' ? 'Compliance Policies' : 'Configuration Profiles'}
            </CardTitle>
            <CardDescription>
              {policies.length} {activeTab === 'compliance' ? 'polic' : 'profile'}
              {policies.length !== 1 ? (activeTab === 'compliance' ? 'ies' : 's') : 'y'} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && policies.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Loading {activeTab === 'compliance' ? 'policies' : 'profiles'}...
              </div>
            ) : policies.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No {activeTab === 'compliance' ? 'policies' : 'profiles'} found
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Desktop: Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-2 px-2 font-medium">Name</th>
                        <th className="pb-2 px-2 font-medium">Created</th>
                        <th className="pb-2 px-2 font-medium">Last Modified</th>
                        <th className="pb-2 px-2 font-medium">Version</th>
                        <th className="pb-2 px-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {policies.map((policy) => (
                        <React.Fragment key={policy.id}>
                          <tr className="border-b hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-2 font-medium">
                              {policy.displayName || 'Unnamed'}
                            </td>
                            <td className="py-3 px-2 text-xs text-muted-foreground">
                              {formatDateTime(policy.createdDateTime)}
                            </td>
                            <td className="py-3 px-2 text-xs text-muted-foreground">
                              {formatDateTime(policy.lastModifiedDateTime)}
                            </td>
                            <td className="py-3 px-2">
                              {policy.version !== undefined ? (
                                <Badge variant="secondary">v{policy.version}</Badge>
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpandPolicy(policy.id)}
                              >
                                {expandedPolicyId === policy.id ? 'Hide' : 'Details'}
                              </Button>
                            </td>
                          </tr>
                          {expandedPolicyId === policy.id && (
                            <tr className="bg-muted/30">
                              <td colSpan={5} className="py-4 px-4">
                                <div className="space-y-3 text-sm">
                                  <div>
                                    <span className="font-medium">Policy ID:</span>
                                    <span className="ml-2 text-muted-foreground font-mono text-xs break-all">
                                      {policy.id}
                                    </span>
                                  </div>
                                  {policy.description && (
                                    <div>
                                      <span className="font-medium">Description:</span>
                                      <p className="mt-1 text-muted-foreground">
                                        {policy.description}
                                      </p>
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
                  {policies.map((policy) => (
                    <Card key={policy.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">
                            {policy.displayName || 'Unnamed'}
                          </CardTitle>
                          {policy.version !== undefined && (
                            <Badge variant="secondary">v{policy.version}</Badge>
                          )}
                        </div>
                        {policy.description && (
                          <CardDescription className="text-xs line-clamp-2">
                            {policy.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-xs">Created:</span>
                          <span className="text-xs">{formatDateTime(policy.createdDateTime)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-xs">Modified:</span>
                          <span className="text-xs">{formatDateTime(policy.lastModifiedDateTime)}</span>
                        </div>
                        {expandedPolicyId === policy.id && (
                          <div className="pt-2 border-t space-y-2">
                            <div>
                              <span className="text-muted-foreground text-xs">Policy ID:</span>
                              <p className="text-xs font-mono break-all mt-1">{policy.id}</p>
                            </div>
                            {policy.description && (
                              <div>
                                <span className="text-muted-foreground text-xs">Description:</span>
                                <p className="text-xs mt-1">{policy.description}</p>
                              </div>
                            )}
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => toggleExpandPolicy(policy.id)}
                        >
                          {expandedPolicyId === policy.id ? 'Hide Details' : 'Show Details'}
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
