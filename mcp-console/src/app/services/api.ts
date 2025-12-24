import { config } from '../config';

export interface HubStatus {
  status: string;
  version: string;
  uptime: number;
  activeConnections: number;
}

export async function getHubStatus(): Promise<HubStatus> {
  const res = await fetch(`${config.hubUrl}/v1/status?key=${config.hubApiKey}`);
  if (!res.ok) throw new Error('Failed to fetch hub status');
  return res.json();
}

export interface Tool {
  name: string;
  description?: string;
  inputSchema: any;
  outputSchema?: any;
  examples?: string[];
}

export async function getTools(): Promise<Tool[]> {
  const res = await fetch(`${config.hubUrl}/v1/tools?key=${config.hubApiKey}`);
  if (!res.ok) throw new Error('Failed to fetch tools');
  return res.json();
}

export interface Run {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function getRecentRuns(): Promise<Run[]> {
  const res = await fetch(`${config.hubUrl}/v1/runs?key=${config.hubApiKey}`);
  if (!res.ok) throw new Error('Failed to fetch runs');
  return res.json();
}

export interface Connection {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  apiKey?: string;
  enabled: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // UI helper fields
  status?: 'healthy' | 'degraded' | 'down';
  latency?: number;
  toolsCount?: number;
}

export async function getConnections(): Promise<Connection[]> {
  const res = await fetch(`${config.hubUrl}/v1/connections?key=${config.hubApiKey}`);
  if (!res.ok) throw new Error('Failed to fetch connections');
  const dynamicConnections = await res.json();

  // Add the Hub itself as a built-in connection
  const hubStatus = await getHubStatus().catch(() => null);
  const hubTools = await getTools().catch(() => []);

  const builtIn: Connection = {
    id: 'hub-builtin',
    name: 'MCP Hub (Built-in)',
    type: 'Core Gateway',
    endpoint: config.hubUrl,
    enabled: true,
    status: hubStatus ? 'healthy' : 'down',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    toolsCount: hubTools.length,
    latency: 5, // Representative
  };

  return [builtIn, ...dynamicConnections.map((c: any) => ({
    ...c,
    status: c.enabled ? 'healthy' : 'down',
    latency: 0,
    toolsCount: 0
  }))];
}

export async function addConnection(connection: Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Connection> {
  const res = await fetch(`${config.hubUrl}/v1/connections?key=${config.hubApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(connection),
  });
  if (!res.ok) throw new Error('Failed to add connection');
  return res.json();
}

export async function deleteConnection(id: string): Promise<void> {
  const res = await fetch(`${config.hubUrl}/v1/connections/${id}?key=${config.hubApiKey}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete connection');
}
