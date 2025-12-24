import { config } from './config';

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

export async function getRecentRuns(): Promise<any[]> {
  const res = await fetch(`${config.hubUrl}/v1/runs?key=${config.hubApiKey}`);
  if (!res.ok) throw new Error('Failed to fetch runs');
  return res.json();
}

// We can also connect as an MCP client here if we want to list tools dynamically
// For now, we'll focus on the management dashboard

