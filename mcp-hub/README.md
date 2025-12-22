# MCP Hub (Cloud MCP Gateway)

One **cloud-hosted** MCP server that centralizes tool access (Figma, GitHub, Confluence, Slack, Gamma, etc.) and enables **shared state** (memory/artifacts/links/runs) across all connected platforms.

## Why this exists

Instead of running many separate MCP servers (each with its own state), this hub becomes the single endpoint your clients connect to. Tools share:

- **Artifacts**: design exports, docs, code patches, etc.
- **Links**: typed relationships between objects (Figma ↔ PR ↔ Confluence, etc.)
- **Runs**: durable workflow logs for end-to-end traceability
- **Memory**: requirements/notes/decisions, centrally searchable

## Local run

1. Copy `.env.example` → `.env`
2. Set `MCP_HUB_API_KEY`
3. Set `DATABASE_URL` (Supabase Postgres)
3. Start dev server:

```bash
npm install
npm run dev
```

## Supabase setup (Postgres)

You’ll need a Supabase account + a project (free tier is fine).

1. Create a project in Supabase.
2. Go to **Project Settings → Database** and copy the **Connection string** (URI).
3. Put it in `.env` as `DATABASE_URL` and ensure SSL is required (Supabase typically uses `sslmode=require`).

Example:

`postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require`

## Cursor integration (recommended)

You already use `mcp-remote` for Atlassian SSE. Do the same for this hub.

Example `mcp.json` entry:

```json
{
  "mcpServers": {
    "hub": {
      "command": "mcp-remote",
      "args": ["https://YOUR_DOMAIN/v1/sse?key=YOUR_MCP_HUB_API_KEY"]
    }
  }
}
```

## Deployed hosting (Cloud Run)

This repo is designed to be deployed as a container.

High-level flow:

- Build & push container
- Deploy to Cloud Run
- Set env vars (especially `MCP_HUB_API_KEY`)
- Put Cloudflare Access (GitHub SSO) in front (optional; recommended)

### One-time deploy (manual)

```bash
# From repo root
gcloud run deploy mcp-hub \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars MCP_HUB_API_KEY="YOUR_KEY",HOST="0.0.0.0",PORT="8080"
```

Notes:
- You can keep `--allow-unauthenticated` on Cloud Run and enforce access at the edge (Cloudflare Access),
  or lock Cloud Run down and use a private ingress. For a single-user setup, Cloudflare Access is usually the cleanest.
- For reliability, set **min instances = 1** (small monthly cost, avoids cold starts).

## Cloudflare R2 setup (optional, for large artifacts)

You’ll need a Cloudflare account. R2 generally requires adding a payment method.

1. Create an R2 bucket (e.g. `mcp-hub`)
2. Create an R2 API token / access keys
3. Configure:
   - `R2_ENDPOINT`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET`

If R2 is not configured, artifacts will still work; large bodies will remain in Postgres.

## Tools (current)

### Shared primitives

- `memory_put`, `memory_get`, `memory_search`
- `artifact_create`, `artifact_get`, `artifact_list`
- `link_add`, `link_list`
- `run_start`, `run_step`, `run_complete`

### Connectors (initial)

- `figma_import` (requires `FIGMA_TOKEN`)
- `github_put_file`, `github_create_pr` (requires `GITHUB_TOKEN`)
- `confluence_upsert_page` (requires `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`, `CONFLUENCE_BASE_URL`)
- `slack_post_message` (requires `SLACK_BOT_TOKEN`)

## Notes

This initial version uses **in-memory** storage for the shared primitives. Next step is swapping in persistent storage (Postgres + object storage) so state survives restarts and supports long-lived workflows.

# Name
### mcp-hub

# Synopsis


# Description

# Example

# Install:
`npm install mcp-hub`

# Test:
`npm test`

#License:
ISC
