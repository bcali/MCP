# MCP Hub (Cloud MCP Gateway)

A centralized, cloud-hosted MCP server that provides shared state and platform connectors across all your AI assistant sessions.

## 🌟 Why MCP Hub?

Instead of managing separate MCP servers for every tool, the Hub becomes your single point of entry. It enables:

- **🧠 Shared Memory**: Persistent requirements, decisions, and notes searchable across chats.
- **📄 Artifact Management**: Durable storage for generated docs, code patches, and design exports.
- **🔗 Typed Linking**: Create relationships between objects (e.g., Figma File ↔ PR ↔ Confluence Page).
- **🛤️ Durable Runs**: End-to-end traceability for complex autonomous workflows.

## 🔌 Built-in Connectors

| Service | Tools |
| :--- | :--- |
| **GitHub** | `github_put_file`, `github_create_pr` |
| **Slack** | `slack_post_message` |
| **Confluence** | `confluence_upsert_page` |
| **Figma** | `figma_import` |

## 🚀 Deployment

The Hub is designed to be deployed as a container on **Google Cloud Run**.

### Prerequisites
- A Google Cloud Project
- A Postgres Database (e.g., [Supabase](https://supabase.com))
- (Optional) Cloudflare R2 for large artifact storage

### Required Environment Variables
- `MCP_HUB_API_KEY`: Your secret key for client authentication.
- `DATABASE_URL`: Postgres connection string.
- `PORT`: 8080 (handled by Cloud Run).
- `HOST`: 0.0.0.0.

### Automated Deploy (GitHub Actions)
This repository includes a CI/CD pipeline that deploys to Cloud Run on every push to `main`. To use it, set the following secrets in your GitHub repository:
- `GCP_WIF_PROVIDER`: Workload Identity Provider resource name.
- `GCP_SERVICE_ACCOUNT`: Deployment service account email.
- `GCP_PROJECT_ID`: Your GCP Project ID.
- `GCP_REGION`: e.g., `us-central1`.
- `CLOUD_RUN_SERVICE`: e.g., `mcp-hub`.
- `MCP_HUB_API_KEY`: Your chosen API key.
- `DATABASE_URL`: Your Supabase URI.

## 💻 Local Development

1. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your keys
   ```

2. **Install & Run**:
   ```bash
   npm install
   npm run dev
   ```

## 🛠️ Architecture Notes
- **SSE Transport**: Uses standard Server-Sent Events for high compatibility.
- **Session Affinity**: Required for Cloud Run to ensure POST commands reach the correct established SSE stream.
- **Stateless Core**: All state is offloaded to Postgres and R2.
- **Management API**: Exposes `/v1/status` and `/v1/runs` for the [MCP Console](../mcp-console).

## 📜 License
MIT
# Trigger deployment after Supabase activation
