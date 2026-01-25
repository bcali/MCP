# Frequently Asked Questions (FAQ)

Common questions about the MCP project.

---

## General Questions

### What is MCP Hub?

MCP Hub is a cloud-native gateway that provides a single endpoint for AI assistants (like Claude Code or Cursor) to access multiple third-party tools and maintain persistent state across sessions.

**Key Features**:
- **Unified Access**: 21+ tools through one connection (Figma, GitHub, Slack, Confluence, Gamma, plus state management)
- **Persistent Memory**: Shared key-value store that persists across chat sessions
- **Artifact Storage**: Save generated documents, presentations, and files
- **Execution Traces**: Durable workflow tracking with runs and steps
- **Platform Connectors**: Pre-built integrations with popular developer tools

**Think of it as**:
- A "memory bank" for your AI assistant
- A central hub for tool integrations
- A persistent state layer for complex workflows

---

### How is this different from using individual MCP servers?

**Individual MCP Servers**:
```
AI Assistant
  ├─ Connection to Figma MCP Server
  ├─ Connection to GitHub MCP Server
  ├─ Connection to Slack MCP Server
  └─ Connection to Gamma MCP Server
```
- Multiple connections to manage
- No shared state between tools
- Separate authentication for each
- Lost context between sessions

**MCP Hub**:
```
AI Assistant
  └─ Single connection to MCP Hub
       ├─ Figma tools
       ├─ GitHub tools
       ├─ Slack tools
       ├─ Gamma tools
       └─ State management (memory, artifacts, runs)
```
- One connection, many tools
- Shared state across all tools
- Single API key
- Persistent context

---

### Is this only for Claude Code?

No! MCP Hub works with any MCP-compatible client:

**Supported Clients**:
- **Claude Code** - Official CLI for Claude
- **Cursor** - AI code editor
- **Claude Desktop** - Desktop application
- Any tool supporting the Model Context Protocol (SSE transport)

**Example Configurations**:

**Claude Code**:
```json
{
  "mcpServers": {
    "hub": {
      "url": "https://mcp-hub-xxx.run.app/v1/sse?key=YOUR_API_KEY"
    }
  }
}
```

**Cursor**:
```json
{
  "mcpServers": {
    "hub": {
      "url": "https://mcp-hub-xxx.run.app/v1/sse",
      "headers": {
        "x-api-key": "YOUR_API_KEY"
      }
    }
  }
}
```

---

### What platforms does MCP Hub integrate with?

**Currently Supported** (v1.1.0):

| Platform | Tools | What You Can Do |
|----------|-------|-----------------|
| **Figma** | `figma_import` | Import file metadata, components, styles |
| **GitHub** | `github_put_file`, `github_create_pr` | Create/update files, create pull requests |
| **Confluence** | `confluence_upsert_page` | Create/update wiki pages |
| **Slack** | `slack_post_message` | Send messages to channels |
| **Gamma** | `gamma_generate`, `gamma_get_status`, `gamma_get_themes` | Generate presentations, docs, social cards |

**Planned** (future versions):
- Notion (pages, databases)
- Linear (issues, projects)
- Jira (issues, boards)
- Airtable (records, tables)

**Want a specific integration?** Open a feature request: https://github.com/bcali/MCP/issues

---

### Can I use this locally without cloud deployment?

**Yes!** MCP Hub supports local development with zero cloud dependencies.

**Local Setup**:
```bash
cd mcp-hub

# Set environment for local mode
echo "DATABASE_URL=memory" > .env
echo "MCP_HUB_API_KEY=local-dev-key" >> .env

# Start development server
npm run dev

# Server runs on http://localhost:8080
```

**Local Mode Features**:
- In-memory state (no PostgreSQL needed)
- All tools work (if you have API keys)
- Perfect for testing and development
- Zero cost

**Limitations**:
- State cleared on restart
- No data persistence
- Single-user only

**Use Cases**:
- Learning and experimentation
- Development and testing
- Privacy-sensitive projects
- Offline development

---

## Cost & Pricing

### How much does it cost to run?

**Development/Personal Use** (current default):
- **Cloud Run**: $1-5/month (scale-to-zero enabled)
- **Supabase**: $0/month (free tier: 500MB)
- **GitHub**: $0/month (public repo)
- **Total**: **$1-5/month**

**Usage Pattern**: 1-5 hours/day, <1000 requests/day

**Cost Breakdown**:

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| Google Cloud Run | 2M requests/month, 360K vCPU-sec | Light usage | $1-5 |
| Supabase PostgreSQL | 500MB, 2GB bandwidth | <50MB database | $0 |
| GitHub Actions | Unlimited (public repos) | ~50 min/month | $0 |
| GitHub Pages | Unlimited (public repos) | Static site | $0 |

**Light Production** (10-20 users):
- Cloud Run: $10-20/month (min instances: 1)
- Supabase: $0/month (still under free tier)
- **Total**: **$10-20/month**

**Medium Production** (50-100 users):
- Cloud Run: $30-50/month
- Supabase: $25/month (Pro tier for backups)
- **Total**: **$55-75/month**

See [COSTS.md](./COSTS.md) for detailed cost tracking.

---

### Can I reduce costs further?

**Yes!** Here are optimization strategies:

**1. Use Local Development** (Free):
```bash
DATABASE_URL=memory npm run dev
```
Only deploy to cloud when you need persistent state.

**2. Optimize Cloud Run** (Already done in v1.1.0):
- Scale-to-zero: $0 when idle
- CPU throttling: Reduce idle cost
- Right-size resources: 512Mi RAM sufficient

**3. Clean Up Old Data**:
```sql
-- Delete runs older than 90 days
DELETE FROM runs WHERE created_at < NOW() - INTERVAL '90 days';
```
Keeps database size under free tier limit.

**4. Monitor Usage**:
- Set budget alerts at $5 and $10
- Review monthly costs
- Track trends

**Realistic Costs for Solo Developer**:
- **Light use**: $1-2/month
- **Regular use**: $3-5/month
- **Heavy use**: $10-15/month

---

### Are there any hidden costs?

**No hidden costs**, but be aware of:

**External Service API Costs**:
- Gamma API: Pay-per-use (separate billing)
- Other APIs: Most have generous free tiers

**Potential Overage Costs**:
- Supabase: $25/month if >500MB database or need backups
- Cloud Run: Scales with usage (but capped at max instances)

**How to Avoid Surprises**:
1. Set GCP budget alerts ($5, $10, $20)
2. Monitor Supabase usage dashboard
3. Enable max instances cap (currently: 3)
4. Regular cost reviews (monthly)

See [COSTS.md](./COSTS.md) for detailed tracking.

---

## Setup & Configuration

### How do I connect Claude Code to MCP Hub?

**Step 1: Get Your API Key**

**Local Development**:
```bash
# Your local .env file
cat mcp-hub/.env | grep MCP_HUB_API_KEY
```

**Production (Cloud Run)**:
```bash
# From GitHub Secrets or Cloud Run environment
gcloud run services describe mcp-hub \
  --format="value(spec.template.spec.containers[0].env)" | grep API_KEY
```

**Step 2: Configure Claude Code**

Edit your Claude Code settings:

**For Local Development**:
```json
{
  "mcpServers": {
    "hub-local": {
      "url": "http://localhost:8080/v1/sse",
      "headers": {
        "x-api-key": "your-local-key-here"
      }
    }
  }
}
```

**For Production (Cloud Run)**:
```json
{
  "mcpServers": {
    "hub": {
      "url": "https://mcp-hub-xxxxx.run.app/v1/sse",
      "headers": {
        "x-api-key": "your-production-key-here"
      }
    }
  }
}
```

**Step 3: Test Connection**

In Claude Code chat:
```
"Test the MCP hub connection by storing a test value in memory"
```

Expected response: Success message with memory item details.

**Troubleshooting**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for connection issues.

---

### Do I need all the platform API keys?

**No!** Platform connectors are **optional**.

**What works without API keys**:
- Memory tools (memory_put, memory_get, memory_search)
- Artifact tools (artifact_create, artifact_get, artifact_list)
- Link tools (link_add, link_list)
- Run tools (run_start, run_step, run_complete)

**What requires API keys**:
- Figma tools → `FIGMA_ACCESS_TOKEN`
- GitHub tools → `GITHUB_TOKEN`
- Slack tools → `SLACK_BOT_TOKEN`
- Confluence tools → `CONFLUENCE_API_TOKEN`
- Gamma tools → `GAMMA_API_KEY`

**Recommendation for Beginners**:
1. Start with just state management tools (no API keys needed)
2. Add one integration at a time as needed
3. Test each before adding the next

**Example .env (minimal)**:
```bash
DATABASE_URL=memory
MCP_HUB_API_KEY=my-secure-key
# No other keys needed to start!
```

---

### How do I add a new tool or connector?

**For Developers**:

1. **Create Tool File**: `mcp-hub/src/tools/your-connector.ts`

2. **Define Tools**:
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

const YourToolSchema = z.object({
  param: z.string(),
});

export function registerYourTools(server: Server, store: HubStore, env: Env) {
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'your_tool_name') {
      const args = YourToolSchema.parse(request.params.arguments);
      // Your tool logic here
      return { content: [{ type: 'text', text: 'Result' }] };
    }
  });
}
```

3. **Register with Resilience**:
```typescript
import { resilienceRegistry } from '../utils/resilience.js';

const breaker = resilienceRegistry.getBreaker('your-connector');
const bulkhead = resilienceRegistry.getBulkhead('your-connector');

// Use in tool handler
if (breaker.isOpen()) {
  throw new McpError(ErrorCode.InternalError, 'Connector unavailable');
}

await bulkhead.execute(async () => {
  // Your API call here
});
```

4. **Add to Tool Registry**: Update `mcp-hub/src/tools.ts`

5. **Submit PR**: See [CONTRIBUTING.md](./CONTRIBUTING.md)

**For Non-Developers**:
- Open a feature request: https://github.com/bcali/MCP/issues
- Describe the service and desired functionality
- Community/maintainer will implement

---

## Usage & Features

### What can I do with memory tools?

**Memory** = Shared key-value store that persists across chat sessions.

**Use Cases**:

**1. Store Project Context**:
```
"Store in memory: project_name=MCP Hub, tech_stack=TypeScript+Node.js+PostgreSQL"
```

**2. Save Decisions**:
```
"Remember this decision: use_scale_to_zero=true, reason=cost optimization"
```

**3. Store Preferences**:
```
"Save my code style preferences: indentation=2spaces, quotes=single, semicolons=always"
```

**4. Build Knowledge Base**:
```
"Store this API endpoint: stripe_charges=https://api.stripe.com/v1/charges"
```

**5. Search Across Sessions**:
```
"Search memory for anything related to 'authentication'"
```

**Memory Tools**:
- `memory_put` - Store key-value with optional tags
- `memory_get` - Retrieve by exact key
- `memory_search` - Search by query string or tags

**Example Workflow**:
```
Session 1:
"Store these requirements in memory with tag 'mvp'"

Session 2 (next day):
"Retrieve all MVP requirements from memory"
```

---

### What are artifacts and how do I use them?

**Artifacts** = Typed content storage for generated files/documents.

**Supported Types**:
- `document` - Text documents, markdown
- `presentation` - Generated slide decks
- `code` - Code snippets, patches
- `image` - Generated images (stored as URLs or R2)
- `data` - JSON, CSV data files
- Custom types (you define)

**Use Cases**:

**1. Save Generated Content**:
```
"Create a presentation about MCP architecture and save it as an artifact"
```

**2. Version Documentation**:
```
"Create a document artifact for the API spec, name it 'v1.0-api-spec'"
```

**3. Store Analysis Results**:
```
"Analyze this data and save results as artifact type='analysis'"
```

**4. Organize by Type**:
```
"List all presentation artifacts created this month"
```

**Artifact Tools**:
- `artifact_create` - Create with type, content, metadata
- `artifact_get` - Retrieve by ID
- `artifact_list` - Filter by type

**Example**:
```typescript
// Claude creates this automatically
{
  id: "uuid-here",
  type: "presentation",
  name: "MCP Architecture Deck",
  source: "gamma",
  contentText: "[Gamma presentation URL]",
  metadata: { slides: 15, theme: "modern" },
  createdAt: "2026-01-25T..."
}
```

---

### How do runs help with complex workflows?

**Runs** = Execution traces that track multi-step workflows from start to finish.

**Use Cases**:

**1. Track Long Tasks**:
```
"Start a run called 'Deploy v1.1.0' and track all deployment steps"
```

**2. Debug Workflows**:
```
"Show me the steps from the failed deployment run"
```

**3. Audit Trail**:
```
"List all runs related to database migrations"
```

**4. Resume After Failure**:
```
"Check the last run status and continue from where it failed"
```

**Run Structure**:
```typescript
Run {
  id: "uuid",
  name: "Deploy v1.1.0",
  status: "running" | "completed" | "failed",
  steps: [
    { ts: "...", kind: "note", message: "Starting deployment" },
    { ts: "...", kind: "tool_call", message: "Built Docker image" },
    { ts: "...", kind: "artifact", message: "Created deployment manifest" },
    { ts: "...", kind: "note", message: "Deployment complete" }
  ]
}
```

**Run Tools**:
- `run_start` - Create new run
- `run_step` - Add step (note, tool_call, artifact, link)
- `run_complete` - Mark as completed/failed

**Example Workflow**:
```
1. "Start a run called 'Refactor authentication system'"
2. [Claude makes changes, each as a step]
3. "Mark the authentication refactor run as completed"
4. [Later] "Show me what was done in the authentication refactor"
```

---

### Can I use this for team collaboration?

**Current Version (v1.1.0)**: Designed for **individual use**.

**Why Single-User**:
- Single shared API key
- No user authentication/authorization
- No access control on data
- Shared state across all clients

**Workaround for Small Teams**:
1. **Separate Deployments**: Each team member deploys their own instance
2. **Shared Cloud Instance**: Trust-based (everyone has full access)
3. **Use Tags**: Organize memory/artifacts by user (`tags: ["user:alice"]`)

**Planned for Future** (v2.0+):
- Multi-user authentication
- Per-user API keys
- Row-level security
- Team workspaces
- Collaboration features

**Alternative**: Use MCP Hub for personal work, share results via:
- Export artifacts as files
- Screenshot Console dashboards
- Generate reports from runs

---

## Troubleshooting

### Connection to Cloud Run fails - what do I check?

**Quick Checklist**:

1. **Verify URL Format**:
   ```
   Correct: https://mcp-hub-xxxxx.run.app/v1/sse?key=YOUR_KEY
   Wrong: https://mcp-hub-xxxxx.run.app (missing /v1/sse)
   ```

2. **Test Health Endpoint**:
   ```bash
   curl https://mcp-hub-xxxxx.run.app/healthz
   # Should return: {"ok":true}
   ```

3. **Verify API Key**:
   ```bash
   # Check GitHub Secrets
   gh secret list

   # Or check Cloud Run env vars
   gcloud run services describe mcp-hub \
     --format="value(spec.template.spec.containers[0].env)"
   ```

4. **Check Service Status**:
   ```bash
   gcloud run services describe mcp-hub --region=us-central1
   ```

5. **Review Logs**:
   ```bash
   gcloud run services logs read mcp-hub --limit=50
   ```

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed debugging.

---

### Tools work but responses are slow - how to improve?

**Common Causes & Solutions**:

**1. Database Query Performance**:
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_memory_key ON memory(key);
CREATE INDEX idx_artifacts_type ON artifacts(type);
CREATE INDEX idx_runs_created_at ON runs(created_at);
```

**2. Cold Starts** (scale-to-zero):
- **Accept**: 2-5 seconds is normal for first request
- **Optimize**: Use startup CPU boost (already enabled)
- **Eliminate**: Set min instances to 1 (+$15-20/month)

**3. External API Latency**:
- Monitor connector logs for slow APIs
- Consider caching results
- Use bulkhead to limit concurrent calls

**4. Insufficient Resources**:
```bash
# Increase Cloud Run resources
gcloud run services update mcp-hub \
  --memory=1Gi \
  --cpu=2
```

**Monitor Performance**:
- GCP Cloud Run metrics dashboard
- Supabase query performance stats
- Application logs (add timing)

---

### How do I reset everything and start fresh?

**Local Development**:
```bash
# Stop server
# Delete in-memory state (automatic on restart)
# Restart server
npm run dev
```

**Database (Supabase)**:
```sql
-- ⚠️ WARNING: This deletes ALL data

TRUNCATE TABLE memory CASCADE;
TRUNCATE TABLE artifacts CASCADE;
TRUNCATE TABLE links CASCADE;
TRUNCATE TABLE runs CASCADE;
TRUNCATE TABLE connections CASCADE;
```

**Selective Reset**:
```sql
-- Delete only old runs
DELETE FROM runs WHERE created_at < NOW() - INTERVAL '30 days';

-- Delete specific memory items
DELETE FROM memory WHERE key LIKE 'temp_%';

-- Delete all artifacts of a type
DELETE FROM artifacts WHERE type = 'temporary';
```

**Start Fresh (Cloud Run)**:
1. Delete all data (SQL above)
2. Redeploy service (triggers fresh start)
3. Clear client cache (restart Claude Code)

---

## Advanced Topics

### Can I self-host on other platforms?

**Currently Supported**: Google Cloud Run

**Planned Support**:
- Docker Compose (self-hosted)
- AWS ECS/Fargate
- Azure Container Instances
- DigitalOcean App Platform
- Fly.io

**DIY Self-Hosting** (today):

**1. Build Docker Image**:
```bash
cd mcp-hub
docker build -t mcp-hub .
```

**2. Run Locally**:
```bash
docker run -p 8080:8080 \
  -e MCP_HUB_API_KEY=your-key \
  -e DATABASE_URL=your-postgres-url \
  mcp-hub
```

**3. Deploy to Your Platform**:
- Follow platform-specific container deployment guide
- Set environment variables
- Ensure HTTPS and session affinity

---

### How secure is my data?

**Data Security**:
- **In Transit**: TLS 1.2+ (HTTPS only in production)
- **At Rest**: AES-256 encryption (Supabase default)
- **Database**: Private, not publicly accessible
- **API Key**: Environment variables, never in code

**Access Control**:
- API key required for all endpoints
- Health checks (`/healthz`) unauthenticated only

**Best Practices**:
- Rotate API keys every 90 days
- Use separate keys for dev/production
- Never commit keys to Git
- Monitor access logs

See [SECURITY.md](./SECURITY.md) for full security policy.

---

### Where can I get help?

**Documentation**:
- [README.md](./README.md) - Overview
- [SETUP.md](./SETUP.md) - Setup guide
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guide

**Community**:
- GitHub Issues: https://github.com/bcali/MCP/issues
- GitHub Discussions: https://github.com/bcali/MCP/discussions

**Before Asking**:
1. Search existing issues
2. Check troubleshooting guide
3. Review documentation
4. Try basic debugging steps

**When Asking**:
- Describe the problem clearly
- Include error messages
- Share relevant logs
- Mention what you've tried

---

**Have a question not answered here?** Open an issue: https://github.com/bcali/MCP/issues

**Last Updated**: 2026-01-25
