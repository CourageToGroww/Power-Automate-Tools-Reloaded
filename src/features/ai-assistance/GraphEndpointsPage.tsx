import React, { useState, useMemo } from 'react';
import {
  Stack,
  SearchBox,
  DetailsList,
  DetailsListLayoutMode,
  IColumn,
  SelectionMode,
  Text,
  Pivot,
  PivotItem,
  Link,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize
} from '@fluentui/react';
import { useGraphEndpoints } from './useGraphEndpoints';
import { GraphEndpoint } from './types';

export const GraphEndpointsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<'all' | 'v1.0' | 'beta'>('all');
  const [selectedRoot, setSelectedRoot] = useState<string>('all');
  
  const { endpoints, loading, error, rootSegments } = useGraphEndpoints();

  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((endpoint: GraphEndpoint) => {
      const matchesSearch = searchTerm === '' || 
        endpoint.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
        endpoint.root.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesVersion = selectedVersion === 'all' || 
        (selectedVersion === 'v1.0' && endpoint.v10) ||
        (selectedVersion === 'beta' && endpoint.beta);
      
      const matchesRoot = selectedRoot === 'all' || endpoint.root === selectedRoot;
      
      return matchesSearch && matchesVersion && matchesRoot;
    });
  }, [endpoints, searchTerm, selectedVersion, selectedRoot]);

  const columns: IColumn[] = [
    {
      key: 'endpoint',
      name: 'Endpoint',
      fieldName: 'endpoint',
      minWidth: 300,
      maxWidth: 500,
      isResizable: true,
      onRender: (item: GraphEndpoint) => (
        <Stack>
          <Text variant="small" styles={{ root: { fontFamily: 'monospace', fontSize: '12px' } }}>
            {item.endpoint}
          </Text>
          <Stack horizontal tokens={{ childrenGap: 4 }}>
            <Text variant="xSmall" styles={{ root: { color: '#666' } }}>
              Root: {item.root}
            </Text>
            {item.children > 0 && (
              <Text variant="xSmall" styles={{ root: { color: '#666' } }}>
                • {item.children} children
              </Text>
            )}
          </Stack>
        </Stack>
      )
    },
    {
      key: 'versions',
      name: 'Versions',
      fieldName: 'versions',
      minWidth: 120,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: GraphEndpoint) => (
        <Stack horizontal tokens={{ childrenGap: 4 }}>
          {item.v10 && (
            <span style={{ 
              backgroundColor: '#0078d4', 
              color: 'white', 
              padding: '2px 6px', 
              borderRadius: '3px', 
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              v1.0
            </span>
          )}
          {item.beta && (
            <span style={{ 
              backgroundColor: '#ff8c00', 
              color: 'white', 
              padding: '2px 6px', 
              borderRadius: '3px', 
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              beta
            </span>
          )}
        </Stack>
      )
    },
    {
      key: 'methods',
      name: 'Methods',
      fieldName: 'methods',
      minWidth: 150,
      maxWidth: 200,
      isResizable: true,
      onRender: (item: GraphEndpoint) => (
        <Stack>
          {item.v10 && item.v10Methods && (
            <Stack horizontal tokens={{ childrenGap: 4 }}>
              <Text variant="xSmall" styles={{ root: { fontWeight: 'bold' } }}>v1.0:</Text>
              <Text variant="xSmall">{item.v10Methods.join(', ')}</Text>
            </Stack>
          )}
          {item.beta && item.betaMethods && (
            <Stack horizontal tokens={{ childrenGap: 4 }}>
              <Text variant="xSmall" styles={{ root: { fontWeight: 'bold' } }}>beta:</Text>
              <Text variant="xSmall">{item.betaMethods.join(', ')}</Text>
            </Stack>
          )}
        </Stack>
      )
    },
    {
      key: 'documentation',
      name: 'Documentation',
      fieldName: 'documentation',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: GraphEndpoint) => (
        <Stack tokens={{ childrenGap: 4 }}>
          {item.v10Docs && item.v10Docs.some(doc => doc) && (
            <Stack>
              <Text variant="xSmall" styles={{ root: { fontWeight: 'bold' } }}>v1.0:</Text>
              {item.v10Docs.filter(doc => doc).map((doc, index) => (
                <Link key={index} href={doc || undefined} target="_blank" styles={{ root: { fontSize: '11px' } }}>
                  Doc {index + 1}
                </Link>
              ))}
            </Stack>
          )}
          {item.betaDocs && item.betaDocs.some(doc => doc) && (
            <Stack>
              <Text variant="xSmall" styles={{ root: { fontWeight: 'bold' } }}>beta:</Text>
              {item.betaDocs.filter(doc => doc).map((doc, index) => (
                <Link key={index} href={doc || undefined} target="_blank" styles={{ root: { fontSize: '11px' } }}>
                  Doc {index + 1}
                </Link>
              ))}
            </Stack>
          )}
        </Stack>
      )
    }
  ];

  if (loading) {
    return (
      <Stack
        horizontalAlign="center"
        verticalAlign="center"
        styles={{ root: { flex: 1, padding: 20 } }}
      >
        <Spinner size={SpinnerSize.large} />
        <Text>Loading Microsoft Graph endpoints...</Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack styles={{ root: { padding: 20 } }}>
        <MessageBar messageBarType={MessageBarType.error}>
          Error loading endpoints: {error}
        </MessageBar>
      </Stack>
    );
  }

  return (
    <Stack styles={{ root: { padding: 20, height: '100%' } }} tokens={{ childrenGap: 16 }}>
      <Stack>
        <Text variant="xLarge" styles={{ root: { fontWeight: 'bold' } }}>
          Microsoft Graph Endpoints
        </Text>
        <Text variant="medium" styles={{ root: { color: '#666' } }}>
          Browse and search through {endpoints.length} Microsoft Graph API endpoints
        </Text>
      </Stack>

      <Stack horizontal tokens={{ childrenGap: 16 }} wrap>
        <SearchBox
          placeholder="Search endpoints..."
          value={searchTerm}
          onChange={(_, newValue) => setSearchTerm(newValue || '')}
          styles={{ root: { minWidth: 300 } }}
        />
        
        <Pivot
          selectedKey={selectedVersion}
          onLinkClick={(item) => setSelectedVersion(item?.props.itemKey as any)}
          headersOnly={true}
        >
          <PivotItem headerText="All Versions" itemKey="all" />
          <PivotItem headerText="v1.0 Only" itemKey="v1.0" />
          <PivotItem headerText="Beta Only" itemKey="beta" />
        </Pivot>

        <select
          value={selectedRoot}
          onChange={(e) => setSelectedRoot(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            minWidth: '150px'
          }}
        >
          <option value="all">All Root Segments</option>
          {rootSegments.map((root: string) => (
            <option key={root} value={root}>{root}</option>
          ))}
        </select>
      </Stack>

      <Stack styles={{ root: { flex: 1 } }}>
        <Text variant="medium" styles={{ root: { marginBottom: 8 } }}>
          Showing {filteredEndpoints.length} of {endpoints.length} endpoints
        </Text>
        
        <DetailsList
          items={filteredEndpoints}
          columns={columns}
          layoutMode={DetailsListLayoutMode.justified}
          selectionMode={SelectionMode.none}
          isHeaderVisible={true}
          styles={{
            root: {
              height: 'calc(100vh - 300px)',
              overflowY: 'auto'
            }
          }}
        />
      </Stack>
    </Stack>
  );
}; 