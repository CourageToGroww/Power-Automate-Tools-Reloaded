import { useState, useEffect, useMemo } from 'react';
import { GraphEndpoint } from './types';

interface UseGraphEndpointsResult {
  endpoints: GraphEndpoint[];
  loading: boolean;
  error: string | null;
  rootSegments: string[];
}

export const useGraphEndpoints = (): UseGraphEndpointsResult => {
  const [endpoints, setEndpoints] = useState<GraphEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEndpoints = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the comprehensive Microsoft Graph endpoints JSON
        const response = await fetch('https://raw.githubusercontent.com/baswijdenes/ListOfMicrosoftGraphApiEndpoints/main/ListOfMicrosoftGraphEndpoints.json');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Transform the data to match our interface
        const transformedEndpoints: GraphEndpoint[] = data.map((item: any) => ({
          endpoint: item.Endpoint,
          v10: item['v1.0'],
          v10Url: item['V1.0-Url'],
          v10Methods: item['v1.0-Methods'],
          v10Docs: item['v1.0-docs'],
          beta: item.beta,
          betaUrl: item['Beta-Url'],
          betaMethods: item['Beta-Methods'],
          betaDocs: item['Beta-Docs'],
          path: item.Path,
          root: item.Root,
          children: item.Children,
          segment: item.Segment
        }));
        
        setEndpoints(transformedEndpoints);
      } catch (err) {
        console.error('Error fetching Graph endpoints:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch endpoints');
        
        // Fallback to a smaller set of common endpoints if the fetch fails
        setEndpoints(getFallbackEndpoints());
      } finally {
        setLoading(false);
      }
    };

    fetchEndpoints();
  }, []);

  const rootSegments = useMemo(() => {
    const segments = Array.from(new Set(endpoints.map(ep => ep.root)));
    return segments.sort();
  }, [endpoints]);

  return {
    endpoints,
    loading,
    error,
    rootSegments
  };
};

// Fallback endpoints for when the external API is unavailable
const getFallbackEndpoints = (): GraphEndpoint[] => [
  {
    endpoint: 'me',
    v10: true,
    v10Url: 'https://graph.microsoft.com/v1.0/me',
    v10Methods: ['GET', 'PATCH'],
    v10Docs: ['https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0'],
    beta: true,
    betaUrl: 'https://graph.microsoft.com/beta/me',
    betaMethods: ['GET', 'PATCH'],
    betaDocs: ['https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-beta'],
    path: ['me'],
    root: 'me',
    children: 0,
    segment: 'me'
  },
  {
    endpoint: 'users',
    v10: true,
    v10Url: 'https://graph.microsoft.com/v1.0/users',
    v10Methods: ['GET', 'POST'],
    v10Docs: ['https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0'],
    beta: true,
    betaUrl: 'https://graph.microsoft.com/beta/users',
    betaMethods: ['GET', 'POST'],
    betaDocs: ['https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-beta'],
    path: ['users'],
    root: 'users',
    children: 5,
    segment: 'users'
  },
  {
    endpoint: 'groups',
    v10: true,
    v10Url: 'https://graph.microsoft.com/v1.0/groups',
    v10Methods: ['GET', 'POST'],
    v10Docs: ['https://learn.microsoft.com/en-us/graph/api/group-list?view=graph-rest-1.0'],
    beta: true,
    betaUrl: 'https://graph.microsoft.com/beta/groups',
    betaMethods: ['GET', 'POST'],
    betaDocs: ['https://learn.microsoft.com/en-us/graph/api/group-list?view=graph-rest-beta'],
    path: ['groups'],
    root: 'groups',
    children: 8,
    segment: 'groups'
  },
  {
    endpoint: 'applications',
    v10: true,
    v10Url: 'https://graph.microsoft.com/v1.0/applications',
    v10Methods: ['GET', 'POST'],
    v10Docs: ['https://learn.microsoft.com/en-us/graph/api/application-list?view=graph-rest-1.0'],
    beta: true,
    betaUrl: 'https://graph.microsoft.com/beta/applications',
    betaMethods: ['GET', 'POST'],
    betaDocs: ['https://learn.microsoft.com/en-us/graph/api/application-list?view=graph-rest-beta'],
    path: ['applications'],
    root: 'applications',
    children: 3,
    segment: 'applications'
  },
  {
    endpoint: 'me/messages',
    v10: true,
    v10Url: 'https://graph.microsoft.com/v1.0/me/messages',
    v10Methods: ['GET', 'POST'],
    v10Docs: ['https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0'],
    beta: true,
    betaUrl: 'https://graph.microsoft.com/beta/me/messages',
    betaMethods: ['GET', 'POST'],
    betaDocs: ['https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-beta'],
    path: ['me', 'messages'],
    root: 'me',
    children: 0,
    segment: 'messages'
  },
  {
    endpoint: 'me/events',
    v10: true,
    v10Url: 'https://graph.microsoft.com/v1.0/me/events',
    v10Methods: ['GET', 'POST'],
    v10Docs: ['https://learn.microsoft.com/en-us/graph/api/user-list-events?view=graph-rest-1.0'],
    beta: true,
    betaUrl: 'https://graph.microsoft.com/beta/me/events',
    betaMethods: ['GET', 'POST'],
    betaDocs: ['https://learn.microsoft.com/en-us/graph/api/user-list-events?view=graph-rest-beta'],
    path: ['me', 'events'],
    root: 'me',
    children: 0,
    segment: 'events'
  },
  {
    endpoint: 'sites',
    v10: true,
    v10Url: 'https://graph.microsoft.com/v1.0/sites',
    v10Methods: ['GET'],
    v10Docs: ['https://learn.microsoft.com/en-us/graph/api/site-list?view=graph-rest-1.0'],
    beta: true,
    betaUrl: 'https://graph.microsoft.com/beta/sites',
    betaMethods: ['GET'],
    betaDocs: ['https://learn.microsoft.com/en-us/graph/api/site-list?view=graph-rest-beta'],
    path: ['sites'],
    root: 'sites',
    children: 12,
    segment: 'sites'
  },
  {
    endpoint: 'teams',
    v10: true,
    v10Url: 'https://graph.microsoft.com/v1.0/teams',
    v10Methods: ['GET', 'POST'],
    v10Docs: ['https://learn.microsoft.com/en-us/graph/api/team-list?view=graph-rest-1.0'],
    beta: true,
    betaUrl: 'https://graph.microsoft.com/beta/teams',
    betaMethods: ['GET', 'POST'],
    betaDocs: ['https://learn.microsoft.com/en-us/graph/api/team-list?view=graph-rest-beta'],
    path: ['teams'],
    root: 'teams',
    children: 15,
    segment: 'teams'
  }
]; 