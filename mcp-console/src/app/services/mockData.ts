export interface Connection {
  id: string;
  name: string;
  type: 'SSE MCP Server' | 'stdio MCP Server' | 'Custom HTTP Tool';
  endpoint: string;
  status: 'healthy' | 'degraded' | 'down';
  enabled: boolean;
  lastCheck: Date;
  latency: number;
  toolsCount: number;
  error?: string;
}

export interface Tool {
  id: string;
  connectionId: string;
  connectionName: string;
  name: string;
  description: string;
  inputSchema: any;
  outputSchema: any;
  examples: string[];
}

export interface Run {
  id: string;
  timestamp: Date;
  status: 'success' | 'failed';
  toolName: string;
  latency: number;
  input: any;
  output: any;
  logs: string[];
}

export const connections: Connection[] = [
  { id: '1', name: 'Hub Backend', type: 'SSE MCP Server', endpoint: '/v1/sse', status: 'healthy', enabled: true, lastCheck: new Date(), latency: 12, toolsCount: 15 },
];

export const tools: Tool[] = [
  { id: 't1', connectionId: '1', connectionName: 'Hub Backend', name: 'memory_put', description: 'Store memory', inputSchema: {}, outputSchema: {}, examples: [] },
];

export const runs: Run[] = [
  { id: 'r1', timestamp: new Date(), status: 'success', toolName: 'memory_put', latency: 45, input: {}, output: {}, logs: ['Started'] },
];

export const hubStatus = {
  status: 'up',
  version: '0.1.0',
  uptime: '2h 15m',
  activeConnections: 1,
  totalConnections: 1,
};

