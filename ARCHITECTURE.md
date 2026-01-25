# MCP System Architecture

**Version**: 1.1.0
**Last Updated**: 2026-01-25
**Status**: Production (Scale-to-Zero)

---

## Executive Summary

The MCP (Model Context Protocol) system is a cloud-native, production-ready gateway that centralizes access to multiple third-party APIs and provides persistent cross-session state management for AI assistants. Built on Google Cloud Platform with PostgreSQL persistence, the system enables AI assistants like Claude to maintain memory, artifacts, and execution traces across sessions while integrating seamlessly with external platforms.

**Key Components**:
- MCP Hub (Cloud Gateway)
- MCP Console (Management Dashboard)
- Gamma MCP Server (Standalone Presentation Generation)

---

## High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Clients                              │
│         (Claude Code, Cursor, Claude Desktop, etc.)             │
└─────────────────────┬───────────────────────────────────────────┘
                      │ SSE/HTTP
                      │ (API Key Auth)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Hub                                   │
│                  (Google Cloud Run)                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Core Services                                             │ │
│  │  - SSE Transport (Server-Sent Events)                      │ │
│  │  - API Key Authentication                                  │ │
│  │  - Circuit Breaker Pattern                                 │ │
│  │  - Request Bulkhead (Concurrency Limits)                   │ │
│  │  - Timeout Handling (15s default)                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  State Primitives (21 MCP Tools)                           │ │
│  │  - Memory (key-value store with search)                    │ │
│  │  - Artifacts (typed content storage)                       │ │
│  │  - Links (entity relationships)                            │ │
│  │  - Runs (execution traces)                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Platform Connectors                                       │ │
│  │  - Figma     - GitHub      - Confluence                    │ │
│  │  - Slack     - Gamma                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────┬──────────────────────────────┬──────────────────────┘
           │                              │
           │ PostgreSQL                   │ REST API
           ▼                              ▼
  ┌──────────────────┐          ┌──────────────────┐
  │    Supabase      │          │   MCP Console    │
  │   (PostgreSQL)   │          │   (React SPA)    │
  │                  │          │  GitHub Pages    │
  │  - Memory Items  │          │                  │
  │  - Artifacts     │          │  - Status View   │
  │  - Links         │          │  - Tools Catalog │
  │  - Runs/Steps    │          │  - Runs History  │
  │  - Connections   │          │  - Connections   │
  └──────────────────┘          └──────────────────┘
           │
           │ (Optional)
           ▼
  ┌──────────────────┐
  │  Cloudflare R2   │
  │  (S3-compatible) │
  │                  │
  │  Large Artifacts │
  │  (>10MB files)   │
  └──────────────────┘
```

---

## Component Architecture

### 1. MCP Hub (Cloud Gateway)

**Purpose**: Centralized MCP server providing unified access to multiple tools and persistent state management.

**Technology Stack**:
- **Runtime**: Node.js 22 with TypeScript (ES modules)
- **Framework**: Express.js 5.2.1
- **Protocol**: @modelcontextprotocol/sdk 1.25.1 (SSE transport)
- **Database**: PostgreSQL via pg 8.16.3 (Supabase hosted)
- **Blob Storage**: AWS SDK S3 client (Cloudflare R2)
- **Validation**: Zod 4.2.1
- **HTTP Client**: Axios 1.13.2

**Core Architecture Layers**:

```
┌─────────────────────────────────────────┐
│         Transport Layer                 │
│  - SSE endpoints (/v1/sse)              │
│  - HTTP POST (/mcp)                     │
│  - Session management                   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Authentication Layer               │
│  - API key validation                   │
│  - Request authorization                │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│       Resilience Layer                  │
│  - Circuit breakers (per connector)     │
│  - Bulkheads (concurrency limits)       │
│  - Timeouts (15s default)               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Tool Layer                      │
│  - 21 MCP tools (memory, artifacts,     │
│    links, runs, platform connectors)    │
│  - Schema validation                    │
│  - Event ID generation (idempotency)    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│       Persistence Layer                 │
│  - HubStore interface                   │
│  - PostgresStore (production)           │
│  - MemoryStore (local dev)              │
│  - Connection pooling                   │
└─────────────────────────────────────────┘
```

**Key Features**:
- **SSE Transport**: Server-Sent Events for real-time MCP communication
- **Session Affinity**: Cloud Run configuration ensures SSE persistence
- **Idempotent Events**: SHA-256 deterministic IDs prevent duplicate writes
- **Graceful Shutdown**: SIGTERM/SIGINT handlers for clean scale-down
- **Structured Logging**: JSON in production, human-readable in development

**Endpoints**:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/healthz` | GET | Liveness probe |
| `/healthz/ready` | GET | Readiness probe (database check) |
| `/v1/sse` | GET | MCP SSE connection |
| `/mcp` | POST | MCP message handler |
| `/v1/status` | GET | Server status (for Console) |
| `/v1/tools` | GET | List all tools |
| `/v1/runs` | GET | Recent runs (limit 50) |
| `/v1/connections` | GET/POST/DELETE | Dynamic connections |

### 2. MCP Console (Management Dashboard)

**Purpose**: Web-based monitoring and configuration interface for MCP Hub.

**Technology Stack**:
- **Framework**: React 18.3 with TypeScript
- **Build Tool**: Vite 6.3
- **UI Library**: Material-UI 7.3 + Radix UI + Tailwind CSS 4.1
- **Routing**: React Router DOM v7
- **Deployment**: GitHub Pages (static site)

**Architecture**:

```
┌─────────────────────────────────────────┐
│        Presentation Layer               │
│  - Dashboard (server status)            │
│  - Tools Catalog (schema browser)       │
│  - Runs (execution history)             │
│  - Connections (server management)      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         API Client Layer                │
│  - REST API calls to MCP Hub            │
│  - API key authentication               │
│  - Error handling                       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         State Management                │
│  - React hooks (useState, useEffect)    │
│  - Component-level state                │
└─────────────────────────────────────────┘
```

**Key Features**:
- Real-time server status (uptime, version, active sessions)
- Tool catalog browser with JSON schema inspection
- Execution history with detailed run traces
- Dynamic connection management (add/remove MCP servers)

### 3. Gamma MCP Server

**Purpose**: Standalone MCP server for Gamma Generate API (presentations, documents, social cards).

**Technology Stack**:
- **Runtime**: Node.js with TypeScript
- **Protocol**: MCP SDK (stdio transport)
- **API Client**: Axios

**Architecture**:

```
┌─────────────────────────────────────────┐
│         MCP Tools Layer                 │
│  - gamma_generate (presentations)       │
│  - gamma_get_status (check progress)    │
│  - gamma_get_themes (list themes)       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Gamma API Client                   │
│  - Axios HTTP client                    │
│  - API key authentication               │
│  - Request/response handling            │
└─────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Client Request Flow (MCP Tool Execution)

```
Client (Claude Code)
    │
    │ 1. Establish SSE connection
    ├──────────────────────────────────────►  MCP Hub (/v1/sse?key=API_KEY)
    │                                         │
    │                                         │ 2. Validate API key
    │                                         │
    │                                         │ 3. Store session ID
    │                                         ▼
    │ 4. SSE connection open             SessionRegistry
    │◄──────────────────────────────────────┤
    │
    │ 5. Call tool (e.g., memory_put)
    ├──────────────────────────────────────►  POST /mcp
    │                                         │
    │                                         │ 6. Check circuit breaker
    │                                         ├──────► ResilienceRegistry
    │                                         │
    │                                         │ 7. Acquire bulkhead semaphore
    │                                         │
    │                                         │ 8. Execute tool with timeout
    │                                         ├──────► Tool Handler
    │                                         │        │
    │                                         │        │ 9. Generate event ID
    │                                         │        │    (SHA-256 hash)
    │                                         │        │
    │                                         │        │ 10. Write to store
    │                                         │        ├──────► PostgresStore
    │                                         │        │        │
    │                                         │        │        │ 11. Insert/update
    │                                         │        │        │     (idempotent)
    │                                         │        │        ▼
    │                                         │        │     Supabase
    │                                         │        │◄───────┤
    │                                         │        │
    │                                         │◄───────┤ 12. Return result
    │                                         │
    │ 13. Tool result (via SSE)               │
    │◄──────────────────────────────────────┤
    │
```

### 2. State Persistence Flow

```
Tool Execution
    │
    │ 1. Validate input (Zod)
    ▼
Input Schema Validation
    │
    │ 2. Generate deterministic event ID
    │    hash(source + ":" + sourceEventId)
    ▼
Event ID Generation (SHA-256)
    │
    │ 3. Call HubStore method
    ▼
HubStore Interface
    │
    ├──► PostgresStore (production)
    │    │
    │    │ 4. Execute SQL with event_id
    │    │    (INSERT ... ON CONFLICT DO NOTHING)
    │    ▼
    │    PostgreSQL (Supabase)
    │    │
    │    │ 5. Return saved entity
    │    └──► Response
    │
    └──► MemoryStore (local dev)
         │
         │ 4. Store in Map<string, T>
         ▼
         In-Memory Storage
         │
         │ 5. Return entity
         └──► Response
```

### 3. Console Dashboard Flow

```
Browser (MCP Console)
    │
    │ 1. Load React app
    ├──────────────────────────────────────►  GitHub Pages
    │◄──────────────────────────────────────┤ 2. Static HTML/JS
    │
    │ 3. Fetch /v1/status
    ├──────────────────────────────────────►  MCP Hub API
    │                                         │
    │                                         │ 4. Validate API key
    │                                         │
    │                                         │ 5. Query PostgresStore
    │                                         ├──────► Supabase
    │                                         │◄───────┤
    │                                         │
    │ 6. Server status JSON                   │
    │◄──────────────────────────────────────┤
    │
    │ 7. Render dashboard
    ▼
Display (uptime, version, connections)
```

---

## Infrastructure Setup

### Google Cloud Platform (GCP)

**Services Used**:
- **Cloud Run**: Serverless container hosting
- **Artifact Registry**: Container image storage
- **Workload Identity Federation**: GitHub Actions authentication

**Cloud Run Configuration**:

```yaml
Service: mcp-hub
Region: us-central1
Configuration:
  Min instances: 0           # Scale-to-zero (cost optimization)
  Max instances: 3           # Limit cost/blast radius
  CPU: 1 vCPU                # Per instance
  Memory: 512Mi              # Per instance
  Timeout: 300s              # 5 minutes
  Concurrency: 80            # Requests per instance
  Session affinity: true     # Required for SSE
  CPU throttling: true       # Reduce idle cost
  Startup CPU boost: true    # Faster cold starts
```

**Cost Model**:
- **Idle**: $0/month (scaled to zero)
- **Light usage** (1-2 hrs/day): $1-2/month
- **Moderate usage** (3-5 hrs/day): $3-5/month
- **Heavy usage** (8+ hrs/day): $10-15/month
- **Cold start penalty**: 2-5 seconds

**CI/CD Pipeline** (GitHub Actions):

```
1. Push to main branch
    ├─► Build Docker image
    │   └─► Tag: gcr.io/PROJECT/mcp-hub:latest
    │
    ├─► Push to Artifact Registry
    │
    └─► Deploy to Cloud Run
        └─► Set environment variables from GitHub Secrets
```

### Supabase (PostgreSQL Database)

**Plan**: Free Tier

**Limits**:
- 500MB database storage
- 1GB file storage
- 2GB bandwidth/month
- Unlimited API requests
- 7-day log retention

**Connection Pool Configuration**:

```javascript
{
  max: 10,              // Maximum connections
  min: 0,               // Minimum (enables scale-to-zero)
  idleTimeoutMillis: 30000,      // 30 seconds
  connectionTimeoutMillis: 5000,  // 5 seconds
  allowExitOnIdle: true  // Clean shutdown support
}
```

**Database Schema**:

```sql
-- Memory Items
CREATE TABLE memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  event_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Artifacts
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  name TEXT,
  source TEXT,
  content_type TEXT,
  content_text TEXT,
  metadata JSONB,
  event_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Links
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type TEXT NOT NULL,
  from_id TEXT NOT NULL,
  to_type TEXT NOT NULL,
  to_id TEXT NOT NULL,
  label TEXT,
  url TEXT,
  event_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Runs
CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  steps JSONB DEFAULT '[]',
  event_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connections
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  api_key TEXT,
  enabled BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### GitHub Pages (MCP Console Hosting)

**Configuration**:
- **Source**: GitHub Actions workflow
- **Branch**: `gh-pages` (auto-created)
- **Build**: Vite static site generation
- **Cost**: $0/month (public repository)

**Deployment Workflow**:

```
1. Push to main (console changes)
    ├─► Build React app (npm run build)
    │
    ├─► Generate static files (dist/)
    │
    └─► Deploy to gh-pages branch
        └─► Live URL: https://bcali.github.io/MCP/
```

---

## Security Architecture

### Authentication

**API Key-Based**:
- Single shared API key stored in `MCP_HUB_API_KEY` environment variable
- Required for all MCP endpoints and management API
- Health endpoints (`/healthz`) are unauthenticated

**Key Validation**:

```typescript
function validateApiKey(req: Request): boolean {
  const apiKey = req.query.key || req.headers['x-api-key'];
  return apiKey === process.env.MCP_HUB_API_KEY;
}
```

### Data Privacy

**In-Memory Mode** (local development):
- No persistence
- Data cleared on server restart
- Zero external data storage

**PostgreSQL Mode** (production):
- Data encrypted at rest (Supabase)
- TLS 1.2+ in transit
- Private database (no public access)

**R2 Mode** (optional, large artifacts):
- Private bucket
- Signed URLs for access
- Encryption at rest

### Network Security

**Cloud Run**:
- HTTPS-only (TLS 1.2+)
- Auto-managed SSL certificates
- GCP IAM for deployment

**Local Development**:
- HTTP on localhost only
- No external access

**CORS**:
- Enabled for GitHub Pages console
- Restricted origins in production

---

## Platform Dependencies

### Production Dependencies

```json
{
  "express": "5.2.1",
  "@modelcontextprotocol/sdk": "1.25.1",
  "pg": "8.16.3",
  "@aws-sdk/client-s3": "3.953.0",
  "axios": "1.13.2",
  "zod": "4.2.1",
  "cors": "2.8.5",
  "dotenv": "17.2.3"
}
```

### Development Dependencies

```json
{
  "typescript": "5.9.3",
  "ts-node": "10.9.2",
  "@types/node": "25.0.3",
  "@types/express": "5.0.6",
  "@types/pg": "8.16.0"
}
```

### External Services

| Service | Purpose | Cost | SLA |
|---------|---------|------|-----|
| **GCP Cloud Run** | Container hosting | $1-5/month | 99.95% |
| **Supabase** | PostgreSQL database | Free tier | 99.9% |
| **Cloudflare R2** | Object storage (optional) | $0-1/month | 99.9% |
| **GitHub Pages** | Console hosting | Free | 99.9% |
| **GitHub Actions** | CI/CD | Free | 99.9% |

---

## Deployment Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Developer                                  │
│                                                                  │
│  1. git push origin main                                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   GitHub Actions                                 │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Workflow: mcp-hub-container.yml                          │  │
│  │  - Build Docker image                                     │  │
│  │  - Push to GCP Artifact Registry                          │  │
│  └────────────────────┬──────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────▼──────────────────────────────────────┐  │
│  │  Workflow: mcp-hub-cloudrun.yml                           │  │
│  │  - Deploy to Cloud Run                                    │  │
│  │  - Set environment variables                              │  │
│  │  - Configure scaling/networking                           │  │
│  └────────────────────┬──────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────▼──────────────────────────────────────┐  │
│  │  Workflow: deploy-console.yml                             │  │
│  │  - Build React app                                        │  │
│  │  - Deploy to GitHub Pages                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────┐
│   GCP       │ │   Supabase   │ │   GitHub     │
│ Cloud Run   │ │  PostgreSQL  │ │    Pages     │
│             │ │              │ │              │
│  MCP Hub    │ │  Database    │ │  Console     │
│  Container  │ │  Tables      │ │  Static Site │
└─────────────┘ └──────────────┘ └──────────────┘
       │
       │ (Runtime)
       │
       ▼
┌─────────────────────────┐
│    AI Clients           │
│  (Claude Code, etc.)    │
└─────────────────────────┘
```

---

## Scaling Considerations

### Current Scale (Development)

- **Concurrent users**: 1-2
- **Requests/day**: <1,000
- **Database size**: <50MB
- **Cost**: $1-5/month

### Future Scale (Production)

**Light Production** (10-20 users):
- Cloud Run: min instances 1 (eliminate cold starts)
- Database: Stay on free tier
- Cost: $10-20/month

**Medium Production** (50-100 users):
- Cloud Run: min 2, max 10 instances
- Database: Upgrade to Supabase Pro ($25/month)
- Cost: $50-100/month

**Large Production** (500+ users):
- Cloud Run: min 5, max 50 instances
- Database: Dedicated PostgreSQL instance
- Add Redis for caching
- Add CDN for Console
- Cost: $500-1000/month

---

## Monitoring & Observability

See [MONITORING.md](./mcp-hub/MONITORING.md) for detailed observability setup.

**Key Metrics**:
- Request count and latency
- Error rate
- Database query performance
- Cold start frequency
- Circuit breaker states

---

## References

- [Product Requirements Document (PRD)](./PRD.md)
- [Claude Context File](./CLAUDE.md)
- [Setup Guide](./SETUP.md)
- [Main README](./README.md)
- [Monitoring Guide](./mcp-hub/MONITORING.md)

---

**Maintained by**: bcali
**Repository**: https://github.com/bcali/MCP
**License**: MIT © 2025 bcali
