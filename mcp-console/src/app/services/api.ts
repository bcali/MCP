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
  try {
    const res = await fetch(`${config.hubUrl}/v1/connections?key=${config.hubApiKey}`);
    const dynamicConnections = res.ok ? await res.json() : [];

    // Get tools to count them for each connector
    const allTools = await getTools().catch(() => []);
    
    // Define the built-in connectors we've activated
    const connectors: Connection[] = [
      {
        id: 'conn-gamma',
        name: 'Gamma AI',
        type: 'Internal Connector',
        endpoint: 'Native API',
        enabled: true,
        status: 'healthy',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        toolsCount: allTools.filter(t => t.name.startsWith('gamma_')).length,
        latency: 120,
      },
      {
        id: 'conn-figma',
        name: 'Figma',
        type: 'Internal Connector',
        endpoint: 'Native API',
        enabled: true,
        status: 'healthy',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        toolsCount: allTools.filter(t => t.name.startsWith('figma_')).length,
        latency: 85,
      },
      {
        id: 'conn-hub-core',
        name: 'Hub Core (Memory/Artifacts)',
        type: 'System',
        endpoint: 'Local Store',
        enabled: true,
        status: 'healthy',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        toolsCount: allTools.filter(t => !t.name.includes('_')).length,
        latency: 5,
      }
    ];

    return [...connectors, ...dynamicConnections.map((c: any) => ({
      ...c,
      status: c.enabled ? 'healthy' : 'down',
      latency: 0,
      toolsCount: 0
    }))];
  } catch (err) {
    console.error('Failed to fetch connections:', err);
    return [];
  }
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
