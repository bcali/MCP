# MCP Hub Monitoring & Observability Guide

**Last Updated**: 2026-01-27
**Status**: Production

---

## Overview

This guide documents monitoring strategies, key metrics, and lessons learned from production deployments.

---

## Lessons Learned from Initial Deployment

### Issue 1: Incorrect gcloud Flag ❌
**Problem**: `--startup-cpu-boost` is not a valid flag
**Solution**: Changed to `--cpu-boost`
**Impact**: Deployment failed immediately
**Prevention**: Test gcloud commands locally before committing

### Issue 2: Container Startup Timeout ❌
**Problem**: Container failed to start and listen on port within timeout
**Root Cause**: Database connection happening BEFORE HTTP server starts
**Solution**: Ensured Supabase database was active (was paused)
**Impact**: 3 failed deployments, ~15 minutes debugging
**Prevention**:
- Add startup health checks
- Monitor database connection time
- Consider async database initialization

### Issue 3: Supabase Database Paused 🛑
**Problem**: `ENOTFOUND db.zsksxijnmxfsolilxihy.supabase.co`
**Root Cause**: Supabase free tier pauses databases after 7 days of inactivity
**Solution**: Resumed database in Supabase dashboard
**Impact**: DNS lookup failure, container never started
**Prevention**:
- Pin database to stay active (paid tier)
- Use connection pooler for better serverless compatibility
- Add retry logic with exponential backoff
- Monitor database status

---

## Key Metrics to Monitor

### 1. Startup Health Metrics

**What to Track**:
- Database connection time
- Migration execution time
- Total startup time (initialization → listening on port)
- Startup errors

**Why**: Detect slow database connections or failing migrations before Cloud Run times out

**Endpoint**: `GET /v1/metrics/startup`

**Example Response**:
```json
{
  "databaseConnected": true,
  "databaseConnectionTime": 1234,
  "serverListening": true,
  "totalStartupTime": 2567,
  "errors": []
}
```

### 2. Database Connection Pool

**What to Track**:
- Total connections
- Idle connections
- Waiting connections
- Connection errors

**Why**: Identify connection leaks or pool exhaustion

**Endpoint**: `GET /v1/metrics/database`

**Example Response**:
```json
{
  "totalCount": 5,
  "idleCount": 3,
  "waitingCount": 0
}
```

### 3. Tool Execution Metrics

**What to Track**:
- Total executions per tool
- Success rate per tool
- Average execution time per tool
- Recent failures

**Why**: Identify problematic tools or external API issues

**Endpoint**: `GET /v1/metrics/tools`

**Example Response**:
```json
{
  "total": 150,
  "successful": 145,
  "failed": 5,
  "successRate": 96.7,
  "avgDuration": 847,
  "byTool": {
    "gamma_generate": {
      "count": 50,
      "successRate": 98.0,
      "avgDuration": 1523
    }
  }
}
```

### 4. Circuit Breaker Status

**What to Track**:
- Breaker state (CLOSED, OPEN, HALF_OPEN)
- Failure count
- Last failure time
- Next retry time (if OPEN)

**Why**: Monitor external service health and resilience patterns

**Endpoint**: `GET /v1/metrics/resilience`

**Example Response**:
```json
{
  "gamma": {
    "state": "CLOSED",
    "failures": 0,
    "lastFailure": null
  },
  "figma": {
    "state": "OPEN",
    "failures": 5,
    "lastFailure": "2026-01-27T01:30:00Z",
    "nextRetry": "2026-01-27T01:35:00Z"
  }
}
```

---

## GCP Cloud Logging

### Structured Logs

**Production logs are JSON** (via `logger` utility):
```json
{
  "timestamp": "2026-01-27T01:25:21.762425Z",
  "level": "error",
  "message": "Database connection failed",
  "error": {
    "message": "getaddrinfo ENOTFOUND ...",
    "stack": "..."
  }
}
```

### Key Log Queries

**1. Startup Errors**
```
resource.type="cloud_run_revision"
resource.labels.service_name="mcp-hub"
jsonPayload.level="error"
jsonPayload.message:"started" OR jsonPayload.message:"failed"
```

**2. Database Connection Issues**
```
resource.type="cloud_run_revision"
resource.labels.service_name="mcp-hub"
jsonPayload.message:"database" OR jsonPayload.message:"PostgreSQL"
severity="ERROR"
```

**3. Tool Execution Failures**
```
resource.type="cloud_run_revision"
resource.labels.service_name="mcp-hub"
jsonPayload.message:"tool" OR jsonPayload.toolName!=""
severity="ERROR"
```

**4. Circuit Breaker Events**
```
resource.type="cloud_run_revision"
resource.labels.service_name="mcp-hub"
jsonPayload.message:"circuit breaker" OR jsonPayload.message:"OPEN"
```

### Log Retention

- **Default**: 30 days for Cloud Run logs
- **Increase**: Configure in GCP Logging settings
- **Export**: Set up log sinks for long-term storage (BigQuery, Cloud Storage)

---

## Alerting Strategy

### Critical Alerts (Immediate Action Required)

1. **Service Down**
   - Condition: Health check fails for > 2 minutes
   - Action: Check logs, restart service if needed

2. **Database Connection Failed**
   - Condition: Database connection errors > 5 in 5 minutes
   - Action: Check Supabase status, verify connection string

3. **High Error Rate**
   - Condition: Tool execution error rate > 10% over 10 minutes
   - Action: Check external API status, review circuit breaker state

### Warning Alerts (Monitor Closely)

1. **Slow Startup**
   - Condition: Startup time > 10 seconds
   - Action: Review database migration time, check Supabase performance

2. **Circuit Breaker Open**
   - Condition: Any circuit breaker in OPEN state > 5 minutes
   - Action: Investigate external service availability

3. **High Database Connection Usage**
   - Condition: Idle connections < 2 for > 5 minutes
   - Action: Review connection pool config, check for leaks

### Info Alerts (Good to Know)

1. **Scale to Zero**
   - Condition: Instance count = 0 for > 30 minutes
   - Action: None (expected behavior)

2. **Cold Start**
   - Condition: First request after scale-to-zero
   - Action: None (monitor startup time)

---

## Monitoring Setup (GCP)

### 1. Cloud Monitoring Dashboard

Create a dashboard with these widgets:

**Request Metrics**:
- Request count (per minute)
- Request latency (p50, p95, p99)
- Error rate (4xx, 5xx)

**Resource Metrics**:
- CPU utilization
- Memory utilization
- Instance count

**Custom Metrics** (from `/v1/metrics/*` endpoints):
- Startup time
- Database connection pool usage
- Tool execution success rate
- Circuit breaker status

### 2. Uptime Checks

Configure uptime monitoring:
- **Endpoint**: `/healthz/ready`
- **Frequency**: Every 1 minute
- **Timeout**: 10 seconds
- **Alert**: If down for > 2 checks

### 3. Log-based Metrics

Create metrics from logs:

**Startup Time**:
```
resource.type="cloud_run_revision"
jsonPayload.message="MCP Hub started"
EXTRACT(jsonPayload.totalStartupTime)
```

**Database Errors**:
```
resource.type="cloud_run_revision"
jsonPayload.level="error"
jsonPayload.message=~"database|PostgreSQL|ENOTFOUND"
```

---

## Performance Baselines

Based on initial deployment:

| Metric | Baseline | Target | Alert Threshold |
|--------|----------|--------|-----------------|
| Cold start time | 3-5s | <3s | >10s |
| Warm startup | 1-2s | <1s | >5s |
| Database connection | 0.5-1s | <500ms | >2s |
| Health check latency | 50-100ms | <50ms | >500ms |
| Tool execution (avg) | 500-1000ms | <500ms | >5s |
| Memory usage | 200-300MB | <250MB | >400MB |
| CPU usage (idle) | 5-10% | <5% | >50% |

---

## Debugging Checklist

When deployment fails:

### 1. Check GitHub Actions Logs
- [ ] Workflow triggered correctly
- [ ] Authentication to GCP succeeded
- [ ] gcloud deploy command succeeded
- [ ] Note any error messages

### 2. Check Cloud Run Logs
- [ ] Go to GCP Console → Cloud Run → Service → Logs
- [ ] Filter by severity=ERROR
- [ ] Check timestamp around deployment time
- [ ] Look for startup errors

### 3. Check Database Status
- [ ] Supabase dashboard shows "Active"
- [ ] Connection string is correct
- [ ] Database is reachable from Cloud Run region
- [ ] Connection pooler is enabled (for serverless)

### 4. Check Health Endpoints
```bash
# Basic health
curl https://YOUR-URL/healthz

# Readiness (with database check)
curl https://YOUR-URL/healthz/ready

# Detailed metrics
curl -H "x-api-key: YOUR_KEY" https://YOUR-URL/v1/metrics
```

### 5. Check Environment Variables
- [ ] All required secrets are set in GitHub
- [ ] MCP_HUB_API_KEY is set
- [ ] DATABASE_URL is set (or "memory")
- [ ] Optional connector keys are set (if needed)

### 6. Test Locally
```bash
cd mcp-hub
npm run build
NODE_ENV=production DATABASE_URL=memory PORT=8080 node dist/index.js
curl http://localhost:8080/healthz/ready
```

---

## Cost Monitoring

### Current Configuration
- **Min instances**: 0 (scale to zero)
- **Max instances**: 3
- **CPU**: 1 vCPU
- **Memory**: 512Mi
- **Expected cost**: $1-5/month for personal use

### Cost Optimization Tips
1. **Scale to zero works!** - No charges when idle
2. **Monitor cold starts** - If too frequent, increase min-instances
3. **Use connection pooler** - Reduces database connection overhead
4. **Batch operations** - Reduce number of cold starts
5. **Set budgets** - Configure GCP billing alerts

---

## Next Steps

### Immediate (Week 1)
- [x] Fix deployment issues
- [x] Get Cloud Run working
- [ ] Add metrics endpoints
- [ ] Set up basic uptime monitoring

### Short-term (Month 1)
- [ ] Create GCP monitoring dashboard
- [ ] Configure alerting policies
- [ ] Add retry logic for database connections
- [ ] Implement request tracing

### Long-term (Quarter 1)
- [ ] Export logs to BigQuery for analysis
- [ ] Add custom metrics for business logic
- [ ] Implement distributed tracing (OpenTelemetry)
- [ ] Create runbook for common issues

---

## Resources

**GCP Documentation**:
- Cloud Run Troubleshooting: https://cloud.google.com/run/docs/troubleshooting
- Cloud Logging: https://cloud.google.com/logging/docs
- Cloud Monitoring: https://cloud.google.com/monitoring/docs

**Supabase**:
- Connection Pooling: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooling
- Database Pausing: https://supabase.com/docs/guides/platform/going-into-prod

**Internal Docs**:
- [CLAUDE.md](CLAUDE.md) - AI assistant context
- [PRD.md](PRD.md) - Product requirements
- [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md) - Deployment guide

---

**Remember**: Monitoring is not just about knowing when things break - it's about understanding why they break and preventing it next time!
