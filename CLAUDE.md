# CLAUDE.md

> **Context file for AI assistants** - This document helps Claude (and other AI assistants) understand the MCP Servers monorepo project architecture, patterns, and ongoing work.

**Last Updated**: 2026-01-30

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
1. `05723a9` - chore: add .mcp.json to gitignore
2. `27c8308` - docs: document BC Prompt Library integration and complete connector setup session
3. `9f4e59d` - feat: add all connector tokens to Cloud Run deployment
4. `a5d1c9e` - feat: add BC Prompt Library to connections list
5. `961bff3` - feat: integrate BC Prompt Library into MCP Hub

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

### Session 2026-01-27: Cloud Run Deployment & Monitoring Setup
**Context**: User wanted to deploy MCP Hub to Cloud Run and access the web dashboard. Multiple deployment issues were encountered and resolved.

**Goals**:
1. Fix Cloud Run deployment failures
2. Get the dashboard accessible
3. Implement monitoring to prevent future issues

**Problems Encountered**:

#### 1. Incorrect gcloud Flag
**Error**: `unrecognized arguments: --startup-cpu-boost (did you mean '--cpu-boost'?)`
**Cause**: Used wrong flag name in Cloud Run deployment workflow
**Fix**: Changed `--startup-cpu-boost` to `--cpu-boost` in [.github/workflows/mcp-hub-cloudrun.yml](.github/workflows/mcp-hub-cloudrun.yml)
**Commit**: `a7e9d3a`

#### 2. Container Startup Timeout
**Error**: "The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable within the allocated timeout"
**Cause**: Container built successfully but failed to start listening on port 8080
**Investigation**: Checked Cloud Run logs, found DNS resolution failure

#### 3. Supabase Database Paused (Root Cause)
**Error**: `getaddrinfo ENOTFOUND db.zsksxijnmxfsolilxihy.supabase.co`
**Cause**: Supabase free tier pauses databases after 7 days of inactivity
**Impact**: 
- Database connection attempted BEFORE HTTP server started listening
- Cloud Run timed out waiting for port 8080
- 3 failed deployments
**Fix**: Resumed Supabase database in dashboard
**Commit**: `e6199c0` (triggered new deployment)
**Result**: ✅ Deployment succeeded!

**Architectural Insight**:
The startup sequence in [mcp-hub/src/index.ts](mcp-hub/src/index.ts) is:
```typescript
const env = loadEnv();
const store = await createStore(env);  // ← Connects to DB first
// ... later ...
app.listen(env.PORT, env.HOST, ...)    // ← HTTP server starts second
```

This means if the database is slow/unreachable, the container never starts listening, and Cloud Run kills it.

**Implementation Summary**:

#### A. Console Configuration Fixed
- Updated [mcp-console/src/app/config.ts](mcp-console/src/app/config.ts) to use correct API key
- Changed default URL to `http://localhost:8080` for local dev
- Added warning for missing API key in production

#### B. Monitoring & Metrics Added
Created comprehensive monitoring documentation:
- [MONITORING.md](MONITORING.md) - Complete observability guide
- [mcp-hub/src/utils/metrics.ts](mcp-hub/src/utils/metrics.ts) - Metrics collection utility

**Metrics to Track**:
1. **Startup Health**: Database connection time, total startup time, errors
2. **Database Connection Pool**: Total/idle/waiting connections
3. **Tool Execution**: Success rate, duration, failures by tool
4. **Circuit Breaker Status**: State, failure count, retry timing

#### C. Deployment Workflow Improvements
- Removed conflicting `--cpu-throttling` flag
- Kept `--cpu-boost` for faster cold starts
- Scale-to-zero configuration working (min-instances: 0)

#### D. Documentation Updates
- [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md) - Comprehensive deployment guide
- [PRD.md](PRD.md) - Product requirements document created
- [MONITORING.md](MONITORING.md) - Monitoring strategy and lessons learned

**Key Learnings**:

1. **Supabase Free Tier Limitation**: Databases pause after inactivity
   - Solution: Use connection pooler for serverless
   - Alternative: Upgrade to paid tier to prevent pausing
   - Mitigation: Add retry logic with exponential backoff

2. **Startup Sequence Matters**: Database connection blocks server startup
   - Current: Synchronous database connection before HTTP server
   - Consider: Async database initialization with health checks

3. **Cloud Run Debugging**: Logs are critical
   - Always check Cloud Run logs for startup failures
   - Look for DNS errors, connection timeouts, etc.
   - GCP Console → Cloud Run → Service → Logs

4. **Monitoring Prevents Issues**: 
   - Track startup time to detect slow databases
   - Monitor connection pool to prevent exhaustion
   - Alert on circuit breaker state changes

**Cost Impact**:
- ✅ Scale-to-zero working: $0 when idle
- ✅ Expected cost: $1-5/month for personal use
- ✅ Cold start: 3-5 seconds (acceptable for this use case)

**Dashboard Status**:
- ✅ Cloud Run URL: Working (after Supabase resume)
- ✅ Console: Deployed at https://bcali.github.io/MCP/
- ⚠️ Console → Cloud Run connection: Needs URL update (currently points to localhost)

**Next Steps**:
1. Add metrics endpoints to MCP Hub (`/v1/metrics/*`)
2. Set up GCP monitoring dashboard
3. Configure alerting policies
4. Update console to use Cloud Run URL instead of localhost

---

### Session 2026-01-28: BC Prompt Library Integration & Complete Connector Setup
**Context**: User requested integration of their BC Prompt Library into MCP Hub and complete configuration of all connector tokens for production deployment.

**Goals**:
1. Integrate BC Prompt Library into MCP Hub
2. Fix Claude Desktop Figma server errors
3. Configure all connector tokens (Figma, GitHub, Confluence, Slack, Gamma)
4. Deploy fully configured system to Cloud Run production

**Implementation Summary**:

#### A. BC Prompt Library Integration
**Created Files**:
- [mcp-hub/src/tools/prompts.ts](mcp-hub/src/tools/prompts.ts) - New connector for BC Prompt Library
- [mcp-console/src/app/services/api.ts](mcp-console/src/app/services/api.ts) - Added BC Prompt Library to connections list

**Features Implemented**:
- **Data Source**: Fetches 85 prompts from https://raw.githubusercontent.com/bcali/prompt-library/main/prompts-data.js
- **Caching**: 5-minute cache to reduce GitHub API calls
- **Three Tools**:
  1. `prompts_search` - Search by keyword/category (9 categories: AI Features, Productivity, PM Artifacts, Discovery, Strategy & Planning, Analytics, Operations, GTM, Career)
  2. `prompts_get` - Retrieve full prompt text by name
  3. `prompts_list_categories` - List all categories with counts

**Integration Pattern**:
- Exported handler functions (promptsSearch, promptsGet, promptsListCategories)
- Added cases to switch statement in [mcp-hub/src/tools.ts](mcp-hub/src/tools.ts)
- Tools appear with `prompts_` prefix in tools list
- No authentication required (public GitHub repo)

**Commits**:
- `961bff3` - feat: integrate BC Prompt Library into MCP Hub
- `a5d1c9e` - feat: add BC Prompt Library to connections list

#### B. Fixed Claude Desktop Figma Error
**Problem**: Claude Desktop showed repeated 404 errors for `@modelcontextprotocol/server-figma`
**Root Cause**: Package doesn't exist in npm registry
**Solution**: Removed broken Figma entry from [D:\Users\bclark\AppData\Roaming\Claude\claude_desktop_config.json](D:\Users\bclark\AppData\Roaming\Claude\claude_desktop_config.json)
**Rationale**: User already has Figma access through MCP Hub, no need for separate local server

#### C. Complete Connector Token Configuration

**Local Setup** - Configured [mcp-hub/.env](mcp-hub/.env):
```bash
FIGMA_TOKEN=figd_***
GITHUB_TOKEN=ghp_***
ATLASSIAN_EMAIL=bclark@minor.com
ATLASSIAN_API_TOKEN=ATATT***
CONFLUENCE_BASE_URL=https://minor.atlassian.net/wiki
JIRA_BASE_URL=https://minor.atlassian.net
GAMMA_API_KEY=sk-gamma-***
SLACK_BOT_TOKEN=xoxb-***
```

**Cloud Deployment** - Updated [.github/workflows/mcp-hub-cloudrun.yml](.github/workflows/mcp-hub-cloudrun.yml):
- Added all 8 connector environment variables to `--set-env-vars`
- User added corresponding GitHub Secrets at https://github.com/bcali/MCP/settings/secrets/actions

**Commit**: `9f4e59d` - feat: add all connector tokens to Cloud Run deployment

#### D. Final System State

**Connectors Active** (22 tools total):
| Connector | Tools | Status | Token Type |
|-----------|-------|--------|------------|
| Hub Core | 11 | ✅ Active | Built-in |
| Figma | 1 | ✅ Active | Personal Access Token |
| GitHub | 2 | ✅ Active | Personal Access Token |
| Confluence | 1 | ✅ Active | Atlassian API Token |
| Slack | 1 | ✅ Active | Bot User OAuth Token |
| Gamma | 3 | ✅ Active | API Key |
| BC Prompt Library | 3 | ✅ Active | None (public) |

**Deployment Endpoints**:
- **Local Dev**: http://localhost:8080/v1/sse (for testing)
- **Cloud Prod**: https://mcp-hub-6jzkdzuf2a-uc.a.run.app/v1/sse
- **Console**: https://bcali.github.io/MCP/
- **API Key**: N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs

**Key Learnings**:

1. **Prompt Library Architecture**:
   - Fetching from GitHub Raw works well for static prompt libraries
   - Caching prevents rate limiting
   - No authentication needed for public repos

2. **Tool Registration Pattern Evolution**:
   - Initial approach: Separate registration functions (registerPromptTools)
   - Final approach: Export handler functions, add cases to switch statement
   - Matches existing pattern used by Figma, GitHub, Gamma connectors

3. **Claude Desktop vs MCP Hub**:
   - Claude Desktop: Local stdio MCP servers (process-based)
   - MCP Hub: Cloud SSE MCP endpoint (HTTP-based)
   - BC Prompt Library available both ways (standalone + hub integration)

4. **Complete Token Setup Process**:
   - Each service has unique token generation process
   - Figma: Settings → Personal Access Tokens
   - GitHub: Settings → Developer Settings → Personal Access Tokens
   - Confluence/Jira: Atlassian Account → API Tokens
   - Slack: api.slack.com → Create App → OAuth & Permissions
   - Gamma: gamma.app → Settings → API
   - All tokens stored as GitHub Secrets for production deployment

**Production Status**:
- ✅ Local Hub running with all 22 tools
- ✅ All connector tokens configured
- ✅ Cloud Run deployment workflow updated
- ✅ GitHub Secrets added
- 🔄 Deployment in progress (triggered by commit 9f4e59d)

**Next Steps**:
1. Verify Cloud Run deployment completes successfully
2. Test all 7 connectors in production
3. Update console to show BC Prompt Library connector
4. Document token refresh procedures for each service

---

### Session 2026-01-29: Global MCP Configuration Setup
**Context**: User wanted MCP Hub to be available across all projects/workspaces in Claude Code, not just specific projects with local `.mcp.json` files.

**Goals**:
1. Configure MCP Hub globally so it's available in every Claude Code session
2. Eliminate need for per-project `.mcp.json` files

**Implementation Summary**:

#### A. Claude CLI Installation
**Problem**: `claude` command not recognized in terminal
**Solution**: Installed Claude CLI globally via npm:
```bash
npm install -g @anthropic-ai/claude-code
```

#### B. Global MCP Server Configuration
**Command Used**:
```bash
claude mcp add mcp-hub --scope user --transport sse "https://mcp-hub-6jzkdzuf2a-uc.a.run.app/v1/sse?key=N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs"
```

**Result**: Configuration saved to `D:\Users\bclark\.claude.json`:
```json
"mcpServers": {
  "mcp-hub": {
    "type": "sse",
    "url": "https://mcp-hub-6jzkdzuf2a-uc.a.run.app/v1/sse?key=..."
  }
}
```

#### C. Security Improvement
**Added**: `.mcp.json` to `.gitignore` to prevent accidental API key exposure
**Commit**: `05723a9` - chore: add .mcp.json to gitignore

**Key Learnings**:

1. **MCP Configuration Scopes**:
   - `--scope user` - Global config in `~/.claude.json` (available everywhere)
   - `--scope project` - Local config in `.mcp.json` (project-specific)
   - VS Code extension uses project-level by default

2. **Claude CLI Installation**:
   - VS Code extension doesn't include CLI in PATH
   - Must install separately: `npm install -g @anthropic-ai/claude-code`
   - After install, `claude` command available globally

3. **Configuration File Locations**:
   - User config: `D:\Users\bclark\.claude.json`
   - Project config: `<project>/.mcp.json`
   - User config takes precedence if both exist

**Current State**:
- ✅ MCP Hub available globally in all Claude Code sessions
- ✅ No per-project configuration needed
- ✅ API key protected from git commits
- ✅ 30 tools accessible everywhere (memory, artifacts, Figma (9 tools), GitHub, Confluence, Slack, Gamma, BC Prompt Library)

**Workflow for New Projects**:
1. Open any project in VS Code with Claude Code extension
2. MCP Hub connects automatically
3. All 30 tools immediately available
4. No setup required

---

### Session 2026-01-30: Enhanced Figma Integration with Dev Mode API
**Context**: User encountered limitations with the existing `figma_import` tool when trying to use Figma Make URLs. Requested enhancement using the newer Figma Dev Mode API for better design-to-code workflows.

**Goals**:
1. Research Figma Dev Mode API capabilities
2. Add multiple new Figma tools for comprehensive design data extraction
3. Enable better AI-assisted design-to-code generation

**Research Findings**:

#### Figma Make Limitation
- **Figma Make** (`/make/` URLs) is a separate AI-powered product
- Does NOT expose data via the standard Figma REST API
- No workaround currently available for Make URLs

#### Available Figma REST API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `GET /v1/files/:key/nodes` | Get specific nodes with full properties |
| `GET /v1/images/:key` | Render nodes as images (PNG, SVG, PDF) |
| `GET /v1/files/:key/variables/local` | Get design tokens (Enterprise only) |
| `GET /v1/files/:key/styles` | Get text, color, effect, grid styles |
| `GET /v1/files/:key/components` | Get component library |
| `GET /v1/files/:key/component_sets` | Get component variants |

**Implementation Summary**:

#### A. New Figma Tools Created
Enhanced [mcp-hub/src/tools/figma.ts](mcp-hub/src/tools/figma.ts) with 8 new tools:

| Tool | Description |
|------|-------------|
| `figma_get_nodes` | Get specific nodes with full layout/style properties |
| `figma_get_images` | Render nodes as PNG, SVG, JPG, or PDF |
| `figma_get_variables` | Get design tokens (colors, spacing, typography) |
| `figma_get_styles` | Get text styles, color styles, effects, grids |
| `figma_get_components` | Get component library metadata |
| `figma_get_component_sets` | Get component variants |
| `figma_get_metadata` | Lightweight file info (name, thumbnail, version) |
| `figma_get_design_context` | **Best for AI code gen** - combines nodes, layout, styles, images |

#### B. Key Features
- **URL Parsing**: All tools accept full Figma URLs or just file keys
- **Node ID Normalization**: Converts `123-456` format to `123:456` API format
- **Design Context Tool**: High-level function that:
  - Extracts layout properties (auto-layout → flexbox mapping)
  - Extracts visual properties (fills, strokes, effects)
  - Extracts typography (for text nodes)
  - Optionally includes rendered images
  - Provides AI-friendly tips for code generation

#### C. Layout-to-CSS Mapping Guide
```
Figma layoutMode    → CSS
HORIZONTAL          → display: flex; flex-direction: row
VERTICAL            → display: flex; flex-direction: column
NONE                → position: absolute (or static)

primaryAxisAlignItems → justify-content
counterAxisAlignItems → align-items
itemSpacing          → gap
paddingLeft/Right/Top/Bottom → padding
```

**Tool Count Update**:
- Previous: 22 tools
- New: 30 tools (+8 Figma tools)

**Files Modified**:
- [mcp-hub/src/tools/figma.ts](mcp-hub/src/tools/figma.ts) - Complete rewrite with 8 new functions
- [mcp-hub/src/tools.ts](mcp-hub/src/tools.ts) - Added tool definitions and handlers

**Key Learnings**:

1. **Figma Make vs Figma Design**:
   - Make = AI-generated prototypes, no API access
   - Design = Standard design files, full API access
   - Only `/file/` and `/design/` URLs work with REST API

2. **Official Figma MCP Server**:
   - Figma has their own MCP server at `https://mcp.figma.com/mcp`
   - Provides `get_design_context`, `get_variable_defs`, `get_screenshot` tools
   - Our implementation provides similar capabilities via REST API

3. **Variables API Restriction**:
   - `GET /files/:key/variables/local` requires Enterprise plan
   - Tool gracefully handles this with clear error message

**Sources**:
- [Figma REST API Docs](https://developers.figma.com/docs/rest-api/)
- [Figma MCP Server Guide](https://github.com/figma/mcp-server-guide)
- [Figma REST API Spec](https://github.com/figma/rest-api-spec)
- [Figma Variables API](https://developers.figma.com/docs/rest-api/variables/)

---

### Session 2026-01-30: Gamma Timeout Fix & Connector Test Endpoint
**Context**: MCP tool calls (especially `gamma_get_status` and `gamma_get_themes`) were causing Claude Code to freeze/timeout due to SSE transport limitations.

**Problem**:
- Claude Code's MCP SSE client has a short timeout for tool calls
- Gamma API calls were exceeding this timeout
- Result: `AbortError: The operation was aborted` and Claude Code freezing

**Root Cause Analysis**:
1. MCP Hub had 30-second timeouts for Gamma API calls
2. Claude Code's SSE transport aborts requests before they complete
3. This is a **client-side limitation** in Claude Code, not a server issue

**Implementation Summary**:

#### A. Gamma Timeout Improvements
**File**: [mcp-hub/src/tools/gamma.ts](mcp-hub/src/tools/gamma.ts)

Changes:
- Added `STATUS_CHECK_TIMEOUT_MS = 5000` (5 seconds for status/themes)
- `getGenerationStatus()` now uses 5s timeout instead of 30s
- `getAvailableThemes()` now uses 5s timeout
- Timeout errors return graceful response instead of throwing:
  ```json
  {
    "generationId": "...",
    "status": "checking",
    "message": "Status check timed out - generation may still be in progress."
  }
  ```
- Themes endpoint no longer silently swallows errors

**Commit**: `8b76fac` - fix: add fast timeout and graceful error handling for Gamma status checks

#### B. Connector Test Endpoint (Bypasses MCP)
**File**: [mcp-hub/src/index.ts](mcp-hub/src/index.ts)

Added `GET /v1/test/connectors` endpoint that:
- Tests all connector API keys via REST (bypasses MCP SSE transport)
- 5-second timeout per connector
- Returns status for: Gamma, Figma, GitHub, Slack, Confluence

**Usage**:
```bash
curl "https://mcp-hub-6jzkdzuf2a-uc.a.run.app/v1/test/connectors?key=YOUR_API_KEY"
```

**Response**:
```json
{
  "gamma": {"ok": true, "message": "Connected"},
  "figma": {"ok": true, "message": "Connected"},
  "github": {"ok": true, "message": "Connected"},
  "slack": {"ok": true, "message": "Connected"},
  "confluence": {"ok": true, "message": "Configured (no quick test available)"}
}
```

**Commit**: `591527b` - feat: add /v1/test/connectors endpoint for quick validation

**Key Learnings**:

1. **MCP SSE Client Timeout**:
   - Claude Code has a short timeout for MCP tool calls
   - This is a client-side limitation, not configurable server-side
   - Workaround: Make server responses faster or use REST endpoints

2. **Testing Strategy**:
   - Don't use MCP tools to test MCP connectivity (recursive problem)
   - Use direct REST endpoints for validation
   - `/v1/test/connectors` provides reliable connector testing

3. **Graceful Degradation**:
   - Always return helpful messages instead of throwing on timeout
   - Users can retry or check back later
   - Prevents Claude Code from freezing

**Validation Command**:
```bash
# Test all connectors (wait for deployment)
curl "https://mcp-hub-6jzkdzuf2a-uc.a.run.app/v1/test/connectors?key=N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs"
```

**Current State**:
- ✅ Gamma timeout fix deployed
- ✅ Connector test endpoint deployed
- ⏳ Waiting for Cloud Run deployment to complete

---

## Quick Reference

### Testing Connectors
Always use REST endpoint (not MCP tools):
```bash
curl "https://mcp-hub-6jzkdzuf2a-uc.a.run.app/v1/test/connectors?key=YOUR_KEY"
```

### Server Health
```bash
curl "https://mcp-hub-6jzkdzuf2a-uc.a.run.app/healthz/ready"
curl "https://mcp-hub-6jzkdzuf2a-uc.a.run.app/v1/status?key=YOUR_KEY"
```

### Common Issues
| Symptom | Cause | Fix |
|---------|-------|-----|
| MCP tool times out | SSE client timeout | Use REST endpoint instead |
| "Operation aborted" | Same as above | Don't retry, use REST test |
| 401 on connector | Invalid/expired API key | Update GitHub Secret, redeploy |
| Server not responding | Supabase paused | Resume database in dashboard |

