# MCP Hub Monitoring & Observability Guide

Complete guide to monitoring, logging, and observability for MCP Hub in production.

---

## Table of Contents

- [GCP Cloud Logging Setup](#gcp-cloud-logging-setup)
- [Metrics Dashboard Configuration](#metrics-dashboard-configuration)
- [Health Check Monitoring](#health-check-monitoring)
- [Alert Configuration](#alert-configuration)
- [Log Query Examples](#log-query-examples)
- [Performance Monitoring](#performance-monitoring)
- [Troubleshooting with Logs](#troubleshooting-with-logs)

---

## GCP Cloud Logging Setup

### Accessing Logs

**Cloud Console**:
1. Navigate to https://console.cloud.google.com/logs
2. Select your project
3. Filter by resource: `Cloud Run Revision` → `mcp-hub`

**Command Line**:
```bash
# View recent logs
gcloud run services logs read mcp-hub \
  --limit=50 \
  --region=us-central1

# Follow logs in real-time
gcloud run services logs tail mcp-hub \
  --region=us-central1

# Filter by severity
gcloud run services logs read mcp-hub \
  --filter="severity>=ERROR" \
  --limit=100
```

### Log Levels

MCP Hub uses structured logging with the following levels:

| Level | Use Case | Example |
|-------|----------|---------|
| `DEBUG` | Detailed diagnostics | Request/response payloads, internal state |
| `INFO` | Normal operations | Server started, tool executed, connection established |
| `WARN` | Unexpected but handled | Deprecated feature used, rate limit approaching |
| `ERROR` | Errors requiring attention | Database connection failed, external API error |

### Structured Logging Format

**Production Mode** (`NODE_ENV=production`):
```json
{
  "timestamp": "2026-01-25T10:30:45.123Z",
  "level": "info",
  "message": "Tool executed successfully",
  "context": {
    "tool": "memory_put",
    "sessionId": "abc123",
    "duration": 45
  }
}
```

**Development Mode**:
```
[2026-01-25 10:30:45] INFO: Tool executed successfully {"tool":"memory_put","sessionId":"abc123","duration":45}
```

### Log Retention

**Default**: 30 days in Cloud Logging

**Custom Retention**:
1. Go to Cloud Logging → Logs Storage
2. Create log sink for long-term storage
3. Export to BigQuery or Cloud Storage

**Example: Export to BigQuery**:
```bash
# Create BigQuery dataset
bq mk --dataset mcp_logs

# Create log sink
gcloud logging sinks create mcp-hub-bigquery \
  bigquery.googleapis.com/projects/PROJECT_ID/datasets/mcp_logs \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="mcp-hub"'
```

---

## Metrics Dashboard Configuration

### Cloud Run Metrics

**Built-in Metrics** (Cloud Console → Cloud Run → mcp-hub → Metrics):

1. **Request Count**
   - Total requests over time
   - Useful for: Traffic patterns, usage trends

2. **Request Latency**
   - p50, p95, p99 latencies
   - Useful for: Performance issues, cold starts

3. **Container Instance Count**
   - Active instances
   - Useful for: Scaling behavior, cost tracking

4. **Container CPU Utilization**
   - CPU usage per instance
   - Useful for: Resource optimization

5. **Container Memory Utilization**
   - Memory usage per instance
   - Useful for: Memory leak detection

6. **Billable Instance Time**
   - Actual billed time
   - Useful for: Cost attribution

### Custom Dashboard

**Create Dashboard**:
1. Go to Cloud Console → Monitoring → Dashboards
2. Click "Create Dashboard"
3. Name it "MCP Hub"

**Add Charts**:

**1. Request Rate**:
```
Resource type: Cloud Run Revision
Metric: Request count
Aggregation: Rate (1m)
Filter: service_name = "mcp-hub"
```

**2. Error Rate**:
```
Resource type: Cloud Run Revision
Metric: Request count
Aggregation: Rate (1m)
Filter: service_name = "mcp-hub" AND response_code_class = "5xx"
```

**3. Latency Percentiles**:
```
Resource type: Cloud Run Revision
Metric: Request latencies
Aggregation: 50th, 95th, 99th percentile
Filter: service_name = "mcp-hub"
```

**4. Instance Count**:
```
Resource type: Cloud Run Revision
Metric: Instance count
Aggregation: Mean
Filter: service_name = "mcp-hub"
```

**5. Database Connections** (custom metric - requires instrumentation):
```typescript
// Add to mcp-hub/src/store/postgres.ts
import { collectDefaultMetrics, register } from 'prom-client';

const dbConnections = new Gauge({
  name: 'mcp_hub_db_connections',
  help: 'Number of active database connections'
});

// Update on pool events
pool.on('connect', () => {
  dbConnections.set(pool.totalCount);
});
```

---

## Health Check Monitoring

### Health Endpoints

**Liveness Probe** (`/healthz`):
- Returns: `{"ok": true}`
- Use: Verify server is responsive
- Frequency: Every 5 seconds

**Readiness Probe** (`/healthz/ready`):
- Returns: `{"ok": true, "status": "ready", "database": "connected", "version": "1.1.0"}`
- Use: Verify server and dependencies are healthy
- Frequency: Every 10 seconds

### Uptime Monitoring

**Cloud Monitoring Uptime Checks**:

1. Go to Cloud Console → Monitoring → Uptime Checks
2. Click "Create Uptime Check"
3. Configure:
   - **Name**: MCP Hub Health
   - **Protocol**: HTTPS
   - **Resource Type**: URL
   - **Hostname**: mcp-hub-xxxxx.run.app
   - **Path**: `/healthz/ready`
   - **Check Frequency**: 1 minute
   - **Regions**: 3+ regions

4. Click "Create"

**Alert on Failures**:
- Automatically creates alert policy
- Sends notification if 2+ consecutive failures
- Configure notification channels (email, Slack, PagerDuty)

### External Monitoring

**Third-Party Options**:

**1. UptimeRobot** (Free):
```
Monitor Type: HTTP(s)
URL: https://mcp-hub-xxxxx.run.app/healthz
Interval: 5 minutes
```

**2. Pingdom**:
```
Check Type: HTTP
URL: https://mcp-hub-xxxxx.run.app/healthz/ready
Interval: 1 minute
Alert After: 2 failures
```

**3. Better Uptime**:
```
Monitor: https://mcp-hub-xxxxx.run.app/healthz/ready
Frequency: 60 seconds
Regions: Multiple
```

---

## Alert Configuration

### Recommended Alerts

**1. High Error Rate**:
```yaml
Display Name: MCP Hub - High Error Rate
Condition:
  Metric: Request count
  Filter: response_code_class = "5xx"
  Threshold: > 5 errors in 1 minute
  Duration: 2 minutes
Notification:
  Email: your-email@example.com
```

**2. High Latency**:
```yaml
Display Name: MCP Hub - High Latency
Condition:
  Metric: Request latencies
  Aggregation: 95th percentile
  Threshold: > 2000ms
  Duration: 5 minutes
Notification:
  Email: your-email@example.com
```

**3. Instance Failures**:
```yaml
Display Name: MCP Hub - Instance Failures
Condition:
  Metric: Instance count
  Threshold: = 0 instances
  Duration: 2 minutes
Notification:
  Email: your-email@example.com
  Severity: Critical
```

**4. Database Connection Errors**:
```yaml
Display Name: MCP Hub - Database Errors
Condition:
  Log-based metric
  Filter: textPayload =~ "database connection failed"
  Threshold: > 3 occurrences in 5 minutes
Notification:
  Email: your-email@example.com
```

**5. Budget Alert** (Cost Control):
```bash
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="MCP Hub Monthly Budget" \
  --budget-amount=10 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

### Alert Policies via gcloud

**Create Error Rate Alert**:
```bash
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="MCP Hub High Error Rate" \
  --condition-display-name="5xx errors > 5/min" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=120s \
  --condition-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="mcp-hub" AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"'
```

---

## Log Query Examples

### Common Queries

**1. All Errors in Last Hour**:
```
resource.type="cloud_run_revision"
resource.labels.service_name="mcp-hub"
severity>=ERROR
timestamp>="2026-01-25T09:00:00Z"
```

**2. Specific Tool Executions**:
```
resource.type="cloud_run_revision"
resource.labels.service_name="mcp-hub"
jsonPayload.context.tool="memory_put"
```

**3. Slow Requests (>2 seconds)**:
```
resource.type="cloud_run_revision"
resource.labels.service_name="mcp-hub"
jsonPayload.context.duration>2000
```

**4. Circuit Breaker Events**:
```
resource.type="cloud_run_revision"
resource.labels.service_name="mcp-hub"
textPayload=~"Circuit Breaker OPEN"
```

**5. Database Connection Issues**:
```
resource.type="cloud_run_revision"
resource.labels.service_name="mcp-hub"
(textPayload=~"ECONNREFUSED" OR textPayload=~"too many clients")
```

**6. API Key Authentication Failures**:
```
resource.type="cloud_run_revision"
resource.labels.service_name="mcp-hub"
httpRequest.status=401
```

### Advanced Queries

**Error Rate by Endpoint**:
```
resource.type="cloud_run_revision"
resource.labels.service_name="mcp-hub"
severity>=ERROR
| group_by httpRequest.requestUrl
| count()
```

**Latency Breakdown by Tool**:
```
resource.type="cloud_run_revision"
resource.labels.service_name="mcp-hub"
jsonPayload.context.tool:*
| percentile jsonPayload.context.duration [50, 95, 99]
| group_by jsonPayload.context.tool
```

### Exporting Queries

**Save as Log-Based Metric**:
1. Run query in Logs Explorer
2. Click "Create Metric"
3. Configure:
   - **Metric Type**: Counter or Distribution
   - **Name**: `mcp_hub/tool_execution_duration`
   - **Field**: `jsonPayload.context.duration`
4. Use in dashboards and alerts

---

## Performance Monitoring

### Key Performance Indicators (KPIs)

**1. Request Latency**:
- **Target**: p95 < 1000ms, p99 < 2000ms
- **Monitor**: Cloud Run request latency metric
- **Alert**: If p95 > 2000ms for 5 minutes

**2. Error Rate**:
- **Target**: < 1% of total requests
- **Monitor**: 5xx response codes
- **Alert**: If > 5 errors in 1 minute

**3. Availability**:
- **Target**: 99.5% uptime (SLO)
- **Monitor**: Uptime checks + health endpoint
- **Alert**: If 2+ consecutive failures

**4. Cold Start Frequency**:
- **Target**: < 10% of requests
- **Monitor**: Log analysis for cold start events
- **Optimize**: Increase min instances if needed

**5. Database Query Performance**:
- **Target**: p95 < 100ms
- **Monitor**: Query timing logs
- **Alert**: If p95 > 500ms

### Latency Breakdown

**Typical Request Timeline**:
```
Total: 250ms
  ├─ Cloud Run routing: 10ms
  ├─ API key validation: 5ms
  ├─ Circuit breaker check: 1ms
  ├─ Tool execution: 200ms
  │   ├─ Input validation: 5ms
  │   ├─ Database query: 50ms
  │   └─ Business logic: 145ms
  └─ Response serialization: 34ms
```

**Identify Bottlenecks**:
```typescript
// Add timing to tool handlers
const startTime = Date.now();
const result = await executeToolLogic();
const duration = Date.now() - startTime;

logger.info('Tool executed', {
  tool: toolName,
  duration,
  // Add more context
});
```

### Database Query Analysis

**Supabase Dashboard**:
1. Go to https://app.supabase.com
2. Select your project
3. Navigate to "Database" → "Query Performance"

**Manual Analysis**:
```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- > 100ms average
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Reset stats
SELECT pg_stat_statements_reset();
```

---

## Troubleshooting with Logs

### Common Issues & Log Patterns

**1. Authentication Failures**:
```
Pattern: httpRequest.status=401
Query:
  resource.labels.service_name="mcp-hub"
  httpRequest.status=401

Cause: Invalid or missing API key
Fix: Verify API key in client configuration
```

**2. Database Connection Errors**:
```
Pattern: "ECONNREFUSED" or "too many clients"
Query:
  resource.labels.service_name="mcp-hub"
  (textPayload=~"ECONNREFUSED" OR textPayload=~"too many clients")

Cause: Database unreachable or connection pool exhausted
Fix: Check DATABASE_URL, increase pool size, or restart service
```

**3. Circuit Breaker Opened**:
```
Pattern: "Circuit Breaker OPEN"
Query:
  resource.labels.service_name="mcp-hub"
  textPayload=~"Circuit Breaker OPEN"

Cause: Too many failures to external API
Fix: Check external service status, verify API keys, wait 5min for reset
```

**4. Timeout Errors**:
```
Pattern: "Operation timed out" or "timeout expired"
Query:
  resource.labels.service_name="mcp-hub"
  textPayload=~"timeout"
  severity>=ERROR

Cause: Long-running operation or slow external API
Fix: Increase timeout, optimize query, or add caching
```

**5. Memory Issues**:
```
Pattern: High memory usage in metrics
Query:
  resource.type="cloud_run_revision"
  resource.labels.service_name="mcp-hub"
  metric.type="run.googleapis.com/container/memory/utilizations"

Cause: Memory leak or large payloads
Fix: Review code for leaks, increase memory limit, optimize data handling
```

### Debugging Workflow

**Step 1: Identify the Problem**
```bash
# Check recent errors
gcloud run services logs read mcp-hub \
  --filter="severity>=ERROR" \
  --limit=20
```

**Step 2: Get Context**
```bash
# View logs around error timestamp
gcloud run services logs read mcp-hub \
  --filter="timestamp>='2026-01-25T10:00:00Z' AND timestamp<='2026-01-25T10:05:00Z'" \
  --limit=100
```

**Step 3: Analyze Patterns**
```bash
# Count errors by type
gcloud logging read \
  'resource.labels.service_name="mcp-hub" AND severity>=ERROR' \
  --format=json \
  | jq -r '.[] | .textPayload' \
  | sort | uniq -c | sort -rn
```

**Step 4: Check Dependencies**
```bash
# Database connectivity
curl -I https://your-supabase-url.supabase.co

# External APIs
curl -I https://api.figma.com/v1/me
```

**Step 5: Review Metrics**
- Check Cloud Run dashboard for resource usage
- Review Supabase dashboard for database performance
- Check uptime monitoring for service availability

---

## Best Practices

### Logging Best Practices

1. **Use Structured Logging**:
   ```typescript
   // Good
   logger.info('Tool executed', { tool: 'memory_put', duration: 45 });

   // Bad
   logger.info(`Tool memory_put executed in 45ms`);
   ```

2. **Add Context**:
   ```typescript
   logger.error('Database query failed', {
     query: 'SELECT * FROM memory',
     error: err.message,
     stack: err.stack,
     sessionId: req.sessionId
   });
   ```

3. **Never Log Secrets**:
   ```typescript
   // Bad - logs API key
   logger.info('API call', { apiKey: process.env.API_KEY });

   // Good - omit sensitive data
   logger.info('API call', { service: 'figma' });
   ```

4. **Use Appropriate Log Levels**:
   - DEBUG: Detailed diagnostics (disabled in production)
   - INFO: Normal operations
   - WARN: Unexpected but handled
   - ERROR: Errors requiring attention

### Monitoring Best Practices

1. **Set Up Alerts Early**: Don't wait for incidents
2. **Monitor What Matters**: Focus on KPIs, not vanity metrics
3. **Regular Reviews**: Check dashboards weekly
4. **Document Runbooks**: How to respond to each alert
5. **Test Alerts**: Trigger test alerts to verify configuration

### Cost Optimization

1. **Log Retention**: Use 30-day default, export to BigQuery for long-term
2. **Query Efficiency**: Use filters to reduce log volume scanned
3. **Dashboard Limits**: Limit to essential metrics
4. **Alert Throttling**: Prevent alert storms (max 1 per hour)

---

## Resources

- **Cloud Logging Docs**: https://cloud.google.com/logging/docs
- **Cloud Monitoring Docs**: https://cloud.google.com/monitoring/docs
- **Cloud Run Observability**: https://cloud.google.com/run/docs/logging
- **Supabase Logs**: https://supabase.com/docs/guides/platform/logs

---

**Last Updated**: 2026-01-25
**Version**: 1.1.0
