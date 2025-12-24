import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import type { BlobStore } from './r2.js';
import type { HubStore, ArtifactCreateInput, LinkAddInput, LinkListFilter } from './types.js';
import type { Artifact, Link, MemoryItem, Run, RunStep, Connection } from '../state.js';

const nowIso = () => new Date().toISOString();

export function createPgPool(databaseUrl: string) {
  const needsSsl = /sslmode=require/i.test(databaseUrl);
  return new Pool({
    connectionString: databaseUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });
}

export async function migrate(pool: Pool) {
  // Minimal schema, designed to be easy to evolve.
  // For Supabase, this runs in the public schema by default.
  await pool.query(`
    create table if not exists hub_memory (
      id uuid primary key,
      key text unique not null,
      value text not null,
      tags text[] not null default '{}',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists hub_memory_key_idx on hub_memory (key);
  `);

  await pool.query(`
    create table if not exists hub_artifacts (
      id uuid primary key,
      type text not null,
      name text,
      source text,
      content_type text,
      content_text text,
      content_r2_key text,
      metadata jsonb,
      created_at timestamptz not null default now()
    );

    create index if not exists hub_artifacts_type_idx on hub_artifacts (type);
  `);

  await pool.query(`
    create table if not exists hub_links (
      id uuid primary key,
      from_type text not null,
      from_id text not null,
      to_type text not null,
      to_id text not null,
      label text,
      url text,
      created_at timestamptz not null default now()
    );

    create index if not exists hub_links_from_idx on hub_links (from_type, from_id);
    create index if not exists hub_links_to_idx on hub_links (to_type, to_id);
  `);

  await pool.query(`
    create table if not exists hub_runs (
      id uuid primary key,
      name text not null,
      status text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists hub_runs_status_idx on hub_runs (status);
  `);

  await pool.query(`
    create table if not exists hub_run_steps (
      id uuid primary key,
      run_id uuid not null references hub_runs(id) on delete cascade,
      ts timestamptz not null default now(),
      kind text not null,
      message text not null,
      data jsonb
    );

    create index if not exists hub_run_steps_run_idx on hub_run_steps (run_id, ts);
  `);

  await pool.query(`
    create table if not exists hub_connections (
      id uuid primary key,
      name text not null,
      type text not null,
      endpoint text not null,
      api_key text,
      enabled boolean not null default true,
      metadata jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists hub_connections_enabled_idx on hub_connections (enabled);
  `);
}

export class PostgresStore implements HubStore {
  constructor(
    private pool: Pool,
    private blobs: BlobStore | null
  ) {}

  async upsertMemory(key: string, value: string, tags: string[]): Promise<MemoryItem> {
    const id = randomUUID();
    const res = await this.pool.query(
      `
      insert into hub_memory (id, key, value, tags)
      values ($1, $2, $3, $4)
      on conflict (key)
      do update set value = excluded.value, tags = excluded.tags, updated_at = now()
      returning id::text, key, value, tags, created_at, updated_at;
      `,
      [id, key, value, tags]
    );
    const row = res.rows[0] as any;
    return {
      id: row.id,
      key: row.key,
      value: row.value,
      tags: row.tags ?? [],
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  async getMemory(key: string): Promise<MemoryItem | null> {
    const res = await this.pool.query(
      `select id::text, key, value, tags, created_at, updated_at from hub_memory where key = $1 limit 1`,
      [key]
    );
    const row = res.rows[0] as any;
    if (!row) return null;
    return {
      id: row.id,
      key: row.key,
      value: row.value,
      tags: row.tags ?? [],
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  async searchMemory(query: string, tags?: string[]): Promise<MemoryItem[]> {
    const q = query?.trim() ?? '';
    const hasTags = tags?.length ? tags : null;

    const res = await this.pool.query(
      `
      select id::text, key, value, tags, created_at, updated_at
      from hub_memory
      where
        ($1 = '' or key ilike '%' || $1 || '%' or value ilike '%' || $1 || '%')
        and ($2::text[] is null or tags && $2::text[])
      order by updated_at desc
      limit 200
      `,
      [q, hasTags]
    );

    return res.rows.map((row: any) => ({
      id: row.id,
      key: row.key,
      value: row.value,
      tags: row.tags ?? [],
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
  }

  async createArtifact(input: ArtifactCreateInput): Promise<Artifact> {
    const id = randomUUID();
    const createdAt = nowIso();

    let contentText: string | null = input.contentText ?? null;
    let contentR2Key: string | null = null;

    // Offload large bodies to R2 if configured.
    if (this.blobs && contentText && contentText.length > 50_000) {
      contentR2Key = `artifacts/${id}.txt`;
      await this.blobs.putText(contentR2Key, contentText, input.contentType ?? 'text/plain; charset=utf-8');
      contentText = null;
    }

    await this.pool.query(
      `
      insert into hub_artifacts (id, type, name, source, content_type, content_text, content_r2_key, metadata, created_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
      `,
      [
        id,
        input.type,
        input.name ?? null,
        input.source ?? null,
        input.contentType ?? null,
        contentText,
        contentR2Key,
        input.metadata ? JSON.stringify(input.metadata) : null,
        createdAt,
      ]
    );

    return {
      id,
      type: input.type,
      name: input.name,
      source: input.source,
      contentType: input.contentType,
      contentText: input.contentText, // return the original text to the caller
      metadata: input.metadata,
      createdAt,
    };
  }

  async getArtifact(id: string): Promise<Artifact | null> {
    const res = await this.pool.query(
      `select id::text, type, name, source, content_type, content_text, content_r2_key, metadata, created_at from hub_artifacts where id = $1`,
      [id]
    );
    const row = res.rows[0] as any;
    if (!row) return null;

    let contentText: string | undefined = row.content_text ?? undefined;
    if (!contentText && row.content_r2_key && this.blobs) {
      contentText = await this.blobs.getText(row.content_r2_key);
    }

    return {
      id: row.id,
      type: row.type,
      name: row.name ?? undefined,
      source: row.source ?? undefined,
      contentType: row.content_type ?? undefined,
      contentText,
      metadata: row.metadata ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async listArtifacts(type?: string): Promise<Artifact[]> {
    const res = await this.pool.query(
      `
      select id::text, type, name, source, content_type, content_text, content_r2_key, metadata, created_at
      from hub_artifacts
      where ($1::text is null or type = $1::text)
      order by created_at desc
      limit 200
      `,
      [type ?? null]
    );

    return res.rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      name: row.name ?? undefined,
      source: row.source ?? undefined,
      contentType: row.content_type ?? undefined,
      contentText: row.content_text ?? undefined, // do not fetch R2 here (could be expensive); use artifact_get
      metadata: row.metadata ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  async addLink(input: LinkAddInput): Promise<Link> {
    const id = randomUUID();
    const createdAt = nowIso();

    await this.pool.query(
      `
      insert into hub_links (id, from_type, from_id, to_type, to_id, label, url, created_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [id, input.from.type, input.from.id, input.to.type, input.to.id, input.label ?? null, input.url ?? null, createdAt]
    );

    return {
      id,
      from: input.from,
      to: input.to,
      label: input.label,
      url: input.url,
      createdAt,
    };
  }

  async listLinks(filter?: LinkListFilter): Promise<Link[]> {
    const res = await this.pool.query(
      `
      select id::text, from_type, from_id, to_type, to_id, label, url, created_at
      from hub_links
      where
        ($1::text is null or from_type = $1::text)
        and ($2::text is null or from_id = $2::text)
        and ($3::text is null or to_type = $3::text)
        and ($4::text is null or to_id = $4::text)
      order by created_at desc
      limit 500
      `,
      [filter?.fromType ?? null, filter?.fromId ?? null, filter?.toType ?? null, filter?.toId ?? null]
    );

    return res.rows.map((row: any) => ({
      id: row.id,
      from: { type: row.from_type, id: row.from_id },
      to: { type: row.to_type, id: row.to_id },
      label: row.label ?? undefined,
      url: row.url ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  async startRun(name: string): Promise<Run> {
    const id = randomUUID();
    const ts = nowIso();
    await this.pool.query(`insert into hub_runs (id, name, status, created_at, updated_at) values ($1, $2, $3, $4, $5)`, [
      id,
      name,
      'running',
      ts,
      ts,
    ]);
    return { id, name, status: 'running', createdAt: ts, updatedAt: ts, steps: [] };
  }

  async addRunStep(runId: string, step: Omit<RunStep, 'id' | 'ts'>): Promise<RunStep> {
    const id = randomUUID();
    const ts = nowIso();
    await this.pool.query(
      `insert into hub_run_steps (id, run_id, ts, kind, message, data) values ($1, $2, $3, $4, $5, $6::jsonb)`,
      [id, runId, ts, step.kind, step.message, step.data ? JSON.stringify(step.data) : null]
    );
    await this.pool.query(`update hub_runs set updated_at = now() where id = $1`, [runId]);
    return { id, ts, ...step };
  }

  async completeRun(runId: string, status: 'completed' | 'failed'): Promise<Run> {
    const res = await this.pool.query(
      `update hub_runs set status = $2, updated_at = now() where id = $1 returning id::text, name, status, created_at, updated_at`,
      [runId, status]
    );
    const row = res.rows[0];
    if (!row) throw new Error(`Run not found: ${runId}`);
    const steps = await this.getRunSteps(runId);
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      steps,
    };
  }

  async getRun(runId: string): Promise<Run | null> {
    const res = await this.pool.query(
      `select id::text, name, status, created_at, updated_at from hub_runs where id = $1`,
      [runId]
    );
    const row = res.rows[0];
    if (!row) return null;
    const steps = await this.getRunSteps(runId);
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      steps,
    };
  }

  async listRuns(limit: number = 50): Promise<Run[]> {
    const res = await this.pool.query(
      `select id::text, name, status, created_at, updated_at from hub_runs order by created_at desc limit $1`,
      [limit]
    );
    return res.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      steps: [], // do not fetch steps for list to keep it fast
    }));
  }

  private async getRunSteps(runId: string): Promise<RunStep[]> {
    const res = await this.pool.query(
      `select id::text, ts, kind, message, data from hub_run_steps where run_id = $1 order by ts asc`,
      [runId]
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      ts: new Date(r.ts).toISOString(),
      kind: r.kind,
      message: r.message,
      data: r.data ?? undefined,
    }));
  }

  // Connections
  async addConnection(input: Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Connection> {
    const id = randomUUID();
    const ts = nowIso();
    await this.pool.query(
      `insert into hub_connections (id, name, type, endpoint, api_key, enabled, metadata, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)`,
      [id, input.name, input.type, input.endpoint, input.apiKey ?? null, input.enabled, input.metadata ? JSON.stringify(input.metadata) : null, ts, ts]
    );
    return { id, ...input, createdAt: ts, updatedAt: ts };
  }

  async listConnections(): Promise<Connection[]> {
    const res = await this.pool.query(`select id::text, name, type, endpoint, api_key, enabled, metadata, created_at, updated_at from hub_connections order by created_at desc`);
    return res.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      endpoint: r.endpoint,
      apiKey: r.api_key ?? undefined,
      enabled: r.enabled,
      metadata: r.metadata ?? undefined,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  }

  async deleteConnection(id: string): Promise<void> {
    await this.pool.query(`delete from hub_connections where id = $1`, [id]);
  }

  async updateConnection(id: string, updates: Partial<Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Connection> {
    const setClause: string[] = [];
    const values: any[] = [id];
    let i = 2;

    if (updates.name !== undefined) { setClause.push(`name = $${i++}`); values.push(updates.name); }
    if (updates.type !== undefined) { setClause.push(`type = $${i++}`); values.push(updates.type); }
    if (updates.endpoint !== undefined) { setClause.push(`endpoint = $${i++}`); values.push(updates.endpoint); }
    if (updates.apiKey !== undefined) { setClause.push(`api_key = $${i++}`); values.push(updates.apiKey); }
    if (updates.enabled !== undefined) { setClause.push(`enabled = $${i++}`); values.push(updates.enabled); }
    if (updates.metadata !== undefined) { setClause.push(`metadata = $${i++}::jsonb`); values.push(JSON.stringify(updates.metadata)); }

    setClause.push(`updated_at = now()`);

    const query = `update hub_connections set ${setClause.join(', ')} where id = $1 returning id::text, name, type, endpoint, api_key, enabled, metadata, created_at, updated_at`;
    const res = await this.pool.query(query, values);
    const r = res.rows[0];
    if (!r) throw new Error(`Connection not found: ${id}`);
    return {
      id: r.id,
      name: r.name,
      type: r.type,
      endpoint: r.endpoint,
      apiKey: r.api_key ?? undefined,
      enabled: r.enabled,
      metadata: r.metadata ?? undefined,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }
}


