import type { Artifact, Link, MemoryItem, Run, RunStep, Connection } from '../state.js';

export interface ArtifactCreateInput {
  type: string;
  name?: string;
  source?: string;
  contentType?: string;
  contentText?: string;
  metadata?: Record<string, unknown>;
  eventId?: string;
}

export interface LinkAddInput {
  from: { type: string; id: string };
  to: { type: string; id: string };
  label?: string;
  url?: string;
  eventId?: string;
}

export interface LinkListFilter {
  fromType?: string;
  fromId?: string;
  toType?: string;
  toId?: string;
}

export interface HubStore {
  // Memory
  upsertMemory(key: string, value: string, tags: string[], eventId?: string): Promise<MemoryItem>;
  getMemory(key: string): Promise<MemoryItem | null>;
  searchMemory(query: string, tags?: string[]): Promise<MemoryItem[]>;

  // Artifacts
  createArtifact(input: ArtifactCreateInput): Promise<Artifact>;
  getArtifact(id: string): Promise<Artifact | null>;
  listArtifacts(type?: string): Promise<Artifact[]>;

  // Links
  addLink(input: LinkAddInput): Promise<Link>;
  listLinks(filter?: LinkListFilter): Promise<Link[]>;

  // Runs
  startRun(name: string, eventId?: string): Promise<Run>;
  addRunStep(runId: string, step: Omit<RunStep, 'id' | 'ts'> & { eventId?: string }): Promise<RunStep>;
  completeRun(runId: string, status: 'completed' | 'failed'): Promise<Run>;
  getRun(runId: string): Promise<Run | null>;
  listRuns(limit?: number): Promise<Run[]>;

  // Connections
  addConnection(input: Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Connection>;
  listConnections(): Promise<Connection[]>;
  deleteConnection(id: string): Promise<void>;
  updateConnection(id: string, updates: Partial<Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Connection>;
}







