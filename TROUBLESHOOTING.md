# Troubleshooting Guide

Common issues and solutions for the MCP project.

---

## Table of Contents

- [Local Development Issues](#local-development-issues)
- [Cloud Deployment Issues](#cloud-deployment-issues)
- [Integration Issues](#integration-issues)
- [Performance Issues](#performance-issues)
- [Database Connection Problems](#database-connection-problems)
- [Getting Additional Help](#getting-additional-help)

---

## Local Development Issues

### Issue: "node: command not found"

**Symptoms**: Cannot run `npm` or `node` commands after installation.

**Solution**:
1. Restart your terminal/command prompt
2. Verify Node.js installation:
   ```bash
   node --version
   npm --version
   ```
3. If still not working, check PATH environment variable:
   ```bash
   # Windows (PowerShell)
   $env:PATH

   # Linux/macOS
   echo $PATH
   ```
4. Reinstall Node.js from https://nodejs.org/ (LTS version)

---

### Issue: "Cannot find module" errors

**Symptoms**: Import errors like `Error: Cannot find module '@modelcontextprotocol/sdk'`

**Cause**: Dependencies not installed or node_modules deleted.

**Solution**:
```bash
# Navigate to the specific project
cd mcp-hub  # or mcp-console or gamma-mcp-server

# Remove existing dependencies
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Verify build
npm run build
```

---

### Issue: TypeScript compilation errors

**Symptoms**: `tsc` errors during `npm run build`

**Common Errors**:

**1. Missing `.js` extension in imports**:
```typescript
// Error
import { createStore } from './store/index';

// Fix
import { createStore } from './store/index.js';
```

**2. Type-only imports not marked**:
```typescript
// Error
import { AccountInfo } from '@azure/msal-browser';

// Fix
import type { AccountInfo } from '@azure/msal-browser';
```

**3. Type mismatches**:
```typescript
// Error: string passed where EventId expected
generateEventId(source, eventId);

// Fix: Explicit type assertion
generateEventId(source as EventSource, eventId as string);
```

**Solution**:
1. Read the error message carefully (TypeScript errors are usually descriptive)
2. Check the file and line number mentioned
3. Compare with similar working code in the project
4. Run `npm run build` to verify fix

---

### Issue: Environment variables not loading

**Symptoms**: Application starts but features don't work, errors about missing API keys.

**Cause**: `.env` file not present or not being read.

**Solution**:

**For MCP Hub**:
```bash
cd mcp-hub

# Create .env from example
cp .env.example .env

# Edit .env and add your values
# For local dev, set:
DATABASE_URL=memory
MCP_HUB_API_KEY=your-local-key-here
PORT=8080
HOST=0.0.0.0

# Restart dev server
npm run dev
```

**For MCP Console**:
```bash
cd mcp-console

# Create .env.local
echo "VITE_MCP_HUB_URL=http://localhost:8080" > .env.local
echo "VITE_MCP_HUB_API_KEY=your-local-key-here" >> .env.local

# Restart dev server (required for Vite to pick up changes)
npm run dev
```

**Important**: Always restart dev server after changing `.env` files.

---

### Issue: Port already in use

**Symptoms**: `Error: listen EADDRINUSE: address already in use :::8080`

**Cause**: Another process is using port 8080.

**Solution**:

**Windows**:
```powershell
# Find process using port 8080
netstat -ano | findstr :8080

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Linux/macOS**:
```bash
# Find process using port 8080
lsof -i :8080

# Kill process (replace PID with actual process ID)
kill -9 <PID>
```

**Alternative**: Change port in `.env`:
```bash
PORT=8081
```

---

### Issue: Database connection fails in development

**Symptoms**: Error connecting to PostgreSQL database locally.

**Cause**: Using production database URL in local development.

**Solution**: Use in-memory mode for local development:

```bash
# In mcp-hub/.env
DATABASE_URL=memory
```

This bypasses PostgreSQL entirely and uses an in-memory store.

**If you need local PostgreSQL**:
1. Install PostgreSQL locally
2. Create database:
   ```bash
   createdb mcp_hub_dev
   ```
3. Run migrations (if any)
4. Update `.env`:
   ```bash
   DATABASE_URL=postgresql://localhost/mcp_hub_dev
   ```

---

## Cloud Deployment Issues

### Issue: GitHub Actions workflow fails

**Symptoms**: Red X on GitHub Actions, deployment doesn't complete.

**Common Causes**:

**1. Missing GitHub Secrets**:
- Go to repository Settings → Secrets and variables → Actions
- Verify all required secrets are set:
  - `GCP_WIF_PROVIDER`
  - `GCP_SERVICE_ACCOUNT`
  - `GCP_PROJECT_ID`
  - `MCP_HUB_API_KEY`
  - `DATABASE_URL`

**2. Workload Identity Federation not configured**:
- Verify WIF setup in GCP Console
- Check service account permissions
- See [SETUP.md](./SETUP.md) for WIF configuration

**3. Docker build fails**:
- Check workflow logs for build errors
- Verify Dockerfile syntax
- Test build locally:
  ```bash
  cd mcp-hub
  docker build -t mcp-hub .
  ```

**Solution**: Review GitHub Actions logs for specific error, fix, and push again.

---

### Issue: Cloud Run deployment succeeds but service doesn't work

**Symptoms**: Deployment shows success but accessing URL returns errors.

**Diagnosis**:
1. Check Cloud Run logs:
   ```bash
   gcloud run services logs read mcp-hub --limit=50
   ```

2. Check service status:
   ```bash
   gcloud run services describe mcp-hub --region=us-central1
   ```

**Common Causes**:

**1. Environment variables not set**:
```bash
# List current env vars
gcloud run services describe mcp-hub --format="value(spec.template.spec.containers[0].env)"

# Update if missing
gcloud run services update mcp-hub \
  --set-env-vars="MCP_HUB_API_KEY=your-key,DATABASE_URL=your-db-url"
```

**2. Database connection fails**:
- Verify `DATABASE_URL` is correct
- Check Supabase connection pooling settings
- Test connection from Cloud Shell:
  ```bash
  psql "$DATABASE_URL" -c "SELECT 1;"
  ```

**3. Cold start timeout**:
- Increase timeout in deployment workflow
- Consider setting min instances to 1 (costs more)

---

### Issue: SSE connection drops frequently

**Symptoms**: Claude Code/Cursor loses connection and needs to reconnect.

**Cause**: Cloud Run scaling or session affinity not configured.

**Solution**:

**1. Verify session affinity is enabled**:
```bash
gcloud run services describe mcp-hub \
  --format="value(spec.template.metadata.annotations['run.googleapis.com/sessionAffinity'])"

# Should output: true
```

**2. Enable if missing**:
```bash
gcloud run services update mcp-hub \
  --session-affinity
```

**3. Increase timeout**:
```bash
gcloud run services update mcp-hub \
  --timeout=300  # 5 minutes
```

---

### Issue: 503 Service Unavailable

**Symptoms**: HTTP 503 errors when accessing Cloud Run URL.

**Causes**:

**1. All instances are busy**: Increase max instances or concurrency.
**2. Health check failing**: Service not responding to `/healthz`.
**3. Cold start timeout**: First request takes too long.

**Solution**:

**Check health endpoint**:
```bash
curl https://your-service.run.app/healthz
```

**Check service configuration**:
```bash
gcloud run services describe mcp-hub \
  --format="yaml(status.conditions)"
```

**Increase resources if needed**:
```bash
gcloud run services update mcp-hub \
  --max-instances=5 \
  --concurrency=100 \
  --memory=1Gi
```

---

## Integration Issues

### Issue: Claude Code cannot connect to MCP Hub

**Symptoms**: Claude Code shows "Connection failed" or "Server not responding".

**Diagnosis**:

**1. Check URL format**:
```
Correct: https://mcp-hub-xxx.run.app/v1/sse?key=YOUR_API_KEY
Wrong: https://mcp-hub-xxx.run.app/v1/sse (missing API key)
Wrong: https://mcp-hub-xxx.run.app (missing /v1/sse)
```

**2. Verify API key**:
- Check GitHub Secrets for production key
- Check `.env` for local key
- Ensure key matches on both client and server

**3. Test connection manually**:
```bash
# Should return SSE stream
curl "http://localhost:8080/v1/sse?key=YOUR_API_KEY"
```

**Solution**:

**For local development**:
```json
// In Claude Code settings
{
  "mcpServers": {
    "hub-local": {
      "url": "http://localhost:8080/v1/sse",
      "headers": {
        "x-api-key": "your-local-key"
      }
    }
  }
}
```

**For production**:
```json
{
  "mcpServers": {
    "hub": {
      "url": "https://mcp-hub-xxx.run.app/v1/sse",
      "headers": {
        "x-api-key": "your-production-key"
      }
    }
  }
}
```

---

### Issue: Tools execute but don't return results

**Symptoms**: Tool call appears to succeed but no response in Claude Code.

**Cause**: Error in tool handler or SSE stream closed.

**Diagnosis**:

**1. Check server logs**:
```bash
# Local
npm run dev  # Watch console output

# Production
gcloud run services logs read mcp-hub --limit=50
```

**2. Look for errors**:
- TypeScript errors
- Database connection errors
- External API failures

**Solution**:

**Enable debug logging**:
```typescript
// In mcp-hub/src/index.ts
logger.setLevel('debug');
```

**Check circuit breaker state**:
- If connector fails repeatedly, circuit breaker opens
- Wait 5 minutes for automatic reset
- Or restart service to reset manually

---

### Issue: Platform connectors not working (Figma, GitHub, etc.)

**Symptoms**: Connector-specific tools fail with "API key missing" or "Unauthorized".

**Cause**: Missing or invalid API keys for external services.

**Solution**:

**1. Verify API keys are set**:
```bash
# Local (.env file)
GAMMA_API_KEY=gma_xxxxx
FIGMA_ACCESS_TOKEN=figa_xxxxx
GITHUB_TOKEN=ghp_xxxxx

# Production (GitHub Secrets or Cloud Run env vars)
gcloud run services describe mcp-hub \
  --format="value(spec.template.spec.containers[0].env)"
```

**2. Test API key separately**:
```bash
# Figma
curl -H "X-Figma-Token: YOUR_TOKEN" \
  https://api.figma.com/v1/me

# GitHub
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user

# Gamma
curl -H "Authorization: Bearer YOUR_KEY" \
  https://api.gamma.app/api/v1/users/me
```

**3. Update keys if expired**:
- Regenerate from service provider
- Update GitHub Secrets
- Redeploy or restart service

---

### Issue: Circuit breaker stuck in OPEN state

**Symptoms**: Connector tools fail with "Circuit Breaker OPEN" message.

**Cause**: Too many failures caused circuit breaker to open.

**Diagnosis**:

**Check logs for original error**:
```bash
gcloud run services logs read mcp-hub --limit=100 | grep "OPEN"
```

**Solution**:

**1. Fix underlying issue** (API key, network, etc.)

**2. Wait for automatic reset** (5 minutes)

**3. Manual reset** (restart service):
```bash
# Local
# Stop and restart npm run dev

# Production
gcloud run services update mcp-hub \
  --max-instances=3 --max-instances=3  # Force update
```

**4. Future prevention**:
- Monitor error logs
- Set up alerts for high error rates
- Implement retry logic with exponential backoff

---

## Performance Issues

### Issue: Slow response times

**Symptoms**: Tool execution takes >5 seconds, timeouts occur.

**Diagnosis**:

**1. Check database query performance**:
```sql
-- Enable query logging in PostgreSQL
ALTER DATABASE postgres SET log_statement = 'all';

-- Review slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**2. Check external API latency**:
- Review logs for API call duration
- Test API endpoints directly

**Solution**:

**1. Add database indexes**:
```sql
-- Index frequently queried columns
CREATE INDEX idx_memory_key ON memory(key);
CREATE INDEX idx_artifacts_type ON artifacts(type);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_created_at ON runs(created_at);
```

**2. Optimize connection pool**:
```javascript
// Increase pool size if needed
{
  max: 20,  // Up from 10
  min: 2,   // Up from 0
}
```

**3. Increase Cloud Run resources**:
```bash
gcloud run services update mcp-hub \
  --memory=1Gi \
  --cpu=2
```

**4. Monitor and profile**:
- Use GCP Cloud Trace for request tracing
- Add custom timing logs
- Review Cloud Run metrics dashboard

---

### Issue: High cold start latency

**Symptoms**: First request after idle period takes 5-10 seconds.

**Cause**: Cloud Run scale-to-zero configuration.

**Solutions**:

**Option 1: Keep warm instance** (costs more):
```bash
gcloud run services update mcp-hub \
  --min-instances=1
```
**Cost impact**: +$15-20/month

**Option 2: Optimize cold start**:
- Reduce Docker image size
- Use startup CPU boost (already enabled)
- Lazy-load dependencies

**Option 3: Accept cold starts** (recommended for personal use):
- 2-5 seconds is acceptable for development
- Rare occurrence with regular usage

---

## Database Connection Problems

### Issue: "too many clients" error

**Symptoms**: `Error: sorry, too many clients already`

**Cause**: Connection pool exhausted or not released properly.

**Solution**:

**1. Check connection pool settings**:
```javascript
const pool = new Pool({
  max: 10,  // Maximum connections
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

**2. Verify connections are released**:
```typescript
// Good: Using async/await (auto-releases)
const result = await pool.query('SELECT * FROM memory');

// Bad: Not releasing connection
const client = await pool.connect();
const result = await client.query('SELECT * FROM memory');
// Missing: client.release();
```

**3. Monitor active connections**:
```sql
SELECT count(*) FROM pg_stat_activity;
```

**4. Kill idle connections** (if needed):
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '5 minutes';
```

---

### Issue: Database timeouts

**Symptoms**: `Error: Connection terminated unexpectedly` or `timeout expired`

**Cause**: Long-running queries or network issues.

**Solution**:

**1. Increase connection timeout**:
```javascript
const pool = new Pool({
  connectionTimeoutMillis: 10000,  // Up from 5000
});
```

**2. Optimize slow queries**:
```sql
-- Find slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000  -- > 1 second
ORDER BY mean_exec_time DESC;
```

**3. Add query timeout**:
```typescript
// Set statement timeout (5 seconds)
await pool.query('SET statement_timeout = 5000');
```

**4. Check Supabase status**:
- Visit https://status.supabase.com
- Check for ongoing incidents

---

### Issue: Database schema out of sync

**Symptoms**: Errors about missing tables or columns.

**Cause**: Database schema not created or outdated.

**Solution**:

**1. Create schema manually**:
```sql
-- Connect to Supabase SQL Editor or psql
-- Run schema from mcp-hub/docs/schema.sql (if exists)
-- Or create tables manually:

CREATE TABLE IF NOT EXISTS memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  event_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repeat for artifacts, links, runs, connections tables
```

**2. Verify tables exist**:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

**3. Future: Add migration system**:
- Use tools like `node-pg-migrate` or `knex`
- Version control schema changes
- Automatic migrations on deployment

---

## Getting Additional Help

### Before Asking for Help

1. **Check existing documentation**:
   - [README.md](./README.md) - Project overview
   - [SETUP.md](./SETUP.md) - Setup instructions
   - [PRD.md](./PRD.md) - Architecture details
   - [CLAUDE.md](./CLAUDE.md) - AI assistant context

2. **Search GitHub Issues**:
   - https://github.com/bcali/MCP/issues
   - Someone may have had the same problem

3. **Review logs**:
   - Local: Terminal output from `npm run dev`
   - Production: `gcloud run services logs read mcp-hub`

4. **Try basic debugging**:
   - Restart the service
   - Check environment variables
   - Verify API keys
   - Test with minimal configuration

### How to Ask for Help

**Open a GitHub Issue** with:

1. **Clear title**: "Database connection fails in production"
2. **Environment**:
   - Local or production?
   - Operating system
   - Node.js version
   - Component (MCP Hub, Console, Gamma)
3. **Steps to reproduce**:
   - What were you doing?
   - What did you expect?
   - What actually happened?
4. **Error messages**:
   - Copy full error (use code blocks)
   - Include stack traces
5. **What you've tried**:
   - List troubleshooting steps already attempted

**Example**:
```markdown
## Issue: Cannot connect to database in production

**Environment**:
- Production Cloud Run
- MCP Hub v1.1.0
- PostgreSQL (Supabase)

**Steps to reproduce**:
1. Deploy to Cloud Run via GitHub Actions
2. Access /healthz/ready endpoint
3. Returns 500 error

**Error message**:
```
Error: Connection terminated unexpectedly
  at Connection.handleError (...)
```

**What I've tried**:
- Verified DATABASE_URL is set in Cloud Run
- Tested connection from Cloud Shell (works)
- Checked Supabase logs (no errors)
```

### Community Resources

- **GitHub Discussions**: https://github.com/bcali/MCP/discussions
- **GitHub Issues**: https://github.com/bcali/MCP/issues

---

## Common Error Messages Reference

| Error | Meaning | Solution |
|-------|---------|----------|
| `EADDRINUSE` | Port already in use | Kill process or change port |
| `MODULE_NOT_FOUND` | Missing dependencies | Run `npm install` |
| `ECONNREFUSED` | Cannot connect to database | Check DATABASE_URL |
| `Unauthorized` | Invalid API key | Verify MCP_HUB_API_KEY |
| `Circuit Breaker OPEN` | Too many failures | Fix underlying issue, wait 5min |
| `Too many clients` | Connection pool exhausted | Increase max connections |
| `Timeout` | Operation took too long | Increase timeout or optimize |
| `503 Service Unavailable` | Cloud Run not ready | Check health endpoint, increase resources |

---

**Last Updated**: 2026-01-25

For issues not covered here, please open a GitHub issue: https://github.com/bcali/MCP/issues
