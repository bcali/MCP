# Security Audit Report - MCP Repository

**Date:** 2026-01-25
**Audited By:** Claude Sonnet 4.5
**Severity:** 🔴 **CRITICAL**

---

## 🚨 CRITICAL SECURITY ISSUES FOUND

### 1. **Exposed API Keys in Public Repository**

#### Issue #1: Hardcoded Cloud API Key in `mcp-console/src/app/config.ts`

**Severity:** 🔴 CRITICAL
**File:** [mcp-console/src/app/config.ts](https://github.com/bcali/MCP/blob/main/mcp-console/src/app/config.ts)

```typescript
export const config = {
  hubUrl: import.meta.env.VITE_HUB_URL || 'https://mcp-hub-6jzkdzuf2a-uc.a.run.app',
  hubApiKey: import.meta.env.VITE_HUB_API_KEY || 'Iwant@newpass007',  // ❌ EXPOSED
};
```

**Risk:**
- ✅ This API key grants access to your production MCP Hub server
- ✅ Anyone can use this key to access your cloud-hosted MCP Hub
- ✅ Potential for data exfiltration, unauthorized tool usage, abuse

**Exposed Since:** First commit in repository
**Public URL:** https://github.com/bcali/MCP/blob/main/mcp-console/src/app/config.ts

---

#### Issue #2: Exposed Local API Key in `.claude/mcp-servers.json`

**Severity:** 🟠 HIGH
**File:** [.claude/mcp-servers.json](https://github.com/bcali/MCP/blob/main/.claude/mcp-servers.json)

```json
{
  "mcpServers": {
    "hub-local": {
      "url": "http://localhost:8080/v1/sse",
      "headers": {
        "x-api-key": "N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs"  // ❌ EXPOSED
      }
    }
  }
}
```

**Risk:**
- Anyone with this key can access your local MCP Hub if they can reach your network
- Lower severity since it's localhost, but still should be rotated

**Public URL:** https://github.com/bcali/MCP/blob/main/.claude/mcp-servers.json

---

#### Issue #3: Example Files with Placeholder Credentials

**Severity:** 🟢 LOW (But needs review)
**Files:**
- `.env.example` files contain placeholder values (OK)
- Documentation shows example API keys

**Risk:** Minimal, but ensure no real keys are in examples

---

## ✅ POSITIVE FINDINGS

### Good Security Practices Found:

1. ✅ **`.gitignore` properly configured**
   - `.env` files are excluded
   - Local environment files won't be committed

2. ✅ **AI-Shop-Bot repository** uses environment variables correctly
   - GitHub Secrets for sensitive data
   - No hardcoded credentials

3. ✅ **Other repositories** (hotel-intake-form, pinseeking, tiktok-content-analysis)
   - No exposed credentials found
   - Proper documentation without secrets

4. ✅ **`.env` files not in git history**
   - Local `.env` files were never committed

---

## 🛠️ IMMEDIATE REMEDIATION REQUIRED

### Priority 1: Rotate Exposed API Keys (DO THIS NOW)

#### Step 1: Change Cloud MCP Hub API Key

1. **Generate new API key:**
   ```bash
   # Generate a secure random key
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. **Update your Cloud Run service:**
   - Go to Google Cloud Console
   - Update `MCP_HUB_API_KEY` environment variable
   - Redeploy the service

3. **Update local config:**
   ```bash
   # Update mcp-console/.env
   VITE_HUB_API_KEY=your-new-key-here
   ```

#### Step 2: Change Local MCP Hub API Key

1. **Generate new local key:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. **Update all config files:**
   - `mcp-hub/.env`
   - `mcp-console/.env`
   - `.claude/mcp-servers.json`

### Priority 2: Remove Hardcoded Secrets from Code

#### Fix `mcp-console/src/app/config.ts`

**Current (INSECURE):**
```typescript
export const config = {
  hubUrl: import.meta.env.VITE_HUB_URL || 'https://mcp-hub-6jzkdzuf2a-uc.a.run.app',
  hubApiKey: import.meta.env.VITE_HUB_API_KEY || 'Iwant@newpass007',  // ❌
};
```

**Fixed (SECURE):**
```typescript
export const config = {
  hubUrl: import.meta.env.VITE_HUB_URL || 'http://localhost:8080',
  hubApiKey: import.meta.env.VITE_HUB_API_KEY,  // ✅ No fallback
};

// Throw error if API key is missing
if (!config.hubApiKey) {
  throw new Error('VITE_HUB_API_KEY is required. Set it in .env file.');
}
```

#### Fix `.claude/mcp-servers.json`

**Option 1:** Don't commit this file
```bash
# Add to .gitignore
echo ".claude/mcp-servers.json" >> .gitignore
git rm --cached .claude/mcp-servers.json
```

**Option 2:** Use example file
```bash
# Create mcp-servers.json.example instead
cp .claude/mcp-servers.json .claude/mcp-servers.json.example
# Replace real key with placeholder
# Add mcp-servers.json to .gitignore
```

### Priority 3: Implement Secret Scanning

Add GitHub Secret Scanning:

1. **Enable GitHub Advanced Security** (if available)

2. **Add `.gitleaks.toml`** to repository:
```toml
[allowlist]
  description = "Allowlist"
  paths = [
    '''\.env\.example$''',
  ]
```

3. **Add pre-commit hook:**
```bash
# Install git-secrets
git secrets --install
git secrets --register-aws
git secrets --add 'api[_-]?key.*[:=].*["\'][a-zA-Z0-9+/=]{20,}'
```

---

## 📋 SECURITY CHECKLIST

### Immediate Actions (Today):
- [ ] Rotate cloud MCP Hub API key
- [ ] Rotate local MCP Hub API key
- [ ] Remove hardcoded fallback keys from config.ts
- [ ] Update .gitignore to exclude .claude/mcp-servers.json
- [ ] Git rm --cached sensitive files
- [ ] Push security fixes to GitHub

### Short-term Actions (This Week):
- [ ] Implement secret scanning in CI/CD
- [ ] Add pre-commit hooks for secret detection
- [ ] Review all documentation for example keys
- [ ] Enable GitHub Dependabot alerts
- [ ] Set up automated security scanning

### Long-term Actions (This Month):
- [ ] Implement proper secrets management (HashiCorp Vault, AWS Secrets Manager)
- [ ] Set up key rotation schedule
- [ ] Document security best practices
- [ ] Add security section to CONTRIBUTING.md
- [ ] Regular security audits

---

## 🔒 SECURITY BEST PRACTICES GOING FORWARD

### 1. Never Commit Secrets

**DO:**
- ✅ Use environment variables
- ✅ Use `.env.example` with placeholders
- ✅ Use GitHub Secrets for CI/CD
- ✅ Use secret management services

**DON'T:**
- ❌ Hardcode API keys in source code
- ❌ Commit `.env` files
- ❌ Put real credentials in documentation
- ❌ Use weak or predictable keys

### 2. Use Strong, Random Keys

```bash
# Good key generation
openssl rand -base64 32

# Or with Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Implement Defense in Depth

- API key rotation every 90 days
- Rate limiting on API endpoints
- IP whitelisting where possible
- Audit logging for all API calls
- Monitor for unusual activity

### 4. Secret Scanning Tools

- **git-secrets**: Prevent commits with secrets
- **truffleHog**: Find secrets in git history
- **GitLeaks**: Scan for hardcoded secrets
- **GitHub Secret Scanning**: Automatic detection

---

## 📊 RISK ASSESSMENT

| Issue | Severity | Likelihood | Impact | Risk Score |
|-------|----------|------------|---------|------------|
| Cloud API Key Exposed | Critical | High | High | 🔴 9/10 |
| Local API Key Exposed | High | Medium | Medium | 🟠 6/10 |
| Config Fallback Values | Medium | Low | Medium | 🟡 4/10 |

**Overall Risk Level:** 🔴 **CRITICAL** - Immediate action required

---

## 🆘 INCIDENT RESPONSE

If you suspect the exposed keys have been compromised:

1. **Immediately rotate all API keys**
2. **Review access logs** for unauthorized usage
3. **Check for:**
   - Unusual API calls
   - Unexpected data modifications
   - Suspicious tool executions
4. **Monitor for 30 days** after rotation
5. **Document the incident** for future reference

---

## 📞 SUPPORT

For questions about this security audit:
- Review: [SECURITY.md](./SECURITY.md)
- Contact: brianc.uw@gmail.com
- GitHub Security Advisories: Enable for private reporting

---

## ✅ VERIFICATION

After implementing fixes, verify:

```bash
# 1. Check no secrets in code
git grep -i "api.*key.*[:=].*['\"][a-zA-Z0-9]"

# 2. Verify .env is ignored
git check-ignore mcp-hub/.env mcp-console/.env

# 3. Test with new keys
curl "http://localhost:8080/v1/status?key=NEW_KEY_HERE"
```

---

**Report Generated:** 2026-01-25
**Next Review:** 2026-02-25
**Status:** ⚠️ AWAITING REMEDIATION
