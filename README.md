# mcp-servers

This repo contains two Node.js Model Context Protocol (MCP) servers:

- **`mcp-hub/`**: Cloud-hosted MCP gateway with shared state (memory/artifacts/links/runs) and connectors (Figma/GitHub/Confluence/Slack).
- **`gamma-mcp-server/`**: MCP server for the Gamma Generate API.

## Deploy `mcp-hub` to the cloud (recommended: Cloud Run)

`mcp-hub` is built to run behind a single HTTPS endpoint and expose MCP over HTTP:

- **Health**: `/healthz`
- **MCP (SSE)**: `/v1/sse` (recommended for `mcp-remote`)
- **MCP (HTTP)**: `/mcp`

Both `/v1/sse` and `/mcp` are protected by an API key.

### Required environment variables (production)

- `MCP_HUB_API_KEY`: shared key clients pass via `?key=...` (or Authorization header if your client supports it)
- `DATABASE_URL`: Postgres connection string (Supabase is fine)

Optional (connectors / storage):

- `FIGMA_TOKEN`
- `GITHUB_TOKEN`
- `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`, `CONFLUENCE_BASE_URL`
- `SLACK_BOT_TOKEN`
- `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_REGION`

### Build & push container image (GitHub Actions → GHCR)

This repo includes a workflow that builds `mcp-hub` and pushes it to GHCR on every push to `main`:

- Image: `ghcr.io/<OWNER>/<REPO>/mcp-hub:latest`

Make sure **GitHub Packages** is enabled for the repo (GHCR).

### Deploy to Cloud Run (using the GHCR image)

1. Create a Cloud Run service (first deploy):

```bash
gcloud run deploy mcp-hub \
  --image ghcr.io/<OWNER>/<REPO>/mcp-hub:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars MCP_HUB_API_KEY="YOUR_KEY",DATABASE_URL="postgresql://...",HOST="0.0.0.0",PORT="8080"
```

2. (Recommended) Set Cloud Run **min instances = 1** to avoid cold starts for SSE.

### Optional: Deploy to Cloud Run from GitHub Actions (no local deploy)

This repo includes an **optional** workflow: `.github/workflows/mcp-hub-cloudrun.yml`.

It’s guarded and will only run after you add these **repo secrets**:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `GCP_PROJECT_ID`
- `GCP_REGION`
- `CLOUD_RUN_SERVICE`

Then it will deploy on push to `main` (and can also be run manually).

### Cursor `mcp.json` example

```json
{
  "mcpServers": {
    "hub": {
      "command": "mcp-remote",
      "args": ["https://YOUR_CLOUD_RUN_URL/v1/sse?key=YOUR_MCP_HUB_API_KEY"]
    }
  }
}
```

## Publishing this repo to GitHub

From the repo root:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:<OWNER>/<REPO>.git
git push -u origin main
```


