import type { Env } from '../config.js';
import { createR2BlobStore } from './r2.js';
import { createPgPool, migrate, PostgresStore } from './postgres.js';
import type { HubStore } from './types.js';
import { MemoryStore } from './memory.js';

export async function createStore(env: Env): Promise<HubStore> {
  // Local dev convenience: allow running without Postgres.
  // Use DATABASE_URL=memory (or omit DATABASE_URL entirely) to run in-memory.
  if (!env.DATABASE_URL || env.DATABASE_URL.toLowerCase() === 'memory') {
    console.error('[mcp-hub] Using in-memory store (set DATABASE_URL to Postgres for persistence).');
    return new MemoryStore();
  }

  const blobs = createR2BlobStore(env);
  const pool = createPgPool(env.DATABASE_URL);
  await migrate(pool);
  return new PostgresStore(pool, blobs);
}




