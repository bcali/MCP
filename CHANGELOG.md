# Changelog

All notable changes to the MCP project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-01-23

### Added

#### Production Enhancements
- **Structured Logging System** (`mcp-hub/src/utils/logger.ts`)
  - Environment-aware logger (development vs production modes)
  - JSON structured logs in production for GCP Cloud Logging integration
  - Human-readable logs in development mode
  - Context-rich error logging with stack traces
  - Log levels: debug, info, warn, error

- **Enhanced Health Checks** (`mcp-hub/src/index.ts`)
  - New `/healthz/ready` endpoint with database connectivity validation
  - Returns detailed status: `{ok, status, database, version}`
  - Database connection check ensures readiness for traffic
  - Maintains existing `/healthz` liveness probe

- **Graceful Shutdown System**
  - SIGTERM/SIGINT signal handlers for Cloud Run compatibility
  - Clean termination of all active SSE connections
  - HTTP server graceful shutdown
  - 1-second grace period before process exit
  - Comprehensive shutdown logging

- **Automated Development Scripts**
  - Windows PowerShell startup script (`mcp-hub/scripts/start-dev.ps1`)
  - Linux/macOS Bash startup script (`mcp-hub/scripts/start-dev.sh`)
  - Windows PowerShell stop script (`mcp-hub/scripts/stop-dev.ps1`)
  - Linux/macOS Bash stop script (`mcp-hub/scripts/stop-dev.sh`)
  - Auto-check for running instances (prevents duplicates)
  - Auto-install dependencies if missing
  - Health check polling with 30-second timeout
  - Background process management with PID tracking
  - Logging to temp directory

- **VS Code Integration**
  - Tasks configuration (`.vscode/tasks.json`)
  - "Start MCP Hub (Dev)" task (auto-runs on folder open)
  - "Stop MCP Hub (Dev)" task for manual shutdown
  - Cross-platform support (Windows/Linux/macOS)

- **Documentation**
  - `CLAUDE.md` - AI assistant context file
  - `PRD.md` - Product Requirements Document
  - `mcp-hub/LOCAL_SETUP.md` - Quick start guide
  - `mcp-hub/scripts/README.md` - Scripts documentation

### Changed

#### Cloud Run Optimizations
- **Scale-to-Zero Configuration** (`.github/workflows/mcp-hub-cloudrun.yml`)
  - Min instances: 1 → 0 (enables scale-to-zero)
  - Max instances: 10 → 3 (blast radius control)
  - CPU: 1 vCPU per instance
  - Memory: 512Mi RAM
  - Timeout: 300 seconds (5 minutes)
  - Concurrency: 80 requests per instance
  - CPU throttling enabled (reduce idle cost)
  - Startup CPU boost enabled (faster cold starts)
  - Session affinity enabled (SSE compatibility)
  - Cost reduction: ~$15-50/month → ~$1-5/month

- **Connection Pool Optimization** (`mcp-hub/src/store/postgres.ts`)
  - Max connections: 5 → 10 (improved throughput)
  - Min connections: None → 0 (enables true scale-to-zero)
  - Idle timeout: None → 30 seconds (faster resource release)
  - Connection timeout: None → 5 seconds (fast failure detection)
  - `allowExitOnIdle: true` (clean shutdown support)

- **Environment Configuration**
  - Added `NODE_ENV=production` to Cloud Run deployment
  - Enables production logging mode automatically

### Fixed

- **TypeScript Compilation Errors**
  - Fixed type errors in `generateEventId` calls (`mcp-hub/src/tools.ts`)
  - Removed unnecessary `as string` type assertions (Zod validates types)
  - Explicit type casting for event ID generation parameters
  - Clean build with zero TypeScript errors

- **Code Quality**
  - Removed duplicate property in tool schema definitions
  - Improved type safety across event ID generation
  - Consistent error handling patterns

### Performance

- **Cold Start Optimization**
  - Cloud Run startup CPU boost reduces cold start time
  - Minimal connection pool (min: 0) enables instant scale-down
  - Expected cold start: 2-5 seconds

- **Runtime Efficiency**
  - Optimized connection pooling reduces database overhead
  - Structured logging reduces I/O in production
  - Graceful shutdown prevents connection leaks

---

## [1.0.0] - 2026-01-20

### Added

#### Core Features

- **MCP Hub Cloud Gateway**
  - Centralized MCP server with SSE transport
  - API key authentication
  - Session management and affinity
  - Express.js HTTP server
  - Health check endpoints (`/healthz`)

- **State Management Primitives**
  - **Memory** - Key-value store with tags and search
  - **Artifacts** - Typed content storage (documents, presentations, images)
  - **Links** - Typed relationships between entities
  - **Runs** - Execution traces with steps for workflows
  - **Connections** - Dynamic upstream MCP server management

- **Platform Connectors** (10 tools)
  - **Figma** - Import file metadata (`figma_import`)
  - **GitHub** - File operations and PR creation (`github_put_file`, `github_create_pr`)
  - **Confluence** - Page management (`confluence_upsert_page`)
  - **Slack** - Message posting (`slack_post_message`)
  - **Gamma** - Presentation generation (`gamma_generate`, `gamma_get_status`, `gamma_get_themes`)

- **Resilience Patterns**
  - Circuit Breaker pattern (per-connector isolation)
  - Bulkhead pattern (concurrency limits)
  - Timeout handling (15-second default)
  - ResilienceRegistry for connector management

- **Idempotent Events**
  - Deterministic event ID generation (SHA-256 hashing)
  - Prevents duplicate writes from external systems
  - Pattern: `hash(source + ":" + sourceEventId)`

- **Persistence Layer**
  - HubStore interface for pluggable storage
  - PostgresStore for production (Supabase)
  - MemoryStore for local development
  - Connection pooling with pg library

- **MCP Console Dashboard**
  - React 18.3 single-page application
  - Real-time server status monitoring
  - Tool catalog browser with schema inspection
  - Execution history viewer (runs and steps)
  - Dynamic connection manager
  - Deployed to GitHub Pages

- **Gamma MCP Server**
  - Standalone MCP server for Gamma API
  - Stdio transport for local use
  - Presentation, document, and social card generation
  - Theme management

#### Infrastructure

- **Google Cloud Run Deployment**
  - Serverless container hosting
  - Automatic HTTPS with SSL certificates
  - Workload Identity Federation for GitHub Actions
  - Container image storage in Artifact Registry

- **CI/CD Pipelines** (GitHub Actions)
  - `mcp-hub-container.yml` - Docker build and push
  - `mcp-hub-cloudrun.yml` - Cloud Run deployment
  - `deploy-console.yml` - GitHub Pages deployment
  - Automated deployment on push to `main` branch

- **Database** (Supabase PostgreSQL)
  - Free tier (500MB storage, 2GB bandwidth)
  - Tables: memory, artifacts, links, runs, connections
  - TLS-encrypted connections
  - Connection pooling

#### API Surface

- **Health & Status**
  - `GET /healthz` - Liveness probe
  - `GET /v1/status` - Server status for Console

- **MCP Protocol**
  - `GET /v1/sse` - SSE endpoint for MCP clients
  - `POST /mcp` - MCP message handler

- **Management API**
  - `GET /v1/tools` - List all registered tools
  - `GET /v1/runs` - Recent runs (limit 50)
  - `GET /v1/connections` - List dynamic connections
  - `POST /v1/connections` - Add new connection
  - `DELETE /v1/connections/:id` - Remove connection

#### MCP Tools (21 total)

**Memory Tools (3)**:
- `memory_put` - Store shared memory with tags
- `memory_get` - Retrieve memory by key
- `memory_search` - Search memory by query/tags

**Artifact Tools (3)**:
- `artifact_create` - Create typed artifact
- `artifact_get` - Get artifact by ID
- `artifact_list` - List artifacts by type

**Link Tools (2)**:
- `link_add` - Create typed relationship
- `link_list` - List links with filters

**Run Tools (3)**:
- `run_start` - Start workflow run
- `run_step` - Add step to run
- `run_complete` - Mark run as completed/failed

**Platform Tools (10)**:
- See "Platform Connectors" above

#### Documentation

- `README.md` - Project overview and quick start
- `LICENSE` - MIT License
- Component-specific READMEs for Hub, Console, Gamma
- Deployment guides in workflow YAML files

### Changed

N/A - Initial release

### Deprecated

N/A - Initial release

### Removed

N/A - Initial release

### Fixed

N/A - Initial release

### Security

- API key-based authentication
- HTTPS-only in production (Cloud Run)
- TLS database connections
- Environment variable-based secrets management
- CORS configuration for Console

---

## [Unreleased]

### Planned Features (v1.2.0)

- Rate limiting per API key
- Retry logic with exponential backoff
- Metrics/monitoring dashboard
- Admin API for circuit breaker management
- WebSocket support for Console real-time updates
- Unit tests suite (Jest/Vitest)
- Additional platform connectors (Notion, Linear, Jira)
- Self-hosted deployment guide (Docker Compose)

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| **1.1.0** | 2026-01-23 | Scale-to-zero, structured logging, graceful shutdown, dev automation |
| **1.0.0** | 2026-01-20 | Initial release: Hub, Console, Gamma, 21 tools, Cloud Run deployment |

---

## Migration Guide

### Upgrading from 1.0.0 to 1.1.0

**No breaking changes** - All v1.0.0 features remain compatible.

**Recommended Actions**:

1. **Update Cloud Run Configuration** (if self-hosting):
   ```bash
   gcloud run services update mcp-hub \
     --min-instances=0 \
     --max-instances=3 \
     --cpu-throttling \
     --startup-cpu-boost \
     --set-env-vars="NODE_ENV=production"
   ```

2. **Update Local Development Environment**:
   ```bash
   cd mcp-hub
   git pull origin main
   npm install
   ```

3. **Optional: Use Auto-Start Scripts**:
   ```bash
   # Windows
   powershell -ExecutionPolicy Bypass -File mcp-hub/scripts/start-dev.ps1

   # Linux/macOS
   bash mcp-hub/scripts/start-dev.sh
   ```

4. **Review New Documentation**:
   - [CLAUDE.md](./CLAUDE.md) - AI assistant context
   - [PRD.md](./PRD.md) - Updated architecture
   - [mcp-hub/LOCAL_SETUP.md](./mcp-hub/LOCAL_SETUP.md) - Setup guide

**Database**: No schema changes, no migration required.

**API**: Fully backward compatible, no client changes needed.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:
- Submitting changes
- Code standards
- Pull request process
- Testing guidelines

---

## Links

- **Repository**: https://github.com/bcali/MCP
- **Issues**: https://github.com/bcali/MCP/issues
- **Releases**: https://github.com/bcali/MCP/releases
- **Discussions**: https://github.com/bcali/MCP/discussions

---

**Maintained by**: bcali
**License**: MIT © 2025 bcali
