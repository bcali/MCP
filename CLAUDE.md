# CLAUDE.md

> **Context file for AI assistants** - This document helps Claude (and other AI assistants) understand the MCP Servers monorepo project architecture, patterns, and ongoing work.

**Last Updated**: 2026-01-23

---

## Project Overview

This is a **Model Context Protocol (MCP) servers monorepo** designed for both local and cloud-hosted environments. The project consists of three main components:

1. **MCP Hub** - A production-ready cloud MCP gateway that centralizes access to multiple tools
2. **MCP Console** - A modern web-based management dashboard for the MCP Hub
3. **Gamma MCP Server** - An MCP server for the Gamma Generate API (presentations/documents)

### Core Value Proposition
- Centralized access to multiple third-party APIs (Figma, GitHub, Confluence, Slack, Gamma) via a single MCP endpoint
- Persistent cross-session state (memory, artifacts, links, runs)
- Cloud-native design with SSE support and session affinity
- Production resilience patterns (circuit breaker, bulkhead, timeout)

---

## Architecture Decisions

### 1. MCP Hub Architecture ([mcp-hub](mcp-hub))

**Technology Stack**:
- **Runtime**: Node.js with TypeScript (ES modules)
- **Framework**: Express.js for HTTP/SSE transport
- **Protocol**: MCP SDK (`@modelcontextprotocol/sdk`) with SSE transport
- **Persistence**: PostgreSQL (Supabase) with fallback to in-memory store
- **Blob Storage**: AWS S3-compatible (R2) for large artifacts
- **Validation**: Zod for schema validation

**Key Patterns**:
- **State Management**: Centralized `HubStore` interface with pluggable implementations (PostgresStore, MemoryStore)
- **Idempotent Events**: Uses deterministic event IDs (SHA-256 hash of `source:sourceEventId`) to prevent duplicate writes
- **Resilience**: Per-connector circuit breakers, bulkheads (concurrency limits), and timeouts
- **Tool Registration**: Plugin-style tool registration with each connector (Figma, GitHub, etc.) providing its own tools

**Core Data Primitives** ([mcp-hub/src/state.ts](mcp-hub/src/state.ts)):
```typescript
MemoryItem   // Key-value store with tags and search
Artifact     // Typed content (presentations, documents, images)
Link         // Relationships between entities
Run          // Execution traces with steps
Connection   // Dynamic upstream MCP server connections
```

**Authentication**: API key-based (`MCP_HUB_API_KEY` env var) for both SSE connections and REST API

**Endpoints**:
- `/v1/sse` - MCP protocol over SSE (primary interface for clients like Cursor)
- `/v1/status`, `/v1/tools`, `/v1/runs`, `/v1/connections` - Management REST API for Console

### 2. MCP Console Architecture ([mcp-console](mcp-console))

**Technology Stack**:
- **Framework**: React 18.3 with TypeScript
- **Build Tool**: Vite 6.3
- **UI Library**: Material-UI 7.3 + Radix UI primitives + Tailwind CSS 4.1
- **Routing**: React Router DOM v7
- **Charts**: Recharts for execution analytics
- **Styling**: Emotion + Tailwind with design system patterns

**Design Pattern**: Single-page application (SPA) that communicates with MCP Hub's REST API

**Key Features**:
- Real-time server monitoring (uptime, version, active sessions)
- Tool catalog browser (all registered MCP tools with schemas)
- Execution history viewer (detailed traces of tool runs)
- Connection manager (configure/test upstream MCP servers)

### 3. Gamma MCP Server ([gamma-mcp-server](gamma-mcp-server))

**Technology Stack**:
- **Runtime**: Node.js with TypeScript
- **Protocol**: MCP SDK (stdio transport)
- **API Client**: Axios for Gamma API calls
- **Validation**: Zod for input validation

**Purpose**: Wrapper around Gamma Generate API to create presentations, documents, and social cards through MCP tools

---

## Current Work & Recent Changes

### Recent Commits (Last 5)
1. `be229cd` - Fix: remove duplicate property in tool schema and ensure all event IDs are correctly cast
2. `f5dbea4` - Fix: explicit type casting for generateEventId arguments to satisfy TS compiler
3. `2269f3e` - **Feat: implement idempotent event writes with deterministic IDs**
4. `5b83287` - **Feat: implement health + blast radius control (circuit breaker, bulkhead, timeout)**
5. `42faa72` - Feat: show internal connectors in connections list

### Active Work Areas

**Branch**: `main`

**Modified Files** (from git status):
- Deployment configs: `.github/workflows/deploy-console.yml`, `.github/workflows/mcp-hub-container.yml`
- Console UI: Multiple React components (Dashboard, Connections, AddConnection, Runs, ToolsCatalog)
- Hub core: `mcp-hub/src/state.ts`, `mcp-hub/src/store/types.ts`
- Gamma integration: `mcp-hub/src/tools/gamma.ts`, `mcp-hub/src/tools/gamma-constants.ts`
- Resilience: `mcp-hub/src/utils/resilience.ts`, `mcp-hub/src/utils/id.ts`

**Untracked Directories**:
- `ai-personal-shopping-concierge/` - New MCP server (not yet committed)
- `gamma-mcp-server/scripts/generate-opera-integration.ts` - New script

### Key Features Recently Added

1. **Idempotent Event Writes** ([mcp-hub/src/utils/id.ts](mcp-hub/src/utils/id.ts))
   - Deterministic event ID generation using SHA-256 hashing
   - Prevents duplicate writes from external systems (Gamma events, etc.)
   - Pattern: `hash(source + ":" + sourceEventId)` → unique event ID

2. **Resilience Patterns** ([mcp-hub/src/utils/resilience.ts](mcp-hub/src/utils/resilience.ts))
   - **Circuit Breaker**: Prevents cascading failures (5 failures → OPEN, 5 min reset)
   - **Bulkhead**: Limits concurrent requests per connector (max 5 concurrent)
   - **Timeout**: Enforces operation time limits
   - **ResilienceRegistry**: Per-connector isolation of resilience controls

3. **Internal Connectors Visibility**
   - Console now shows built-in connectors (Figma, GitHub, Confluence, Slack, Gamma) in connections list
   - Previously only showed dynamically added upstream MCP servers

---

## Development Patterns & Conventions

### Code Style
- **Modules**: ES modules (`"type": "module"` in package.json)
- **Imports**: Use `.js` extensions in TypeScript imports (ES module requirement)
- **Error Handling**: Use MCP SDK's `McpError` with `ErrorCode` enum
- **Async**: Prefer `async/await` over promises

### Naming Conventions
- **Files**: kebab-case (e.g., `gamma-constants.ts`, `resilience.ts`)
- **Types/Interfaces**: PascalCase (e.g., `MemoryItem`, `HubStore`)
- **Functions**: camelCase (e.g., `generateEventId`, `createStore`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `STATIC_TOOLS`, `MCP_HUB_API_KEY`)

### State Management Pattern
All state operations go through the `HubStore` interface ([mcp-hub/src/store/types.ts](mcp-hub/src/store/types.ts)):
```typescript
interface HubStore {
  // Memory operations
  upsertMemory(key: string, value: string, tags?: string[], eventId?: string): Promise<MemoryItem>
  getMemory(key: string): Promise<MemoryItem | undefined>
  searchMemory(query: string, tags?: string[]): Promise<MemoryItem[]>

  // Artifact operations
  createArtifact(input: Omit<Artifact, 'id' | 'createdAt'>): Promise<Artifact>
  // ... etc
}
```

**Why**: Allows swapping between PostgresStore (production) and MemoryStore (local dev) without code changes

### Tool Registration Pattern
Each connector (Figma, GitHub, etc.) registers its tools with the MCP server:
```typescript
// In tools/gamma.ts
export function registerGammaTools(server: Server, store: HubStore, env: Env) {
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'gamma_create_presentation') {
      // Handle tool call
    }
  });
}
```

### Resilience Wrapper Pattern
External API calls wrapped with resilience controls:
```typescript
const breaker = resilienceRegistry.getBreaker('gamma');
const bulkhead = resilienceRegistry.getBulkhead('gamma');

if (breaker.isOpen()) {
  throw new McpError(ErrorCode.InternalError, 'Circuit breaker is open for Gamma');
}

await bulkhead.execute(async () => {
  return await withTimeout(
    axios.post(GAMMA_API_URL, payload),
    30000,
    'Gamma API request timed out'
  );
});
```

---

## Key Files & Locations

### MCP Hub Core
- [mcp-hub/src/index.ts](mcp-hub/src/index.ts) - Entry point, Express server setup, SSE transport
- [mcp-hub/src/state.ts](mcp-hub/src/state.ts) - In-memory state implementation (legacy, now wrapped by MemoryStore)
- [mcp-hub/src/store/index.ts](mcp-hub/src/store/index.ts) - Store factory (Postgres vs Memory)
- [mcp-hub/src/store/postgres.ts](mcp-hub/src/store/postgres.ts) - PostgreSQL persistence layer
- [mcp-hub/src/tools.ts](mcp-hub/src/tools.ts) - Tool registration orchestrator

### Connectors (MCP Hub)
- [mcp-hub/src/tools/gamma.ts](mcp-hub/src/tools/gamma.ts) - Gamma API integration
- [mcp-hub/src/tools/figma.ts](mcp-hub/src/tools/figma.ts) - Figma API integration
- [mcp-hub/src/tools/github.ts](mcp-hub/src/tools/github.ts) - GitHub API integration
- [mcp-hub/src/tools/confluence.ts](mcp-hub/src/tools/confluence.ts) - Confluence API integration
- [mcp-hub/src/tools/slack.ts](mcp-hub/src/tools/slack.ts) - Slack API integration

### Utilities (MCP Hub)
- [mcp-hub/src/utils/resilience.ts](mcp-hub/src/utils/resilience.ts) - Circuit breaker, bulkhead, timeout
- [mcp-hub/src/utils/id.ts](mcp-hub/src/utils/id.ts) - Deterministic event ID generation
- [mcp-hub/src/auth.ts](mcp-hub/src/auth.ts) - API key authentication middleware
- [mcp-hub/src/config.ts](mcp-hub/src/config.ts) - Environment variable loading

### Console Frontend
- [mcp-console/src/app/App.tsx](mcp-console/src/app/App.tsx) - Main app component with routing
- [mcp-console/src/app/components/Dashboard.tsx](mcp-console/src/app/components/Dashboard.tsx) - Server status dashboard
- [mcp-console/src/app/components/ToolsCatalog.tsx](mcp-console/src/app/components/ToolsCatalog.tsx) - Tool browser
- [mcp-console/src/app/components/Runs.tsx](mcp-console/src/app/components/Runs.tsx) - Execution history viewer
- [mcp-console/src/app/components/Connections.tsx](mcp-console/src/app/components/Connections.tsx) - Connection manager
- [mcp-console/src/app/services/api.ts](mcp-console/src/app/services/api.ts) - API client for MCP Hub

### Deployment
- [.github/workflows/mcp-hub-container.yml](.github/workflows/mcp-hub-container.yml) - Docker build/push for MCP Hub
- [.github/workflows/mcp-hub-cloudrun.yml](.github/workflows/mcp-hub-cloudrun.yml) - Google Cloud Run deployment
- [.github/workflows/deploy-console.yml](.github/workflows/deploy-console.yml) - Static site deployment for Console

---

## Environment Variables

### MCP Hub Required
- `MCP_HUB_API_KEY` - API key for authentication (both SSE and REST API)
- `DATABASE_URL` - PostgreSQL connection string (or "memory" for in-memory mode)
- `PORT` - HTTP server port (default: 8000)
- `HOST` - HTTP server host (default: 0.0.0.0)

### MCP Hub Optional (Connectors)
- `GAMMA_API_KEY` - Gamma Generate API key
- `FIGMA_ACCESS_TOKEN` - Figma personal access token
- `GITHUB_TOKEN` - GitHub personal access token
- `CONFLUENCE_URL`, `CONFLUENCE_EMAIL`, `CONFLUENCE_API_TOKEN` - Confluence credentials
- `SLACK_BOT_TOKEN` - Slack bot token

### MCP Hub Optional (Storage)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` - R2 blob storage

### MCP Console
- `VITE_MCP_HUB_URL` - MCP Hub API base URL
- `VITE_MCP_HUB_API_KEY` - API key for Hub REST API

---

## Discussion History

### Session 2026-01-23: CLAUDE.md Creation
**Context**: User requested to create a CLAUDE.md file to track project context and conversations.

**Decision**: Placed CLAUDE.md at monorepo root with comprehensive sections:
- Project overview and architecture
- Technology stack details
- Recent work and active changes
- Development patterns and conventions
- Key file locations
- Discussion history (this section)

**Purpose**: Enable Claude to maintain context across sessions about:
- What the project does and why
- How it's architected
- What we're currently working on
- Where to find things
- What we've discussed before

### Session 2026-01-23: Production Improvements & Auto-Start Implementation
**Context**: User requested analysis of the codebase and implementation of improvements to make MCP Hub easier to run locally while supporting cloud deployment.

**Goals**:
1. Improve code/architecture without changing platforms (GCP, Supabase)
2. Get the system running again (local dev)
3. Enable auto-start when Claude Code sessions begin

**Implementation Summary**:

#### A. Startup Scripts Created
Created automated startup/shutdown scripts for both Windows and Linux:
- [mcp-hub/scripts/start-dev.ps1](mcp-hub/scripts/start-dev.ps1) - Windows PowerShell script
- [mcp-hub/scripts/start-dev.sh](mcp-hub/scripts/start-dev.sh) - Linux/macOS Bash script
- [mcp-hub/scripts/stop-dev.ps1](mcp-hub/scripts/stop-dev.ps1) - Windows stop script
- [mcp-hub/scripts/stop-dev.sh](mcp-hub/scripts/stop-dev.sh) - Linux/macOS stop script

Features:
- Auto-check if server already running (prevents duplicates)
- Auto-install dependencies if missing
- Health check polling (waits up to 30s for server ready)
- Background process management with PID tracking
- Proper logging to temp directory

#### B. VS Code Integration
Created [.vscode/tasks.json](.vscode/tasks.json) with tasks:
- "Start MCP Hub (Dev)" - Auto-runs on folder open (via `runOptions.runOn`)
- "Stop MCP Hub (Dev)" - Manual shutdown task

Cross-platform support (Windows/Linux/macOS) with appropriate script selection.

#### C. Architecture Improvements

1. **Structured Logging** ([mcp-hub/src/utils/logger.ts](mcp-hub/src/utils/logger.ts))
   - Development mode: Human-readable timestamps + context
   - Production mode: JSON structured logs for GCP Cloud Logging
   - Context-aware error logging with stack traces

2. **Health Checks** ([mcp-hub/src/index.ts](mcp-hub/src/index.ts))
   - `/healthz` - Basic liveness probe (existing)
   - `/healthz/ready` - NEW: Readiness probe with database connectivity check
   - Returns detailed status (database connected/disconnected, version)

3. **Graceful Shutdown** ([mcp-hub/src/index.ts](mcp-hub/src/index.ts))
   - SIGTERM/SIGINT handlers for Cloud Run compatibility
   - Closes HTTP server gracefully
   - Terminates all active SSE connections cleanly
   - 1-second grace period before exit
   - Proper logging of shutdown process

4. **Connection Pool Optimization** ([mcp-hub/src/store/postgres.ts](mcp-hub/src/store/postgres.ts))
   - Increased max connections: 5 → 10 (better throughput)
   - Set min connections: 0 (enables true scale-to-zero)
   - Idle timeout: 30s (releases unused connections quickly)
   - Connection timeout: 5s (fast failure detection)
   - `allowExitOnIdle: true` (clean shutdown support)

5. **TypeScript Fixes** ([mcp-hub/src/tools.ts](mcp-hub/src/tools.ts))
   - Fixed type errors in `generateEventId` calls
   - Removed unnecessary `as string` type assertions (Zod already validates)
   - Build now compiles cleanly

#### D. Cloud Run Scale-to-Zero Configuration
Updated [.github/workflows/mcp-hub-cloudrun.yml](.github/workflows/mcp-hub-cloudrun.yml):
- `--min-instances 0` - Scale to zero when idle (cost savings)
- `--max-instances 3` - Limit blast radius and cost
- `--cpu 1` - 1 vCPU per instance
- `--memory 512Mi` - Sufficient for MCP Hub workload
- `--timeout 300` - 5-minute request timeout
- `--concurrency 80` - Max 80 concurrent requests per instance
- `--cpu-throttling` - Reduce cost when idle
- `--startup-cpu-boost` - Faster cold starts
- `NODE_ENV=production` - Enables production logging mode

**Cost Impact**:
- Previous: ~$15-50/month (always-on)
- New: ~$1-5/month (pay only for usage)
- Cold start penalty: 2-5 seconds on first request after idle

**Usage Pattern**: Perfect for development/personal use where server runs only during active Claude Code sessions.

#### E. Local Development Workflow

**Quick Start**:
```bash
# Option 1: Manual start (recommended for first time)
cd mcp-hub
npm run dev

# Option 2: Automated start
powershell -ExecutionPolicy Bypass -File mcp-hub/scripts/start-dev.ps1  # Windows
bash mcp-hub/scripts/start-dev.sh  # Linux/macOS

# Option 3: VS Code task (auto-runs on folder open)
# Just open the workspace in VS Code
```

**Configuration**: Uses [mcp-hub/.env](mcp-hub/.env):
- `DATABASE_URL=memory` - In-memory mode (no Postgres required locally)
- `MCP_HUB_API_KEY` - Already configured
- `PORT=8080`, `HOST=0.0.0.0` - Standard settings

**Next Steps for User**:
1. Test startup: `cd mcp-hub && npm run dev`
2. Verify health: `curl http://localhost:8080/healthz`
3. Connect from Claude Code (update config to point to `http://localhost:8080/v1/sse?key=...`)
4. Deploy to Cloud Run (next push to main will auto-deploy with scale-to-zero)

---

## Next Steps & Open Questions

### Untracked Work
- `ai-personal-shopping-concierge/` - New MCP server project (purpose unknown)
- `gamma-mcp-server/scripts/generate-opera-integration.ts` - New integration script

### Potential Areas for Discussion
- Should the new `ai-personal-shopping-concierge` be integrated into the monorepo structure?
- What is the Opera integration for Gamma?
- Are there additional resilience patterns needed (retry with backoff, rate limiting)?
- Should the Console support real-time updates via WebSocket/SSE?

---

## How to Use This File

**For Claude (or other AI assistants)**:
- Read this file at the start of each session to understand project context
- Update the "Discussion History" section after significant conversations
- Update "Recent Commits" and "Active Work Areas" when new work begins
- Add new architectural decisions as they're made

**For Humans**:
- Use as a handoff document when bringing new developers/AI assistants into the project
- Update when making significant architectural changes
- Reference when onboarding to understand "why" decisions were made

---

**Remember**: This is a living document. Keep it updated as the project evolves!
