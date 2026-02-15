import React, { useState, useEffect } from 'react';
import { useServiceApi } from '../../../core/providers/MultiServiceApiProvider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';

interface RoleDefinition {
  Name: string;
  Description: string;
  Hidden: boolean;
}

interface Member {
  Title: string;
  PrincipalType: number;
  LoginName?: string;
}

interface RoleAssignment {
  PrincipalId: number;
  Member: Member;
  RoleDefinitionBindings: {
    results: RoleDefinition[];
  };
}

interface RoleAssignmentsResponse {
  results: RoleAssignment[];
}

export function PermissionsPage() {
  const api = useServiceApi('sharepoint');
  const isConnected = api !== null && api.isApiReady;
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && api) {
      loadPermissions();
    }
  }, [isConnected, api]);

  const loadPermissions = async () => {
    if (!api) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(
        'web/roleassignments?$expand=Member,RoleDefinitionBindings'
      ) as RoleAssignmentsResponse;
      setAssignments(response.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const getPrincipalTypeName = (type: number): string => {
    const types: Record<number, string> = {
      0: 'None',
      1: 'User',
      2: 'Distribution List',
      4: 'Security Group',
      8: 'SharePoint Group',
      16: 'All',
    };
    return types[type] || `Type ${type}`;
  };

  const getPrincipalTypeBadgeVariant = (type: number): 'default' | 'secondary' | 'outline' => {
    if (type === 1) return 'default';
    if (type === 8) return 'secondary';
    return 'outline';
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>SharePoint Permissions</CardTitle>
            <CardDescription>
              Not connected to SharePoint. Please navigate to a SharePoint site to capture credentials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="destructive">Not Connected</Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Site Permissions</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              View SharePoint site role assignments and permissions
            </p>
          </div>
          <Badge variant="default">Connected</Badge>
        </div>
      </div>

      {error && (
        <Card className="mb-4 border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p>Loading permissions...</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Role Assignments</CardTitle>
            <CardDescription>{assignments.length} permission entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 sm:px-4 font-semibold">Principal</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-semibold">Type</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-semibold">Roles</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-semibold hidden lg:table-cell">Login Name</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.PrincipalId} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-2 sm:px-4 font-medium">{assignment.Member.Title}</td>
                      <td className="py-3 px-2 sm:px-4">
                        <Badge variant={getPrincipalTypeBadgeVariant(assignment.Member.PrincipalType)}>
                          {getPrincipalTypeName(assignment.Member.PrincipalType)}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <div className="flex flex-wrap gap-1">
                          {assignment.RoleDefinitionBindings.results
                            .filter((role) => !role.Hidden)
                            .map((role, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {role.Name}
                              </Badge>
                            ))}
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-gray-600 dark:text-gray-400 font-mono text-xs hidden lg:table-cell">
                        {assignment.Member.LoginName || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {assignments.length === 0 && (
              <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                No permissions found.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Permission Levels</CardTitle>
          <CardDescription>Common SharePoint permission levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="border rounded p-3 dark:border-gray-700">
              <div className="font-semibold mb-1">Full Control</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Has full control over the site and all content
              </p>
            </div>
            <div className="border rounded p-3 dark:border-gray-700">
              <div className="font-semibold mb-1">Design</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Can view, add, update, delete, approve, and customize
              </p>
            </div>
            <div className="border rounded p-3 dark:border-gray-700">
              <div className="font-semibold mb-1">Edit</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Can add, edit, and delete lists, and view, add, update, and delete list items
              </p>
            </div>
            <div className="border rounded p-3 dark:border-gray-700">
              <div className="font-semibold mb-1">Contribute</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Can view, add, update, and delete list items and documents
              </p>
            </div>
            <div className="border rounded p-3 dark:border-gray-700">
              <div className="font-semibold mb-1">Read</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Can view pages and list items, and download documents
              </p>
            </div>
            <div className="border rounded p-3 dark:border-gray-700">
              <div className="font-semibold mb-1">Limited Access</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Can access specific lists, document libraries, items, or documents
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
