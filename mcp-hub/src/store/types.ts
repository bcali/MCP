import type { Artifact, Link, MemoryItem, Run, RunStep } from '../state.js';

export interface ArtifactCreateInput {
  type: string;
  name?: string;
  source?: string;
  contentType?: string;
  contentText?: string;
  metadata?: Record<string, unknown>;
}

export interface LinkAddInput {
  from: { type: string; id: string };
  to: { type: string; id: string };
  label?: string;
  url?: string;
}

export interface LinkListFilter {
  fromType?: string;
  fromId?: string;
  toType?: string;
  toId?: string;
}

export interface HubStore {
  // Memory
  upsertMemory(key: string, value: string, tags: string[]): Promise<MemoryItem>;
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
  startRun(name: string): Promise<Run>;
  addRunStep(runId: string, step: Omit<RunStep, 'id' | 'ts'>): Promise<RunStep>;
  completeRun(runId: string, status: 'completed' | 'failed'): Promise<Run>;
  getRun(runId: string): Promise<Run | null>;
}







