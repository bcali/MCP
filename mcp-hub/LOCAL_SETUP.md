# Local MCP Hub Setup for Claude Code

## Step 1: Start the MCP Hub Server

```bash
cd mcp-hub
npm run dev
```

You should see:
```
2026-01-23T... [INFO] MCP Hub started { host: '0.0.0.0', port: 8080, endpoint: '/v1/sse', version: '0.1.0', environment: 'development' }
```

Verify it's running:
```bash
curl http://localhost:8080/healthz
# Response: {"ok":true}
```

## Step 2: Configure Claude Code

Claude Code can connect to MCP servers via configuration. Here are the options:

### Option A: Using MCP Settings File (Recommended)

Create or edit `~/.config/claude/mcp.json` (Linux/macOS) or `%APPDATA%\Claude\mcp.json` (Windows):

```json
{
  "mcpServers": {
    "hub-local": {
      "command": "node",
      "args": [],
      "url": "http://localhost:8080/v1/sse?key=N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs",
      "transport": "sse"
    }
  }
}
```

### Option B: Environment Variable

Set the MCP server URL as an environment variable:

**Windows (PowerShell):**
```powershell
$env:CLAUDE_MCP_HUB_URL = "http://localhost:8080/v1/sse?key=N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs"
```

**Linux/macOS:**
```bash
export CLAUDE_MCP_HUB_URL="http://localhost:8080/v1/sse?key=N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs"
```

### Option C: Project-Specific Config

Create `.claude/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "hub-local": {
      "url": "http://localhost:8080/v1/sse?key=N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs",
      "transport": "sse"
    }
  }
}
```

## Step 3: Test the Connection

Once configured, you can test the connection by asking Claude to use one of the MCP Hub tools:

Example prompts:
- "Use the memory_put tool to store a note"
- "List available MCP tools"
- "Create an artifact with type 'document'"

## Available Tools

Your local MCP Hub provides these tools:

### Memory Management
- `memory_put` - Store shared memory items
- `memory_get` - Retrieve memory by key
- `memory_search` - Search memory by query/tags

### Artifacts
- `artifact_create` - Create artifacts (documents, exports, etc.)
- `artifact_get` - Retrieve artifact by ID
- `artifact_list` - List artifacts by type

### Links
- `link_add` - Create typed links between entities
- `link_list` - List links with filters

### Runs (Execution Traces)
- `run_start` - Start a workflow run
- `run_step` - Add step to a run
- `run_complete` - Mark run as completed/failed

### Platform Connectors
- `figma_import` - Import Figma file metadata
- `github_put_file` - Create/update GitHub files
- `github_create_pr` - Create GitHub pull requests
- `confluence_upsert_page` - Create/update Confluence pages
- `slack_post_message` - Post Slack messages
- `gamma_generate` - Generate Gamma presentations/documents
- `gamma_get_status` - Check Gamma generation status
- `gamma_get_themes` - List available Gamma themes

## Configuration Details

**API Key**: `N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs`
- Already configured in `mcp-hub/.env`
- Required in the SSE URL query parameter

**Database**: In-memory mode (no Postgres required)
- Set via `DATABASE_URL=memory` in `.env`
- Data persists only while the server is running

**Port**: 8080 (configurable in `.env`)

## Switching to Cloud Run

When you're ready to use the deployed Cloud Run instance instead:

1. Update the URL to your Cloud Run endpoint:
   ```
   https://mcp-hub-6jzkdzuf2a-uc.a.run.app/v1/sse?key=YOUR_API_KEY
   ```

2. Data will persist across sessions (uses PostgreSQL on Supabase)

3. Automatic scale-to-zero (only runs when you use it)

## Troubleshooting

**"Connection refused" or "Cannot connect to MCP server":**
- Ensure MCP Hub is running: `curl http://localhost:8080/healthz`
- Check the server logs for errors
- Verify the API key matches in both `.env` and config

**Tools not showing up:**
- Restart Claude Code after updating MCP configuration
- Check MCP Hub logs for connection attempts
- Verify the SSE endpoint URL is correct

**Database errors:**
- Ensure `DATABASE_URL=memory` is set in `mcp-hub/.env`
- Check you're in the `mcp-hub` directory when running `npm run dev`

## Quick Reference

**Start server:**
```bash
cd mcp-hub && npm run dev
```

**Health check:**
```bash
curl http://localhost:8080/healthz/ready
```

**Stop server:**
Press `Ctrl+C` in the terminal running the server

**View logs:**
Logs appear in the console where `npm run dev` is running
