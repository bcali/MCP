import { HubState } from '../state.js';
import type { Artifact, Link, MemoryItem, Run, RunStep, Connection } from '../state.js';
import type { ArtifactCreateInput, HubStore, LinkAddInput, LinkListFilter } from './types.js';

export class MemoryStore implements HubStore {
  private state = new HubState();

  async upsertMemory(key: string, value: string, tags: string[], eventId?: string): Promise<MemoryItem> {
    return this.state.upsertMemory(key, value, tags, eventId);
  }

  async getMemory(key: string): Promise<MemoryItem | null> {
    return this.state.getMemory(key) ?? null;
  }

  async searchMemory(query: string, tags?: string[]): Promise<MemoryItem[]> {
    return this.state.searchMemory(query, tags);
  }

  async createArtifact(input: ArtifactCreateInput): Promise<Artifact> {
    return this.state.createArtifact(input);
  }

  async getArtifact(id: string): Promise<Artifact | null> {
    return this.state.getArtifact(id) ?? null;
  }

  async listArtifacts(type?: string): Promise<Artifact[]> {
    return this.state.listArtifacts(type);
  }

  async addLink(input: LinkAddInput): Promise<Link> {
    return this.state.addLink(input);
  }

  async listLinks(filter?: LinkListFilter): Promise<Link[]> {
    return this.state.listLinks(filter);
  }

  async startRun(name: string, eventId?: string): Promise<Run> {
    return this.state.startRun(name, eventId);
  }

  async addRunStep(runId: string, step: Omit<RunStep, 'id' | 'ts'> & { eventId?: string }): Promise<RunStep> {
    return this.state.addRunStep(runId, step);
  }

  async completeRun(runId: string, status: 'completed' | 'failed'): Promise<Run> {
    return this.state.completeRun(runId, status);
  }

  async getRun(runId: string): Promise<Run | null> {
    return this.state.getRun(runId) ?? null;
  }

  async listRuns(limit?: number): Promise<Run[]> {
    return this.state.listRuns(limit);
  }

  // Connections
  async addConnection(input: Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Connection> {
    return this.state.addConnection(input);
  }

  async listConnections(): Promise<Connection[]> {
    return this.state.listConnections();
  }

  async deleteConnection(id: string): Promise<void> {
    return this.state.deleteConnection(id);
  }

  async updateConnection(id: string, updates: Partial<Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Connection> {
    return this.state.updateConnection(id, updates);
  }
}
