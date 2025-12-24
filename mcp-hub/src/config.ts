import { z } from 'zod';

const EnvSchema = z.object({
  MCP_HUB_API_KEY: z.string().trim().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  HOST: z.string().trim().default('0.0.0.0'),

  // Persistence
  // - Optional for local dev (defaults to in-memory)
  // - Required in production
  DATABASE_URL: z.string().trim().min(1).optional(),

  // Cloudflare R2 (S3-compatible). If omitted, large artifact bodies won't be stored.
  R2_ENDPOINT: z.string().trim().optional(),
  R2_ACCESS_KEY_ID: z.string().trim().optional(),
  R2_SECRET_ACCESS_KEY: z.string().trim().optional(),
  R2_BUCKET: z.string().trim().optional(),
  R2_REGION: z.string().trim().default('auto'),

  FIGMA_TOKEN: z.string().trim().optional(),
  GITHUB_TOKEN: z.string().trim().optional(),

  ATLASSIAN_EMAIL: z.string().trim().optional(),
  ATLASSIAN_API_TOKEN: z.string().trim().optional(),
  CONFLUENCE_BASE_URL: z.string().trim().optional(),
  JIRA_BASE_URL: z.string().trim().optional(),

  SLACK_BOT_TOKEN: z.string().trim().optional(),
  GAMMA_API_KEY: z.string().trim().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const env = EnvSchema.parse(process.env);

  if (process.env.NODE_ENV === 'production' && !env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required in production (set to a Postgres connection string).');
  }

  return env;
}
