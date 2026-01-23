# MCP Hub Development Scripts

Scripts to start and stop the MCP Hub development server.

## Quick Start (Recommended)

The simplest way to run MCP Hub locally:

```bash
cd mcp-hub
npm run dev
```

The server will start on `http://localhost:8080`

Press `Ctrl+C` to stop the server.

## Automated Scripts (Optional)

### Windows (PowerShell)

**Start server:**
```powershell
powershell -ExecutionPolicy Bypass -File mcp-hub/scripts/start-dev.ps1
```

**Stop server:**
```powershell
powershell -ExecutionPolicy Bypass -File mcp-hub/scripts/stop-dev.ps1
```

### Linux/macOS (Bash)

**Start server:**
```bash
bash mcp-hub/scripts/start-dev.sh
```

**Stop server:**
```bash
bash mcp-hub/scripts/stop-dev.sh
```

## VS Code Integration

The `.vscode/tasks.json` file includes tasks to start/stop the server:
- Press `Ctrl+Shift+P` → "Tasks: Run Task" → "Start MCP Hub (Dev)"
- Or let it auto-start when you open the folder (configured via `runOptions.runOn`)

## Health Checks

Verify the server is running:

```bash
# Basic health check
curl http://localhost:8080/healthz

# Readiness check (includes database connectivity)
curl http://localhost:8080/healthz/ready
```

## Logs

When running with `npm run dev`, logs are output to the console.

When running with automated scripts:
- **PowerShell**: Use `Receive-Job -Id <job-id>` (job ID shown at startup)
- **Bash**: Logs to `/tmp/mcp-hub.log` and `/tmp/mcp-hub-error.log`

## Configuration

The server uses [mcp-hub/.env](../.env) for configuration:
- `DATABASE_URL=memory` - In-memory mode (no Postgres required)
- `MCP_HUB_API_KEY` - API key for authentication
- `PORT=8080` - HTTP port
- `HOST=0.0.0.0` - Listen on all interfaces

## Troubleshooting

**Server won't start:**
1. Check if port 8080 is already in use: `netstat -ano | findstr :8080` (Windows) or `lsof -i :8080` (Linux/macOS)
2. Check dependencies are installed: `npm install` in the `mcp-hub` directory
3. Verify the `.env` file exists and has correct values

**Server starts but health check fails:**
1. Wait 5-10 seconds for the server to fully initialize
2. Check the logs for errors
3. Ensure you're using `http://localhost:8080` (not `https://`)
