import { randomUUID } from 'node:crypto';

export type IsoDateTime = string;

export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  tags: string[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Artifact {
  id: string;
  type: string;
  name?: string;
  source?: string;
  contentType?: string;
  contentText?: string;
  metadata?: Record<string, unknown>;
  createdAt: IsoDateTime;
}

export interface Link {
  id: string;
  from: { type: string; id: string };
  to: { type: string; id: string };
  label?: string;
  url?: string;
  createdAt: IsoDateTime;
}

export interface RunStep {
  id: string;
  ts: IsoDateTime;
  kind: 'note' | 'tool_call' | 'artifact' | 'link';
  message: string;
  data?: Record<string, unknown>;
}

export interface Run {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  steps: RunStep[];
}

const nowIso = () => new Date().toISOString();

export class HubState {
  private memoryByKey = new Map<string, MemoryItem>();
  private artifacts = new Map<string, Artifact>();
  private links = new Map<string, Link>();
  private runs = new Map<string, Run>();

  upsertMemory(key: string, value: string, tags: string[] = []) {
    const existing = this.memoryByKey.get(key);
    const ts = nowIso();
    if (existing) {
      const updated: MemoryItem = { ...existing, value, tags, updatedAt: ts };
      this.memoryByKey.set(key, updated);
      return updated;
    }
    const created: MemoryItem = {
      id: randomUUID(),
      key,
      value,
      tags,
      createdAt: ts,
      updatedAt: ts,
    };
    this.memoryByKey.set(key, created);
    return created;
  }

  getMemory(key: string) {
    return this.memoryByKey.get(key);
  }

  searchMemory(query: string, tags?: string[]) {
    const q = query.trim().toLowerCase();
    const tagSet = tags?.length ? new Set(tags.map((t) => t.trim().toLowerCase())) : undefined;

    return [...this.memoryByKey.values()].filter((item) => {
      const matchesQuery = !q || item.key.toLowerCase().includes(q) || item.value.toLowerCase().includes(q);
      const matchesTags =
        !tagSet || item.tags.some((t) => tagSet.has(t.trim().toLowerCase())) || tagSet.size === 0;
      return matchesQuery && matchesTags;
    });
  }

  createArtifact(input: Omit<Artifact, 'id' | 'createdAt'>) {
    const artifact: Artifact = {
      id: randomUUID(),
      createdAt: nowIso(),
      ...input,
    };
    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  getArtifact(id: string) {
    return this.artifacts.get(id);
  }

  listArtifacts(type?: string) {
    const items = [...this.artifacts.values()];
    return type ? items.filter((a) => a.type === type) : items;
  }

  addLink(input: Omit<Link, 'id' | 'createdAt'>) {
    const link: Link = {
      id: randomUUID(),
      createdAt: nowIso(),
      ...input,
    };
    this.links.set(link.id, link);
    return link;
  }

  listLinks(filter?: { fromType?: string; fromId?: string; toType?: string; toId?: string }) {
    const items = [...this.links.values()];
    if (!filter) return items;
    return items.filter((l) => {
      if (filter.fromType && l.from.type !== filter.fromType) return false;
      if (filter.fromId && l.from.id !== filter.fromId) return false;
      if (filter.toType && l.to.type !== filter.toType) return false;
      if (filter.toId && l.to.id !== filter.toId) return false;
      return true;
    });
  }

  startRun(name: string) {
    const ts = nowIso();
    const run: Run = {
      id: randomUUID(),
      name,
      status: 'running',
      createdAt: ts,
      updatedAt: ts,
      steps: [],
    };
    this.runs.set(run.id, run);
    return run;
  }

  addRunStep(runId: string, step: Omit<RunStep, 'id' | 'ts'>) {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }
    const s: RunStep = { id: randomUUID(), ts: nowIso(), ...step };
    run.steps.push(s);
    run.updatedAt = nowIso();
    this.runs.set(run.id, run);
    return s;
  }

  completeRun(runId: string, status: 'completed' | 'failed') {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }
    run.status = status;
    run.updatedAt = nowIso();
    this.runs.set(run.id, run);
    return run;
  }

  getRun(runId: string) {
    return this.runs.get(runId);
  }
}


