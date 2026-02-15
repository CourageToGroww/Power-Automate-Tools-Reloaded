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
  BaseTemplate: number;
}

interface SharePointField {
  Id: string;
  Title: string;
  InternalName: string;
  TypeAsString: string;
  CustomFormatter?: string;
}

interface ListsResponse {
  results: SharePointList[];
}

interface FieldsResponse {
  results: SharePointField[];
}

export function ColumnFormattingPage() {
  const api = useServiceApi('sharepoint');
  const isConnected = api !== null && api.isApiReady;
  const [lists, setLists] = useState<SharePointList[]>([]);
  const [selectedList, setSelectedList] = useState<SharePointList | null>(null);
  const [fields, setFields] = useState<SharePointField[]>([]);
  const [selectedField, setSelectedField] = useState<SharePointField | null>(null);
  const [formatterJson, setFormatterJson] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && api) {
      loadLists();
    }
  }, [isConnected, api]);

  useEffect(() => {
    if (selectedField) {
      setFormatterJson(selectedField.CustomFormatter || '');
    }
  }, [selectedField]);

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
    setSelectedField(null);
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

  const handleSave = async () => {
    if (!api || !selectedList || !selectedField) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate JSON
      if (formatterJson.trim()) {
        try {
          JSON.parse(formatterJson);
        } catch {
          throw new Error('Invalid JSON format. Please check your formatting JSON.');
        }
      }

      await api.patch(
        `web/lists(guid'${selectedList.Id}')/fields(guid'${selectedField.Id}')`,
        {
          CustomFormatter: formatterJson.trim() || null,
        }
      );

      setSuccess('Column formatting saved successfully!');

      // Update the field in the local state
      setFields((prev) =>
        prev.map((f) =>
          f.Id === selectedField.Id ? { ...f, CustomFormatter: formatterJson.trim() || undefined } : f
        )
      );
      setSelectedField((prev) =>
        prev ? { ...prev, CustomFormatter: formatterJson.trim() || undefined } : null
      );

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save column formatting');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setFormatterJson('');
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(formatterJson);
      setFormatterJson(JSON.stringify(parsed, null, 2));
    } catch (err) {
      setError('Invalid JSON. Cannot format.');
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Column Formatting</CardTitle>
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
            <h1 className="text-2xl sm:text-3xl font-bold">Column Formatting</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              View and edit SharePoint column formatting JSON
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

      {success && (
        <Card className="mb-4 border-green-500">
          <CardContent className="pt-6">
            <p className="text-green-600 dark:text-green-400">{success}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>1. Select List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm">Loading lists...</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {lists.map((list) => (
                  <button
                    key={list.Id}
                    onClick={() => loadFields(list)}
                    className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                      selectedList?.Id === list.Id
                        ? 'bg-blue-50 dark:bg-blue-900 border-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="font-medium text-sm">{list.Title}</div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>2. Select Column</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedList ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">Select a list first</p>
            ) : loadingFields ? (
              <p className="text-sm">Loading columns...</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {fields.map((field) => (
                  <button
                    key={field.Id}
                    onClick={() => setSelectedField(field)}
                    className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                      selectedField?.Id === field.Id
                        ? 'bg-blue-50 dark:bg-blue-900 border-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="font-medium text-sm">{field.Title}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {field.TypeAsString}
                      </Badge>
                      {field.CustomFormatter && (
                        <Badge variant="default" className="text-xs">
                          Formatted
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle>3. Edit Format</CardTitle>
              {selectedField && (
                <div className="flex gap-2">
                  <Button onClick={formatJson} variant="outline" size="sm">
                    Format JSON
                  </Button>
                  <Button onClick={handleClear} variant="outline" size="sm">
                    Clear
                  </Button>
                </div>
              )}
            </div>
            {selectedField && (
              <CardDescription className="mt-2">
                Column: {selectedField.Title} ({selectedField.TypeAsString})
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!selectedField ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">Select a column to view/edit formatting</p>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={formatterJson}
                  onChange={(e) => setFormatterJson(e.target.value)}
                  className="w-full h-64 sm:h-96 px-3 py-2 font-mono text-xs border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Enter column formatting JSON here..."
                />
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">
                    {saving ? 'Saving...' : 'Save Formatting'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
