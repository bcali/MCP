# Security Policy

## Supported Versions

The MCP project currently supports security updates for the following versions:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 1.1.x   | :white_check_mark: | Current (Production) |
| 1.0.x   | :white_check_mark: | Supported |
| < 1.0   | :x:                | Not supported |

---

## Reporting a Vulnerability

We take the security of the MCP project seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT Disclose Publicly

Please do not open a public GitHub issue for security vulnerabilities. This could put existing users at risk.

### 2. Report Privately

**Preferred Method**: Use GitHub's Security Advisory feature:
1. Go to https://github.com/bcali/MCP/security/advisories
2. Click "New draft security advisory"
3. Provide details of the vulnerability

**Alternative Method**: Email the maintainer
- Include "SECURITY" in the subject line
- Open an issue asking for contact email if not available

### 3. Include Details

Your report should include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
- Your contact information

### 4. Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity (see below)

### Severity Levels

| Severity | Response Time | Fix Timeline |
|----------|---------------|--------------|
| **Critical** | 24 hours | 1-3 days |
| **High** | 48 hours | 3-7 days |
| **Medium** | 7 days | 7-14 days |
| **Low** | 14 days | 14-30 days |

---

## Security Best Practices

### API Key Management

**DO**:
- Store API keys in environment variables (never in code)
- Use different API keys for development and production
- Rotate API keys regularly (every 90 days recommended)
- Use GitHub Secrets for CI/CD API keys
- Use Cloud Run environment variables for production keys

**DON'T**:
- Commit API keys to Git
- Share API keys in chat/email
- Use the same API key across multiple environments
- Log API keys (even debug logs)

**Example .env File** (never commit this):
```bash
# MCP Hub API Key (never commit this file)
MCP_HUB_API_KEY=your-secret-api-key-here

# External service keys
GAMMA_API_KEY=your-gamma-key
FIGMA_ACCESS_TOKEN=your-figma-token
GITHUB_TOKEN=your-github-token
```

**GitHub Secrets Setup**:
1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret individually:
   - `MCP_HUB_API_KEY`
   - `DATABASE_URL`
   - `GAMMA_API_KEY` (optional)
   - `FIGMA_ACCESS_TOKEN` (optional)
   - `GITHUB_TOKEN` (optional)

### Database Security

**Connection Security**:
- Always use TLS/SSL for database connections
- Use connection pooling to prevent connection exhaustion
- Set connection timeouts to prevent hung connections
- Use prepared statements to prevent SQL injection

**Supabase Configuration**:
```typescript
// Good: TLS enabled by default
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }, // Enforce TLS
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

**Access Control**:
- Use database user with minimum required privileges
- Never use superuser/admin accounts for application access
- Enable row-level security (RLS) if needed
- Regular security audits of database access

**Data Encryption**:
- Supabase encrypts data at rest (AES-256)
- All connections use TLS 1.2+
- Sensitive fields can be encrypted at application level if needed

### Network Security

**Cloud Run Security**:
```yaml
# Enforce HTTPS only
Service Configuration:
  - HTTPS only (no HTTP)
  - Automatic SSL certificate management
  - TLS 1.2+ minimum
  - Cloud Run IAM for deployment access
```

**CORS Configuration**:
```typescript
// Only allow specific origins
const corsOptions = {
  origin: [
    'https://bcali.github.io',  // MCP Console
    'http://localhost:5173',    // Local dev
  ],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
};
```

**API Authentication**:
```typescript
// Validate API key on every request
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.query.key || req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.MCP_HUB_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// Apply to protected routes
app.get('/v1/sse', requireAuth, handleSSE);
app.post('/mcp', requireAuth, handleMCP);
```

### Rate Limiting

**Current Status**: Not implemented (planned for v1.2.0)

**Planned Implementation**:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: 'Too many requests from this IP',
});

app.use('/v1/', limiter);
```

**Recommended Limits**:
- General API: 100 requests/15 minutes per IP
- Tool execution: 50 requests/15 minutes per API key
- SSE connections: 5 concurrent per API key

### Data Privacy

**Data Collection**:
- Minimal data collection (only what's needed for functionality)
- No tracking or analytics by default
- User-provided data stored in PostgreSQL only

**Data Retention**:
- Memory items: Retained until explicitly deleted
- Artifacts: Retained until explicitly deleted
- Runs: Consider retention policy (e.g., 90 days)
- Logs: GCP Cloud Logging retention (30 days default)

**Data Deletion**:
```sql
-- Example: Delete old runs (admin only)
DELETE FROM runs
WHERE created_at < NOW() - INTERVAL '90 days';

-- Example: Delete specific user data
DELETE FROM memory WHERE id = 'user-memory-id';
DELETE FROM artifacts WHERE id = 'user-artifact-id';
```

**GDPR Compliance** (if applicable):
- Right to access: Export user data via API
- Right to deletion: Delete all user data on request
- Data portability: JSON export of all user data

### Third-Party Integration Security

**API Key Storage**:
```bash
# Connector API keys in environment variables
GAMMA_API_KEY=...
FIGMA_ACCESS_TOKEN=...
GITHUB_TOKEN=...
SLACK_BOT_TOKEN=...
CONFLUENCE_API_TOKEN=...
```

**OAuth Tokens** (future):
- Store encrypted in database
- Implement token refresh logic
- Revoke tokens on user logout
- Use separate table with encryption

**Circuit Breaker Pattern** (prevents abuse):
```typescript
// Automatically stops calling failing services
const breaker = resilienceRegistry.getBreaker('figma');

if (breaker.isOpen()) {
  throw new McpError(
    ErrorCode.InternalError,
    'Figma connector temporarily unavailable'
  );
}
```

---

## Security Features

### 1. Authentication

**API Key-Based Authentication**:
- Single shared API key for all clients
- Key required for all MCP endpoints
- Health checks (`/healthz`) are unauthenticated

**Future Enhancements** (planned):
- Per-user API keys
- OAuth 2.0 support
- JWT tokens

### 2. Idempotent Operations

**Event ID System**:
```typescript
// Prevents duplicate writes from external events
const eventId = generateEventId('gamma', webhookId);

// Database constraint prevents duplicates
INSERT INTO artifacts (..., event_id)
VALUES (..., eventId)
ON CONFLICT (event_id) DO NOTHING;
```

### 3. Resilience Patterns

**Circuit Breaker**:
- Prevents cascading failures
- Automatic recovery after timeout
- Per-connector isolation

**Bulkhead**:
- Limits concurrent requests per connector
- Prevents resource exhaustion
- Queue overflow protection

**Timeout**:
- 15-second default timeout per tool
- Prevents hung requests
- Configurable per environment

### 4. Input Validation

**Zod Schema Validation**:
```typescript
import { z } from 'zod';

const MemoryPutSchema = z.object({
  key: z.string().min(1).max(255),
  value: z.string().max(10000),
  tags: z.array(z.string()).max(20).optional(),
});

// Throws error if validation fails
const input = MemoryPutSchema.parse(request.params.arguments);
```

### 5. Secure Logging

**Production Logging**:
```typescript
// Never log sensitive data
logger.info('User authenticated', {
  userId: user.id,  // OK
  // Never log: apiKey, password, tokens
});

// Sanitize error messages
logger.error('External API failed', {
  service: 'figma',
  error: err.message, // Generic message only
  // Never log: API keys, request bodies
});
```

---

## Deployment Security

### Google Cloud Run

**IAM Permissions**:
- Use Workload Identity Federation (no service account keys)
- Minimum permissions for deployment service account:
  - `roles/run.admin` (Cloud Run)
  - `roles/artifactregistry.writer` (Container images)
  - `roles/iam.serviceAccountUser` (Deployment)

**Service Configuration**:
```yaml
# Security settings
Service:
  ingress: all           # Or 'internal' for internal-only
  cpu-throttling: true   # Reduce attack surface when idle
  execution-environment: gen2  # Latest security features
```

**Environment Variables**:
- Set via Cloud Run console or GitHub Actions
- Never commit to Git
- Rotate regularly

### Supabase

**Database Security**:
- Connection via TLS only
- Connection pooling to prevent DoS
- Regular automated backups (Pro tier)

**Access Control**:
```sql
-- Create limited-privilege user (recommended)
CREATE USER mcp_hub WITH PASSWORD 'secure-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mcp_hub;
```

**Monitoring**:
- Enable Supabase database logs
- Monitor connection counts
- Alert on unusual query patterns

### GitHub Actions

**Secrets Management**:
- Use GitHub Secrets for all sensitive data
- Never echo secrets in workflow logs
- Use environment protection rules for production

**Workflow Security**:
```yaml
# Limit workflow permissions
permissions:
  contents: read
  id-token: write  # For Workload Identity Federation

# Use specific versions (not 'latest')
- uses: actions/checkout@v4
- uses: google-github-actions/auth@v2
```

---

## Security Checklist

### Before Deployment

- [ ] All API keys stored in environment variables
- [ ] No secrets committed to Git
- [ ] HTTPS enforced (Cloud Run)
- [ ] Database uses TLS
- [ ] CORS configured correctly
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive data
- [ ] Logging doesn't include secrets
- [ ] Rate limiting configured (if applicable)

### Regular Maintenance

- [ ] Review access logs monthly
- [ ] Rotate API keys quarterly
- [ ] Update dependencies monthly (security patches)
- [ ] Review and delete old data (90-day retention)
- [ ] Monitor error rates and unusual patterns
- [ ] Review Cloud Run metrics for anomalies
- [ ] Audit database access patterns

### Incident Response

If a security incident occurs:

1. **Immediate Actions**:
   - Rotate compromised API keys immediately
   - Review access logs for unauthorized access
   - Disable affected connectors if necessary

2. **Investigation**:
   - Determine scope of compromise
   - Identify affected data/users
   - Document timeline of events

3. **Remediation**:
   - Apply security patches
   - Update documentation
   - Notify affected users (if applicable)

4. **Post-Incident**:
   - Conduct retrospective
   - Update security procedures
   - Share learnings (if appropriate)

---

## Security Updates

Security updates are released as needed:

- **Critical**: Immediate hotfix release
- **High**: Patch release within 1 week
- **Medium/Low**: Included in next minor release

**Notification Channels**:
- GitHub Security Advisories
- Release notes
- Discussions (for major security updates)

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)

---

## Contact

For security concerns, please use GitHub Security Advisories or contact via GitHub issues (mark as security-related).

**Response Time**: Within 48 hours for all security reports.

---

**Last Updated**: 2026-01-25
**Version**: 1.1.0
