# Product Requirements Document: MCP Hub & Ecosystem

**Version**: 1.1.0
**Last Updated**: 2026-01-23
**Status**: Production (Scale-to-Zero)

---

## Executive Summary

MCP Hub is a production-ready cloud gateway that centralizes access to multiple Model Context Protocol (MCP) tools and provides persistent cross-session state management. The system enables AI assistants like Claude to maintain memory, artifacts, and execution traces across sessions while integrating with external platforms (Figma, GitHub, Confluence, Slack, Gamma).

**Key Innovation**: Single SSE endpoint provides access to 21+ tools with built-in resilience patterns, persistent state, and cost-optimized cloud deployment.

---

## Product Vision

### Problem Statement
AI assistants like Claude lose context between sessions, requiring users to repeatedly provide the same information. Additionally, integrating multiple third-party services requires separate API configurations and lacks cross-service orchestration capabilities.

### Solution
A unified MCP gateway that:
1. Maintains persistent memory and artifacts across sessions
2. Provides typed linking between related entities across platforms
3. Offers durable execution traces for complex workflows
4. Enables both local development and cloud deployment
5. Implements production resilience patterns (circuit breaker, bulkhead, timeout)

### Success Metrics
- **Cost Efficiency**: <$5/month for personal use (scale-to-zero deployment)
- **Reliability**: 99.5% uptime with graceful degradation
- **Developer Experience**: <5 minutes from clone to running locally
- **Cold Start**: <5 seconds on Cloud Run scale-up

---

## System Architecture

### Core Components

#### 1. MCP Hub (Cloud Gateway)
**Purpose**: Centralized MCP server with persistent state and platform connectors

**Tech Stack**:
- Node.js 22 + TypeScript (ES modules)
- Express.js (HTTP/SSE transport)
- PostgreSQL (Supabase) for persistence
- AWS S3-compatible (R2) for large artifacts
- Google Cloud Run for deployment

**Key Features**:
- SSE transport for MCP protocol
- API key authentication
- Circuit breaker pattern (5 failures → OPEN, 5min reset)
- Bulkhead pattern (max 5 concurrent requests per connector)
- 15-second timeout per tool execution
- Graceful shutdown for Cloud Run
- Structured logging (JSON in production, human-readable in dev)

#### 2. MCP Console (Management Dashboard)
**Purpose**: Web-based monitoring and configuration interface

**Tech Stack**:
- React 18.3 + TypeScript
- Vite 6.3 (build tool)
- Material-UI 7.3 + Radix UI + Tailwind CSS 4.1
- React Router DOM v7

**Key Features**:
- Real-time server status monitoring
- Tool catalog browser with schema inspection
- Execution history viewer
- Connection manager for upstream MCP servers

#### 3. Gamma MCP Server
**Purpose**: Standalone MCP server for Gamma Generate API

**Tech Stack**:
- Node.js + TypeScript
- Stdio transport (for local use)
- Axios for API calls

**Key Features**:
- Presentation generation
- Document creation
- Social card generation
- Theme management

---

## Data Model

### Core Primitives

**MemoryItem** - Key-value store with tags
```typescript
{
  id: string
  key: string (unique)
  value: string
  tags: string[]
  eventId?: string  // For idempotent writes
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}
```

**Artifact** - Typed content storage
```typescript
{
  id: string
  type: string
  name?: string
  source?: string
  contentType?: string
  contentText?: string  // Or R2 reference for large files
  metadata?: Record<string, unknown>
  eventId?: string
  createdAt: IsoDateTime
}
```

**Link** - Typed relationships between entities
```typescript
{
  id: string
  from: { type: string, id: string }
  to: { type: string, id: string }
  label?: string
  url?: string
  eventId?: string
  createdAt: IsoDateTime
}
```

**Run** - Execution trace for workflows
```typescript
{
  id: string
  name: string
  status: 'running' | 'completed' | 'failed'
  steps: RunStep[]
  eventId?: string
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}
```

**RunStep** - Individual step in a run
```typescript
{
  id: string
  ts: IsoDateTime
  kind: 'note' | 'tool_call' | 'artifact' | 'link'
  message: string
  data?: Record<string, unknown>
  eventId?: string
}
```

**Connection** - Dynamic upstream MCP server
```typescript
{
  id: string
  name: string
  type: string
  endpoint: string
  apiKey?: string
  enabled: boolean
  metadata?: Record<string, unknown>
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}
```

---

## API Surface

### Health & Status
- `GET /healthz` - Liveness probe (returns `{"ok": true}`)
- `GET /healthz/ready` - Readiness probe with database check

### MCP Protocol
- `GET /v1/sse?key=<API_KEY>` - SSE endpoint for MCP clients
- `POST /mcp?sessionId=<SESSION_ID>` - MCP message handler

### Management API (Console)
- `GET /v1/status` - Server status (uptime, version, active connections)
- `GET /v1/tools` - List all registered tools
- `GET /v1/runs` - List recent runs (limit 50)
- `GET /v1/connections` - List dynamic connections
- `POST /v1/connections` - Add new connection
- `DELETE /v1/connections/:id` - Remove connection

### MCP Tools (21 total)

**Memory Tools (3)**:
- `memory_put` - Store shared memory
- `memory_get` - Retrieve memory by key
- `memory_search` - Search memory by query/tags

**Artifact Tools (3)**:
- `artifact_create` - Create artifact
- `artifact_get` - Get artifact by ID
- `artifact_list` - List artifacts by type

**Link Tools (2)**:
- `link_add` - Create typed link
- `link_list` - List links with filters

**Run Tools (3)**:
- `run_start` - Start workflow run
- `run_step` - Add step to run
- `run_complete` - Mark run as completed/failed

**Platform Connectors (10)**:
- `figma_import` - Import Figma file metadata
- `github_put_file` - Create/update GitHub file
- `github_create_pr` - Create pull request
- `confluence_upsert_page` - Create/update Confluence page
- `slack_post_message` - Post Slack message
- `gamma_generate` - Generate Gamma presentation/document
- `gamma_get_status` - Check generation status
- `gamma_get_themes` - List available themes

---

## Deployment Architecture

### Local Development
**Purpose**: Zero-cost development and testing

**Setup**:
```bash
cd mcp-hub
npm run dev
```

**Configuration**:
- `DATABASE_URL=memory` - In-memory state (no Postgres)
- `PORT=8080` - Local HTTP port
- API key from `.env` file

**Auto-Start Options**:
1. Manual: `npm run dev`
2. PowerShell script: `mcp-hub/scripts/start-dev.ps1`
3. Bash script: `mcp-hub/scripts/start-dev.sh`
4. VS Code task: Auto-runs on folder open

### Cloud Deployment (Google Cloud Run)
**Purpose**: Production deployment with scale-to-zero

**Configuration**:
- **Min instances**: 0 (scale to zero when idle)
- **Max instances**: 3 (limit cost/blast radius)
- **CPU**: 1 vCPU per instance
- **Memory**: 512Mi RAM
- **Timeout**: 300 seconds (5 minutes)
- **Concurrency**: 80 requests per instance
- **Features**: CPU throttling, startup CPU boost, session affinity

**CI/CD**: GitHub Actions auto-deploy on push to `main`

**Cost Model**:
- Idle: $0/month (scaled to zero)
- Active: ~$1-5/month (pay-per-use)
- Cold start penalty: 2-5 seconds

**Environment Variables** (GitHub Secrets):
- `MCP_HUB_API_KEY` - Authentication key
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `FIGMA_TOKEN` - Optional Figma integration
- `GAMMA_API_KEY` - Optional Gamma integration
- `GITHUB_TOKEN` - Optional GitHub integration
- `SLACK_BOT_TOKEN` - Optional Slack integration

---

## Resilience & Reliability

### Circuit Breaker Pattern
**Purpose**: Prevent cascading failures from external APIs

**Implementation**:
- Per-connector isolation (figma, github, confluence, slack, gamma)
- Threshold: 5 consecutive failures
- State: CLOSED → OPEN (on threshold) → HALF_OPEN (after 5min)
- User feedback: "Connector 'X' temporarily unavailable (Circuit Breaker OPEN)"

### Bulkhead Pattern
**Purpose**: Limit concurrent requests per connector

**Implementation**:
- Max 5 concurrent requests per connector
- Semaphore-like counter
- Error on limit: "Resource limit reached for this connector"

### Timeout Pattern
**Purpose**: Prevent hung requests

**Implementation**:
- Global: 15 seconds per tool execution
- Configurable per environment via `TOOL_TIMEOUT_MS`

### Graceful Shutdown
**Purpose**: Clean termination for Cloud Run scale-down

**Implementation**:
1. Listen for SIGTERM/SIGINT
2. Stop accepting new connections
3. Close all active SSE connections (with logging)
4. 1-second grace period
5. Exit with code 0

### Connection Pooling
**Purpose**: Efficient database connection management

**Implementation**:
- Max connections: 10 (sufficient for workload)
- Min connections: 0 (enables scale-to-zero)
- Idle timeout: 30 seconds
- Connection timeout: 5 seconds
- Allow exit on idle: true (clean shutdown)

---

## Security

### Authentication
- API key-based via query parameter or header
- Key stored in environment variable (`MCP_HUB_API_KEY`)
- Required for all MCP and management endpoints
- Health endpoints (`/healthz`) are unauthenticated

### Data Privacy
- In-memory mode: No persistence (local dev)
- PostgreSQL mode: Data stored in Supabase (encrypted at rest)
- R2 mode: Large artifacts stored in Cloudflare R2 (private bucket)

### Network Security
- Cloud Run: HTTPS-only (TLS 1.2+)
- Local dev: HTTP (localhost only)
- CORS: Enabled for GitHub Pages console

---

## Monitoring & Observability

### Logging
**Development Mode**:
- Human-readable format
- Timestamps + context
- Output to console

**Production Mode** (`NODE_ENV=production`):
- JSON structured logs
- Integrates with GCP Cloud Logging
- Fields: timestamp, level, message, context

**Log Levels**:
- `debug` - Detailed diagnostics
- `info` - Normal operations
- `warn` - Unexpected but handled
- `error` - Errors with stack traces

### Health Checks
- **Liveness**: `/healthz` - Basic server health
- **Readiness**: `/healthz/ready` - Database connectivity check

### Metrics (via /v1/status)
- Server uptime
- Active SSE connections
- Version

---

## Recent Updates (v1.1.0)

### Production Enhancements (2026-01-23)

**1. Structured Logging**
- Environment-aware logger (dev vs production)
- Context-rich error logging
- File: `mcp-hub/src/utils/logger.ts`

**2. Enhanced Health Checks**
- New `/healthz/ready` endpoint with database connectivity check
- Returns: `{ok, status, database, version}`

**3. Graceful Shutdown**
- SIGTERM/SIGINT handlers for Cloud Run
- Clean SSE connection termination
- 1-second grace period

**4. Connection Pool Optimization**
- Increased max connections: 5 → 10
- Added min connections: 0 (scale-to-zero support)
- Idle timeout: 30s, connection timeout: 5s
- Allow exit on idle for clean shutdown

**5. Cloud Run Scale-to-Zero**
- Min instances: 0 (cost optimization)
- Max instances: 3 (blast radius control)
- CPU throttling + startup boost
- Estimated cost reduction: $15-50/month → $1-5/month

**6. Developer Experience**
- Startup scripts for Windows (PowerShell) and Linux/macOS (Bash)
- VS Code task integration (auto-start on folder open)
- Local setup guide: `mcp-hub/LOCAL_SETUP.md`
- Scripts README: `mcp-hub/scripts/README.md`

**7. TypeScript Build Fixes**
- Fixed type errors in event ID generation
- Clean compilation with no warnings

**8. Documentation**
- Added `CLAUDE.md` - AI assistant context file
- Added `PRD.md` - This document
- Added `LOCAL_SETUP.md` - Quick start guide

---

## Development Workflow

### Local Setup
1. Clone repository
2. `cd mcp-hub && npm install`
3. Copy `.env.example` to `.env`
4. Set `DATABASE_URL=memory` for local dev
5. Run `npm run dev`
6. Verify: `curl http://localhost:8080/healthz`

### Making Changes
1. Create feature branch
2. Make changes and test locally
3. Run `npm run build` to check TypeScript compilation
4. Commit with descriptive message
5. Push to GitHub
6. Automatic deployment to Cloud Run (on merge to `main`)

### Testing
- Manual testing via health endpoints
- Tool testing via Claude Code or MCP client
- Console testing via browser

---

## Future Roadmap

### Short-term (Q1 2026)
- [ ] Rate limiting per API key
- [ ] Retry logic with exponential backoff
- [ ] Metrics/monitoring dashboard
- [ ] Admin API for circuit breaker management

### Medium-term (Q2-Q3 2026)
- [ ] WebSocket support for Console real-time updates
- [ ] Multi-tenancy support
- [ ] Webhook notifications for runs
- [ ] Integration tests suite

### Long-term (Q4 2026+)
- [ ] Additional platform connectors (Notion, Linear, Jira)
- [ ] GraphQL API for Console
- [ ] Plugin system for custom tools
- [ ] Self-hosted deployment guide (Docker Compose)

---

## Dependencies

### Production Dependencies
- `express` 5.2.1 - HTTP server
- `@modelcontextprotocol/sdk` 1.25.1 - MCP protocol
- `pg` 8.16.3 - PostgreSQL client
- `@aws-sdk/client-s3` 3.953.0 - S3-compatible storage
- `axios` 1.13.2 - HTTP client for external APIs
- `zod` 4.2.1 - Schema validation
- `cors` 2.8.5 - CORS middleware
- `dotenv` 17.2.3 - Environment variables

### Development Dependencies
- `typescript` 5.9.3 - Type checking
- `ts-node` 10.9.2 - TypeScript execution
- `@types/node` 25.0.3 - Node.js types
- `@types/express` 5.0.6 - Express types
- `@types/pg` 8.16.0 - PostgreSQL types

---

## Support & Documentation

### For Developers
- **Setup Guide**: [mcp-hub/LOCAL_SETUP.md](mcp-hub/LOCAL_SETUP.md)
- **Scripts Documentation**: [mcp-hub/scripts/README.md](mcp-hub/scripts/README.md)
- **AI Context**: [CLAUDE.md](CLAUDE.md)
- **Main README**: [README.md](README.md)

### For AI Assistants
- **Context File**: [CLAUDE.md](CLAUDE.md) - Project overview, architecture, recent changes
- **Code Reference**: Use file paths like `[filename:line]` for precise references
- **Tool Usage**: All tools documented in STATIC_TOOLS constant

---

## License

MIT © 2025 bcali

---

**Maintained by**: bcali
**Repository**: https://github.com/bcali/MCP
**Issues**: https://github.com/bcali/MCP/issues
