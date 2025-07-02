export interface GraphEndpoint {
  endpoint: string;
  v10: boolean;
  v10Url: string | null;
  v10Methods: string[] | null;
  v10Docs: (string | null)[] | null;
  beta: boolean;
  betaUrl: string | null;
  betaMethods: string[] | null;
  betaDocs: (string | null)[] | null;
  path: string[];
  root: string;
  children: number;
  segment: string;
}

export interface GraphEndpointsResponse {
  endpoints: GraphEndpoint[];
  totalCount: number;
  lastUpdated: string;
}

export type AIProvider = 'openai' | 'claude';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface FlowDefinition {
  definition: any;
  connectionReferences?: any;
  parameters?: any;
  isModified?: boolean;
}

export interface AIResponse {
  message: string;
  flowDefinition?: FlowDefinition;
  explanation?: string;
}

export interface AIAssistanceState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  flowDefinition: FlowDefinition | null;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
} 