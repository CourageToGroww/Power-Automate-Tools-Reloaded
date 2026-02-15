import React, { useState, useEffect } from 'react';
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

interface SharePointList {
  Id: string;
  Title: string;
  ItemCount: number;
  BaseTemplate: number;
  LastItemModifiedDate: string;
  Hidden: boolean;
}

interface SharePointField {
  Id: string;
  Title: string;
  InternalName: string;
  TypeAsString: string;
  Required: boolean;
  Hidden: boolean;
}

interface ListsResponse {
  results: SharePointList[];
}

interface FieldsResponse {
  results: SharePointField[];
}

export function ListsPage() {
  const api = useServiceApi('sharepoint');
  const isConnected = api !== null && api.isApiReady;
  const [lists, setLists] = useState<SharePointList[]>([]);
  const [selectedList, setSelectedList] = useState<SharePointList | null>(null);
  const [fields, setFields] = useState<SharePointField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingFields, setLoadingFields] = useState(false);

  useEffect(() => {
    if (isConnected && api) {
      loadLists();
    }
  }, [isConnected, api]);

  const loadLists = async () => {
    if (!api) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('web/lists?$filter=Hidden eq false') as ListsResponse;
      setLists(response.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lists');
    } finally {
      setLoading(false);
    }
  };

  const loadFields = async (list: SharePointList) => {
    if (!api) return;

    setSelectedList(list);
    setLoadingFields(true);
    setError(null);

    try {
      const response = await api.get(
        `web/lists(guid'${list.Id}')/fields?$filter=Hidden eq false`
      ) as FieldsResponse;
      setFields(response.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fields');
      setFields([]);
    } finally {
      setLoadingFields(false);
    }
  };

  const closeFieldsView = () => {
    setSelectedList(null);
    setFields([]);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  };

  const getTemplateTypeName = (template: number): string => {
    const templates: Record<number, string> = {
      100: 'Generic List',
      101: 'Document Library',
      102: 'Survey',
      103: 'Links',
      104: 'Announcements',
      105: 'Contacts',
      106: 'Events',
      107: 'Tasks',
      108: 'Discussion Board',
      109: 'Picture Library',
      110: 'Data Sources',
      111: 'Site Template Gallery',
      112: 'User Information',
      113: 'Web Part Gallery',
      114: 'List Template Gallery',
      115: 'XML Form Library',
      116: 'Master Page Gallery',
      117: 'No-Code Workflows',
      118: 'Custom Workflow Process',
      119: 'Wiki Page Library',
      120: 'Custom Grid',
      130: 'Data Connection Library',
      140: 'Workflow History',
      150: 'Gantt Tasks',
      171: 'Health Rules',
      200: 'Meeting Series',
      201: 'Meeting Agenda',
      202: 'Meeting Attendees',
      204: 'Meeting Decisions',
      207: 'Meeting Objectives',
      210: 'Meeting Text Box',
      211: 'Meeting Things To Bring',
      212: 'Meeting Workspace Pages',
    };
    return templates[template] || `Template ${template}`;
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>SharePoint Lists</CardTitle>
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
            <h1 className="text-2xl sm:text-3xl font-bold">SharePoint Lists</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              View and explore SharePoint lists and libraries
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
            <p>Loading lists...</p>
          </CardContent>
        </Card>
      ) : selectedList ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>{selectedList.Title}</CardTitle>
                  <CardDescription>
                    {getTemplateTypeName(selectedList.BaseTemplate)} - {selectedList.ItemCount} items
                  </CardDescription>
                </div>
                <Button onClick={closeFieldsView} variant="outline">
                  Back to Lists
                </Button>
              </div>
            </CardHeader>
          </Card>

          {loadingFields ? (
            <Card>
              <CardContent className="pt-6">
                <p>Loading fields...</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Columns</CardTitle>
                <CardDescription>{fields.length} fields</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 sm:px-4 font-semibold">Display Name</th>
                        <th className="text-left py-3 px-2 sm:px-4 font-semibold hidden sm:table-cell">Internal Name</th>
                        <th className="text-left py-3 px-2 sm:px-4 font-semibold">Type</th>
                        <th className="text-left py-3 px-2 sm:px-4 font-semibold hidden md:table-cell">Required</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field) => (
                        <tr key={field.Id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-3 px-2 sm:px-4">{field.Title}</td>
                          <td className="py-3 px-2 sm:px-4 text-gray-600 dark:text-gray-400 font-mono text-xs hidden sm:table-cell">
                            {field.InternalName}
                          </td>
                          <td className="py-3 px-2 sm:px-4">
                            <Badge variant="secondary">{field.TypeAsString}</Badge>
                          </td>
                          <td className="py-3 px-2 sm:px-4 hidden md:table-cell">
                            {field.Required && <Badge variant="outline">Required</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <Card
              key={list.Id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => loadFields(list)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{list.Title}</CardTitle>
                <CardDescription>{getTemplateTypeName(list.BaseTemplate)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Items:</span>
                    <span className="font-semibold">{list.ItemCount}</span>
                  </div>
                  {list.LastItemModifiedDate && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-gray-600 dark:text-gray-400">Last Modified:</span>
                      <span className="text-xs sm:text-sm">{formatDate(list.LastItemModifiedDate)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && lists.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600 dark:text-gray-400">No lists found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
