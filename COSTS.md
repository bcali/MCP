# MCP Platform Costs & Tracking

**Last Updated**: 2026-01-25

This document tracks monthly costs, platform dependencies, optimization strategies, and cost management for the MCP infrastructure.

---

## 📊 Monthly Cost Summary

| Month | GCP Cloud Run | Supabase | Cloudflare R2 | GitHub | Total | Notes |
|-------|---------------|----------|---------------|--------|-------|-------|
| **Jan 2026** | $2.50 | $0 | $0 | $0 | **$2.50** | Light development usage |
| **Feb 2026** | - | - | - | - | - | (Update monthly) |
| **Mar 2026** | - | - | - | - | - | (Update monthly) |

**Current Monthly Estimate**: $1-5/month
**Budget Alert Threshold**: $10/month
**Status**: ✅ Well within budget

---

## 🏗️ Platform Breakdown

### 1. Google Cloud Platform (GCP)

#### Services Used
- **Cloud Run** - Serverless container hosting for MCP Hub
- **Workload Identity Federation** - GitHub Actions authentication
- **Artifact Registry** - Container image storage

#### Current Configuration
```yaml
Service: mcp-hub
Region: us-central1 (or your configured region)
Configuration:
  Min instances: 0 (scale-to-zero)
  Max instances: 3
  CPU: 1 vCPU per instance
  Memory: 512Mi RAM
  Timeout: 300 seconds (5 minutes)
  Concurrency: 80 requests per instance
```

#### Pricing Model
- **CPU**: $0.00002400 per vCPU-second
- **Memory**: $0.00000250 per GB-second
- **Requests**: $0.40 per million requests
- **Free Tier** (per month):
  - 2 million requests
  - 360,000 vCPU-seconds
  - 180,000 GB-seconds

#### Cost Scenarios
| Usage Pattern | Hours/Day | Est. Monthly Cost | Use Case |
|--------------|-----------|-------------------|----------|
| **Light** | 1-2 hours | $1-2 | Occasional testing |
| **Moderate** | 3-5 hours | $3-5 | Regular development |
| **Heavy** | 8+ hours | $10-15 | Active production |
| **24/7** | 24 hours | $40-60 | Not recommended with scale-to-zero |

#### Cost Tracking
**GCP Console**: https://console.cloud.google.com/billing

**Commands**:
```bash
# View current month billing
gcloud billing accounts list
gcloud billing budgets list --billing-account=YOUR_BILLING_ACCOUNT

# View Cloud Run service details
gcloud run services describe mcp-hub --region=YOUR_REGION
```

**Budget Alerts** (Already Set):
- ✅ 50% threshold ($5)
- ✅ 90% threshold ($9)
- ✅ 100% threshold ($10)

---

### 2. Supabase (PostgreSQL Database)

#### Services Used
- **PostgreSQL Database** - Persistent state storage
- **Connection Pooling** - Efficient database access
- **Automatic Backups** (Pro tier only)

#### Current Configuration
```yaml
Plan: Free Tier
Database Size: <500MB
Connection Pool:
  Max connections: 10
  Min connections: 0
  Idle timeout: 30s
  Connection timeout: 5s
```

#### Free Tier Limits
- 500MB database storage
- 1GB file storage
- 2GB bandwidth/month
- Unlimited API requests
- 7-day log retention

#### Pro Tier ($25/month)
Upgrade triggers:
- Database size >500MB
- Need daily backups
- Need point-in-time recovery
- Need >2GB bandwidth
- Need custom domains

#### Current Usage
| Metric | Current | Limit | Percentage |
|--------|---------|-------|------------|
| Database Size | ~50MB | 500MB | 10% |
| Bandwidth | <1GB | 2GB | <50% |
| Connections | Variable | Unlimited | N/A |

**Status**: ✅ Free tier sufficient for development

#### Cost Tracking
**Dashboard**: https://app.supabase.com → Settings → Usage

**Query Database Size**:
```sql
-- Check total database size
SELECT pg_size_pretty(pg_database_size('postgres')) as db_size;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check row counts
SELECT
  schemaname,
  tablename,
  n_tup_ins as rows_inserted,
  n_tup_upd as rows_updated,
  n_tup_del as rows_deleted
FROM pg_stat_user_tables
ORDER BY n_tup_ins DESC;
```

---

### 3. Cloudflare R2 (Object Storage)

#### Services Used
- **R2 Storage** - S3-compatible object storage for large artifacts

#### Status
**Current**: ❌ Not configured (optional)
**Cost**: $0/month

#### When to Enable
- Storing artifacts >10MB (presentations, videos, large images)
- Need S3-compatible storage
- Want to reduce database load

#### Pricing
- **Storage**: $0.015/GB-month
- **Class A Operations** (writes): $4.50/million
- **Class B Operations** (reads): $0.36/million
- **Egress**: $0 (no egress fees)

#### Example Costs
| Scenario | Storage | Operations | Monthly Cost |
|----------|---------|-----------|--------------|
| **100 artifacts @ 5MB** | 0.5GB | 100 writes, 1000 reads | ~$0.01 |
| **1000 artifacts @ 10MB** | 10GB | 1000 writes, 10K reads | ~$0.16 |
| **Large usage** | 100GB | 10K writes, 100K reads | ~$1.54 |

**Recommendation**: Enable only if needed for large artifacts.

---

### 4. GitHub (CI/CD and Hosting)

#### Services Used
- **GitHub Pages** - Static hosting for MCP Console
- **GitHub Actions** - CI/CD workflows
- **Git LFS** - Large file storage (if needed)

#### Cost
**Current**: $0/month (public repository)

#### Free Tier (Public Repos)
- Unlimited GitHub Pages bandwidth
- Unlimited Actions minutes
- 2GB storage
- 1GB Git LFS bandwidth

#### Monitoring
**Usage Dashboard**: https://github.com/settings/billing

**GitHub Actions Minutes**: Check after each workflow run
- Typical MCP Hub deploy: ~3-5 minutes
- Typical Console deploy: ~2-3 minutes
- Estimated monthly usage: 50-100 minutes

**Status**: ✅ Free tier sufficient

---

## 💰 Cost Optimization Strategies

### 1. Cloud Run Optimization

#### Current Optimizations ✅
- ✅ Scale-to-zero configuration (min instances: 0)
- ✅ CPU throttling enabled (reduce idle cost)
- ✅ Startup CPU boost (faster cold starts)
- ✅ Efficient connection pooling (min connections: 0)
- ✅ Session affinity (reduce connection overhead)

#### Additional Strategies
- **Use In-Memory Mode Locally**: Set `DATABASE_URL=memory` for local development
- **Batch Requests**: Group API calls when possible
- **Cache Static Data**: Reduce database queries for static content
- **Monitor Cold Starts**: If >5 seconds, consider min instances: 1 (adds ~$10-20/month)

### 2. Database Optimization

#### Current Optimizations ✅
- ✅ Connection pooling (efficient connection usage)
- ✅ Idle connection timeout (30s)
- ✅ Minimal connection pool (min: 0)

#### Additional Strategies
- **Regular Cleanup**: Archive old runs/artifacts
- **Optimize Queries**: Add indexes for frequent queries
- **Monitor Table Sizes**: Track growth of memory, artifacts, runs tables
- **Data Retention Policy**: Delete data >90 days (if appropriate)

**Cleanup Script Example**:
```sql
-- Delete runs older than 90 days
DELETE FROM runs WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete orphaned artifacts
DELETE FROM artifacts
WHERE id NOT IN (SELECT artifact_id FROM run_steps WHERE artifact_id IS NOT NULL);
```

### 3. Monitoring & Alerts

#### Current Alerts ✅
- ✅ GCP Budget: $10/month with 50%, 90%, 100% thresholds
- ✅ Supabase Usage: Email alerts at 80% of free tier

#### Recommended Additional Alerts
- [ ] Cloud Run Request Count: Alert if >1M requests/month
- [ ] Database Size: Alert at 400MB (80% of free tier)
- [ ] Error Rate: Alert if error rate >5%
- [ ] Response Time: Alert if p95 latency >2 seconds

---

## 📅 Monthly Review Checklist

Use this checklist on the **1st of each month**:

### GCP Review
- [ ] Check Cloud Run billing in [GCP Console](https://console.cloud.google.com/billing)
- [ ] Review request count and instance hours
- [ ] Check for any unexpected spikes
- [ ] Verify budget alerts are working
- [ ] Update cost tracking table above

### Supabase Review
- [ ] Check database size in [Supabase Dashboard](https://app.supabase.com)
- [ ] Review bandwidth usage
- [ ] Check API request count
- [ ] Run database size query (see SQL above)
- [ ] Archive or delete old data if needed

### GitHub Review
- [ ] Check Actions minutes used
- [ ] Review Pages bandwidth
- [ ] Verify workflow efficiency

### Documentation
- [ ] Update monthly cost table in this document
- [ ] Note any anomalies or spikes
- [ ] Update optimization strategies if new patterns emerge
- [ ] Review and update budget if needed

---

## 🚨 Cost Alert Scenarios

### Scenario 1: GCP Bill >$10/month
**Likely Causes**:
- Increased request volume
- Cold start overhead (consider min instances: 1)
- Memory/CPU configuration too high

**Actions**:
1. Check Cloud Run metrics for request patterns
2. Review logs for errors causing retries
3. Consider optimizing application code
4. Evaluate if scale-to-zero is appropriate

### Scenario 2: Database >400MB
**Likely Causes**:
- Runs table growing too large
- Artifacts stored in database instead of R2
- No data retention policy

**Actions**:
1. Run table size query (see SQL above)
2. Implement data cleanup script
3. Consider enabling R2 for large artifacts
4. Set up automated archival

### Scenario 3: Unexpected Traffic Spike
**Likely Causes**:
- Misconfigured client retrying excessively
- Webhook loop
- DDoS or abuse

**Actions**:
1. Review Cloud Run logs
2. Check for error patterns
3. Implement rate limiting
4. Add request authentication

---

## 📈 Cost Projections

### Development Phase (Current)
- **Usage**: 1-5 hours/day
- **Expected Cost**: $1-5/month
- **Status**: ✅ On track

### Production Phase (Future)
- **Usage**: 8-24 hours/day
- **Expected Cost**: $10-30/month
- **Recommendation**: Consider upgrading to min instances: 1

### High Traffic (Not Planned)
- **Usage**: 24/7 with high request volume
- **Expected Cost**: $40-100/month
- **Recommendation**: Re-evaluate architecture

---

## 🔗 Quick Links

- [GCP Billing Console](https://console.cloud.google.com/billing)
- [GCP Cloud Run Dashboard](https://console.cloud.google.com/run)
- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Usage](https://app.supabase.com/project/_/settings/usage)
- [GitHub Billing](https://github.com/settings/billing)
- [Cloud Run Pricing Calculator](https://cloud.google.com/products/calculator)

---

## 📝 Notes

### Cost Tracking Best Practices
1. **Review monthly** - Set calendar reminder for 1st of month
2. **Document anomalies** - Note spikes with explanations
3. **Track trends** - Look for patterns over 3-6 months
4. **Optimize proactively** - Don't wait for budget alerts
5. **Update forecasts** - Adjust projections based on actual usage

### Future Considerations
- **Multi-user deployment**: Costs scale linearly with users
- **Data retention**: Consider archival strategy for old data
- **Caching**: Redis/Memcached could reduce database load
- **CDN**: For Console static assets if traffic increases

---

**Last Review Date**: 2026-01-25
**Next Review Due**: 2026-02-01
**Reviewed By**: Brian C
**Status**: ✅ All systems nominal, costs within budget
