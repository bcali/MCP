# MCP Hub API Reference

**Version**: 1.1.0
**Last Updated**: 2026-01-25

Complete API reference for MCP Hub REST endpoints and MCP tools.

---

## Table of Contents

1. [REST API Endpoints](#rest-api-endpoints)
2. [MCP Tools Reference](#mcp-tools-reference)
3. [Authentication](#authentication)
4. [Error Handling](#error-handling)
5. [Examples](#examples)

---

## REST API Endpoints

### Health & Status

#### `GET /healthz`
**Description**: Basic liveness probe
**Authentication**: None
**Response**:
```json
{
  "ok": true
}
```

---

#### `GET /healthz/ready`
**Description**: Readiness probe with database connectivity check
**Authentication**: None
**Response**:
```json
{
  "ok": true,
  "status": "ready",
  "database": "connected",
  "version": "1.1.0"
}
```

**Possible database values**: `"connected"` | `"disconnected"` | `"error"`

---

### MCP Protocol

#### `GET /v1/sse`
**Description**: Server-Sent Events endpoint for MCP protocol
**Authentication**: Required (API key via query parameter)
**Query Parameters**:
- `key` (required): API key for authentication

**Example**:
```
https://mcp-hub-example.run.app/v1/sse?key=YOUR_API_KEY
```

**Response**: SSE stream following MCP protocol specification

---

#### `POST /mcp`
**Description**: MCP message handler (internal, called by SSE transport)
**Authentication**: Required
**Query Parameters**:
- `sessionId` (required): Active SSE session identifier

**Request Body**: MCP protocol message (JSON-RPC format)

---

### Management API

#### `GET /v1/status`
**Description**: Server status and metrics
**Authentication**: Required (API key via header or query)

**Response**:
```json
{
  "uptime": "2h 15m",
  "version": "1.1.0",
  "activeConnections": 3,
  "environment": "production"
}
```

---

#### `GET /v1/tools`
**Description**: List all registered MCP tools
**Authentication**: Required

**Response**:
```json
{
  "tools": [
    {
      "name": "memory_put",
      "description": "Store shared memory...",
      "inputSchema": { ... }
    },
    ...
  ]
}
```

---

#### `GET /v1/runs`
**Description**: List recent workflow runs
**Authentication**: Required
**Query Parameters**:
- `limit` (optional): Max results (default: 50, max: 100)
- `status` (optional): Filter by status (`running`, `completed`, `failed`)

**Response**:
```json
{
  "runs": [
    {
      "id": "abc-123",
      "name": "Generate presentation",
      "status": "completed",
      "createdAt": "2026-01-25T10:00:00Z",
      "updatedAt": "2026-01-25T10:05:00Z",
      "steps": [...]
    }
  ],
  "count": 10
}
```

---

#### `GET /v1/connections`
**Description**: List dynamic MCP server connections
**Authentication**: Required

**Response**:
```json
{
  "connections": [
    {
      "id": "conn-1",
      "name": "figma",
      "type": "internal",
      "enabled": true,
      "createdAt": "2026-01-25T10:00:00Z"
    }
  ]
}
```

---

#### `POST /v1/connections`
**Description**: Add a new upstream MCP server connection
**Authentication**: Required

**Request Body**:
```json
{
  "name": "my-custom-server",
  "type": "sse",
  "endpoint": "https://example.com/mcp/sse",
  "apiKey": "optional-api-key",
  "metadata": {
    "description": "Custom MCP server"
  }
}
```

**Response**:
```json
{
  "id": "conn-xyz",
  "name": "my-custom-server",
  "type": "sse",
  "endpoint": "https://example.com/mcp/sse",
  "enabled": true,
  "createdAt": "2026-01-25T10:30:00Z"
}
```

---

#### `DELETE /v1/connections/:id`
**Description**: Remove a dynamic connection
**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "Connection deleted"
}
```

---

## MCP Tools Reference

### Memory Tools

#### `memory_put`
**Description**: Store shared memory (notes/requirements/decisions) centrally in the hub

**Parameters**:
```json
{
  "key": "string (required)",
  "value": "string (required)",
  "tags": ["string"] (optional),
  "source": "string (optional)",
  "source_event_id": "string (optional)"
}
```

**Example**:
```json
{
  "key": "project_requirements",
  "value": "Build a presentation for Q1 review...",
  "tags": ["project", "q1"],
  "source": "gamma",
  "source_event_id": "evt_123"
}
```

**Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Memory stored with key: project_requirements"
    }
  ]
}
```

---

#### `memory_get`
**Description**: Fetch a shared memory item by key

**Parameters**:
```json
{
  "key": "string (required)"
}
```

**Example**:
```json
{
  "key": "project_requirements"
}
```

**Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Build a presentation for Q1 review..."
    }
  ]
}
```

---

#### `memory_search`
**Description**: Search shared memory by query and/or tags

**Parameters**:
```json
{
  "query": "string (optional)",
  "tags": ["string"] (optional)
}
```

**Example**:
```json
{
  "query": "presentation",
  "tags": ["q1"]
}
```

**Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Found 2 memory items:\n1. project_requirements\n2. presentation_draft"
    }
  ]
}
```

---

### Artifact Tools

#### `artifact_create`
**Description**: Create an artifact record (design export, generated doc, code patch, etc.)

**Parameters**:
```json
{
  "type": "string (required)",
  "name": "string (optional)",
  "contentType": "string (optional)",
  "contentText": "string (optional)",
  "metadata": "object (optional)",
  "source": "string (optional)",
  "source_event_id": "string (optional)"
}
```

**Example**:
```json
{
  "type": "presentation",
  "name": "Q1 Review Deck",
  "contentType": "application/pdf",
  "contentText": "...",
  "metadata": {
    "author": "AI",
    "slides": 15
  },
  "source": "gamma"
}
```

**Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Artifact created with ID: art-abc-123"
    }
  ]
}
```

---

#### `artifact_get`
**Description**: Get a single artifact by id

**Parameters**:
```json
{
  "id": "string (required)"
}
```

**Response**: Artifact object with full details

---

#### `artifact_list`
**Description**: List artifacts, optionally filtered by type

**Parameters**:
```json
{
  "type": "string (optional)"
}
```

**Example**:
```json
{
  "type": "presentation"
}
```

**Response**: Array of artifact objects

---

### Link Tools

#### `link_add`
**Description**: Add a typed link between two entities (Figma↔PR, Jira↔Confluence, etc.)

**Parameters**:
```json
{
  "from": {
    "type": "string (required)",
    "id": "string (required)"
  },
  "to": {
    "type": "string (required)",
    "id": "string (required)"
  },
  "label": "string (optional)",
  "url": "string (optional)",
  "source": "string (optional)",
  "source_event_id": "string (optional)"
}
```

**Example**:
```json
{
  "from": {
    "type": "figma",
    "id": "file-123"
  },
  "to": {
    "type": "github_pr",
    "id": "PR-456"
  },
  "label": "Implements design",
  "url": "https://github.com/owner/repo/pull/456"
}
```

---

#### `link_list`
**Description**: List links, optionally filtered by endpoints

**Parameters**:
```json
{
  "fromType": "string (optional)",
  "fromId": "string (optional)",
  "toType": "string (optional)",
  "toId": "string (optional)"
}
```

---

### Run Tools

#### `run_start`
**Description**: Start a workflow run (useful for multi-step automation and traceability)

**Parameters**:
```json
{
  "name": "string (required)",
  "source": "string (optional)",
  "source_event_id": "string (optional)"
}
```

**Example**:
```json
{
  "name": "Generate and deploy presentation",
  "source": "gamma"
}
```

**Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Run started with ID: run-xyz-789"
    }
  ]
}
```

---

#### `run_step`
**Description**: Append a step to a run log

**Parameters**:
```json
{
  "runId": "string (required)",
  "kind": "note | tool_call | artifact | link (required)",
  "message": "string (required)",
  "data": "object (optional)",
  "source": "string (optional)",
  "source_event_id": "string (optional)"
}
```

**Example**:
```json
{
  "runId": "run-xyz-789",
  "kind": "tool_call",
  "message": "Called gamma_generate",
  "data": {
    "toolName": "gamma_generate",
    "status": "success"
  }
}
```

---

#### `run_complete`
**Description**: Mark a run completed or failed

**Parameters**:
```json
{
  "runId": "string (required)",
  "status": "completed | failed (required)"
}
```

---

### Platform Connectors

#### `figma_import`
**Description**: Import basic metadata for a Figma file and store it as an artifact

**Parameters**:
```json
{
  "fileKey": "string (required)"
}
```

**Example**:
```json
{
  "fileKey": "abc123xyz"
}
```

**Environment Variable Required**: `FIGMA_TOKEN`

---

#### `github_put_file`
**Description**: Create or update a file in a GitHub repo

**Parameters**:
```json
{
  "owner": "string (required)",
  "repo": "string (required)",
  "path": "string (required)",
  "content": "string (required)",
  "message": "string (required)",
  "branch": "string (required)"
}
```

**Example**:
```json
{
  "owner": "bcali",
  "repo": "MCP",
  "path": "docs/API.md",
  "content": "# API Documentation...",
  "message": "Update API docs",
  "branch": "main"
}
```

**Environment Variable Required**: `GITHUB_TOKEN`

**Note**: Content is raw UTF-8 text, will be base64-encoded automatically.

---

#### `github_create_pr`
**Description**: Create a GitHub pull request

**Parameters**:
```json
{
  "owner": "string (required)",
  "repo": "string (required)",
  "head": "string (required)",
  "base": "string (required)",
  "title": "string (required)",
  "body": "string (optional)"
}
```

**Example**:
```json
{
  "owner": "bcali",
  "repo": "MCP",
  "head": "feature/api-docs",
  "base": "main",
  "title": "Add API documentation",
  "body": "This PR adds comprehensive API docs..."
}
```

**Environment Variable Required**: `GITHUB_TOKEN`

---

#### `confluence_upsert_page`
**Description**: Create or update a Confluence page by title

**Parameters**:
```json
{
  "spaceKey": "string (required)",
  "title": "string (required)",
  "bodyHtml": "string (required)"
}
```

**Example**:
```json
{
  "spaceKey": "TEAM",
  "title": "API Documentation",
  "bodyHtml": "<h1>API Docs</h1><p>...</p>"
}
```

**Environment Variables Required**:
- `CONFLUENCE_URL`
- `CONFLUENCE_EMAIL`
- `CONFLUENCE_API_TOKEN`

---

#### `slack_post_message`
**Description**: Post a message to Slack

**Parameters**:
```json
{
  "channel": "string (required)",
  "text": "string (required)"
}
```

**Example**:
```json
{
  "channel": "#general",
  "text": "New presentation generated!"
}
```

**Environment Variable Required**: `SLACK_BOT_TOKEN`

---

#### `gamma_generate`
**Description**: Generate a presentation, document, or social content using Gamma AI

**Parameters**:
```json
{
  "inputText": "string (required)",
  "textMode": "outline | document | slides (optional)",
  "format": "presentation | document | card (optional)",
  "themeName": "string (optional)",
  "numCards": "number (optional)",
  "cardSplit": "auto | single | multiple (optional)",
  "additionalInstructions": "string (optional)",
  "exportAs": "pdf | pptx | html | png (optional, string or array)",
  "textOptions": {
    "amount": "concise | normal | verbose (optional)",
    "tone": "string (optional)",
    "audience": "string (optional)",
    "language": "string (optional)"
  },
  "imageOptions": {
    "source": "generate | search | none (optional)",
    "model": "string (optional)",
    "style": "string (optional)"
  },
  "cardOptions": {
    "dimensions": "landscape | portrait | square (optional)"
  }
}
```

**Example**:
```json
{
  "inputText": "Q1 2026 Business Review",
  "textMode": "slides",
  "format": "presentation",
  "themeName": "Modern",
  "numCards": 10,
  "exportAs": ["pdf", "pptx"],
  "textOptions": {
    "amount": "normal",
    "tone": "professional",
    "audience": "executives"
  },
  "imageOptions": {
    "source": "generate",
    "style": "modern"
  }
}
```

**Environment Variable Required**: `GAMMA_API_KEY`

**Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Generation started. ID: gen-123\nUse gamma_get_status to check progress."
    }
  ]
}
```

---

#### `gamma_get_status`
**Description**: Check the status of a Gamma generation request

**Parameters**:
```json
{
  "generationId": "string (required)"
}
```

**Response** (in progress):
```json
{
  "content": [
    {
      "type": "text",
      "text": "Status: processing\nProgress: 45%"
    }
  ]
}
```

**Response** (completed):
```json
{
  "content": [
    {
      "type": "text",
      "text": "Status: completed\nEdit URL: https://gamma.app/docs/abc123\nExports: PDF, PPTX"
    }
  ]
}
```

---

#### `gamma_get_themes`
**Description**: Get available themes for Gamma presentations

**Parameters**: None

**Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Available themes:\n- Modern\n- Classic\n- Minimal\n- Bold\n..."
    }
  ]
}
```

---

## Authentication

### API Key Authentication

All authenticated endpoints require an API key.

#### Methods:

**1. Query Parameter** (SSE endpoint):
```
GET /v1/sse?key=YOUR_API_KEY
```

**2. Header** (REST endpoints):
```http
Authorization: Bearer YOUR_API_KEY
```
or
```http
X-API-Key: YOUR_API_KEY
```

### Environment Variables

Set `MCP_HUB_API_KEY` in your server environment:
```bash
export MCP_HUB_API_KEY=your-secret-key-here
```

For Cloud Run deployment, configure via GitHub Secrets.

---

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `InvalidParams` | Invalid or missing parameters |
| `InternalError` | Server-side error |
| `Unauthorized` | Missing or invalid API key |
| `NotFound` | Resource not found |
| `CircuitBreakerOpen` | External service temporarily unavailable |
| `ResourceLimitReached` | Concurrent request limit exceeded |

### Resilience Patterns

#### Circuit Breaker
When an external service (Figma, GitHub, etc.) fails repeatedly:
- **Threshold**: 5 consecutive failures
- **State**: Transitions to OPEN
- **Reset**: After 5 minutes (transitions to HALF_OPEN)
- **Error Message**: `"Circuit breaker is open for <connector>"`

#### Bulkhead
Concurrent request limit per connector:
- **Limit**: 5 concurrent requests
- **Error Message**: `"Resource limit reached for this connector"`

#### Timeout
Global timeout for tool execution:
- **Default**: 15 seconds (configurable via `TOOL_TIMEOUT_MS`)
- **Error Message**: `"Tool execution timed out"`

---

## Examples

### Example 1: Complete Workflow with Runs

```javascript
// 1. Start a run
const runResult = await mcpCall('run_start', {
  name: 'Generate Q1 presentation'
});
const runId = extractRunId(runResult);

// 2. Store requirements
await mcpCall('memory_put', {
  key: 'q1_requirements',
  value: 'Focus on revenue growth and team expansion',
  tags: ['q1', 'presentation']
});

// 3. Log a step
await mcpCall('run_step', {
  runId,
  kind: 'note',
  message: 'Requirements stored in memory'
});

// 4. Generate presentation
const genResult = await mcpCall('gamma_generate', {
  inputText: 'Q1 2026 Business Review',
  format: 'presentation',
  numCards: 12,
  exportAs: ['pdf', 'pptx']
});
const generationId = extractGenerationId(genResult);

// 5. Log generation
await mcpCall('run_step', {
  runId,
  kind: 'tool_call',
  message: 'Gamma generation started',
  data: { generationId }
});

// 6. Wait and check status
let status = 'processing';
while (status === 'processing') {
  await sleep(5000);
  const statusResult = await mcpCall('gamma_get_status', { generationId });
  status = parseStatus(statusResult);
}

// 7. Complete the run
await mcpCall('run_complete', {
  runId,
  status: 'completed'
});
```

### Example 2: Cross-Platform Linking

```javascript
// Import Figma design
const figmaResult = await mcpCall('figma_import', {
  fileKey: 'abc123xyz'
});
const artifactId = extractArtifactId(figmaResult);

// Create GitHub PR
const prResult = await mcpCall('github_create_pr', {
  owner: 'bcali',
  repo: 'design-system',
  head: 'feature/new-component',
  base: 'main',
  title: 'Implement new button component',
  body: 'Based on Figma design'
});
const prNumber = extractPrNumber(prResult);

// Link Figma to PR
await mcpCall('link_add', {
  from: { type: 'figma', id: 'abc123xyz' },
  to: { type: 'github_pr', id: prNumber },
  label: 'Implements design',
  url: `https://github.com/bcali/design-system/pull/${prNumber}`
});

// Query links
const links = await mcpCall('link_list', {
  fromType: 'figma'
});
```

### Example 3: Memory Search

```javascript
// Store multiple items
await mcpCall('memory_put', {
  key: 'meeting_notes_jan',
  value: 'Discussed Q1 OKRs and hiring plan',
  tags: ['meeting', 'q1', 'okr']
});

await mcpCall('memory_put', {
  key: 'meeting_notes_feb',
  value: 'Q1 progress review and budget allocation',
  tags: ['meeting', 'q1', 'budget']
});

// Search by tag
const q1Items = await mcpCall('memory_search', {
  tags: ['q1']
});

// Search by query
const budgetItems = await mcpCall('memory_search', {
  query: 'budget'
});
```

---

## Rate Limits

Currently **no enforced rate limits** for personal use. Future versions may add:
- 1000 requests/hour per API key
- 100 concurrent connections
- Burst allowance: 50 requests/minute

---

## Changelog

### v1.1.0 (2026-01-23)
- Added structured logging
- Improved health checks (`/healthz/ready`)
- Implemented resilience patterns (circuit breaker, bulkhead, timeout)
- Optimized connection pooling
- Scale-to-zero Cloud Run deployment

### v1.0.0 (Initial Release)
- Core MCP tools (memory, artifacts, links, runs)
- Platform connectors (Figma, GitHub, Confluence, Slack, Gamma)
- SSE transport for MCP protocol
- PostgreSQL persistence with in-memory fallback

---

## Support

- **Issues**: https://github.com/bcali/MCP/issues
- **Documentation**: [README.md](../README.md)
- **PRD**: [PRD.md](../PRD.md)
- **Architecture**: [CLAUDE.md](../CLAUDE.md)
