# Cloud Run Deployment Troubleshooting

## Issue: Cloud Run URL Returns 404

**URL**: https://mcp-hub-6jzkdzuf2a-uc.a.run.app
**Status**: 404 Not Found

---

## Step 1: Check GitHub Actions Status

Visit: **https://github.com/bcali/MCP/actions**

Look for the workflow named **"Deploy-CloudRun"**

### What to Check:
- ✅ **Green checkmark** = Deployment succeeded
- ❌ **Red X** = Deployment failed (click to see error logs)
- 🟡 **Yellow circle** = Currently deploying
- ⚪ **No runs** = Workflow never triggered

**Expected**: The workflow should have been triggered by commit `aa4303c` (production improvements)

---

## Step 2: Verify GitHub Secrets

The workflow requires these secrets to be configured in your repository:

### Required Secrets (Settings → Secrets and variables → Actions):
- `GCP_WIF_PROVIDER` - Workload Identity Federation provider
- `GCP_SERVICE_ACCOUNT` - Service account email
- `GCP_PROJECT_ID` - Your GCP project ID
- `GCP_REGION` - Deployment region (e.g., `us-central1`)
- `CLOUD_RUN_SERVICE` - Service name (e.g., `mcp-hub`)
- `MCP_HUB_API_KEY` - API key for authentication
- `DATABASE_URL` - Supabase PostgreSQL connection string

### Optional Secrets:
- `FIGMA_TOKEN` - Figma integration
- `GAMMA_API_KEY` - Gamma integration
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

**How to Check**:
1. Go to: https://github.com/bcali/MCP/settings/secrets/actions
2. Verify all required secrets are listed (values are hidden)

---

## Step 3: Manual Deployment Trigger

If the workflow didn't run automatically, trigger it manually:

### Via GitHub UI:
1. Visit: https://github.com/bcali/MCP/actions/workflows/mcp-hub-cloudrun.yml
2. Click **"Run workflow"** button
3. Select branch: `main`
4. Click **"Run workflow"**

### Via Command Line (requires `gh` CLI):
```bash
gh workflow run mcp-hub-cloudrun.yml
```

---

## Step 4: Check GCP Console

Visit the Google Cloud Console to verify the service:

1. **Cloud Run Services**: https://console.cloud.google.com/run
2. Find your service (should be named whatever `CLOUD_RUN_SERVICE` secret contains)
3. Check:
   - **Status**: Should be "Ready"
   - **URL**: Copy the actual service URL
   - **Revisions**: Latest revision should be deployed
   - **Logs**: Check for any errors

---

## Step 5: Common Issues & Fixes

### Issue: Workflow Not Triggered
**Cause**: The workflow path filter requires changes in `mcp-hub/**`

**Fix**: Make a small change and push:
```bash
# Add a comment to trigger deployment
echo "# Trigger deployment" >> mcp-hub/README.md
git add mcp-hub/README.md
git commit -m "chore: trigger cloud run deployment"
git push
```

### Issue: Secrets Not Configured
**Cause**: Missing GitHub secrets

**Fix**: Configure secrets in GitHub repository settings:
1. Go to: https://github.com/bcali/MCP/settings/secrets/actions
2. Click "New repository secret"
3. Add each required secret

### Issue: Authentication Failed
**Cause**: GCP Workload Identity Federation not set up

**Fix**: Set up Workload Identity Federation:
```bash
# Run this in Google Cloud Shell
gcloud iam workload-identity-pools create github \
  --location="global" \
  --project="YOUR_PROJECT_ID"

gcloud iam service-accounts create github-actions \
  --project="YOUR_PROJECT_ID"

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"
```

### Issue: Build Fails
**Cause**: TypeScript compilation errors or missing dependencies

**Fix**: Test build locally:
```bash
cd mcp-hub
npm run build
```

If it fails locally, fix errors before deploying.

### Issue: Service URL Changed
**Cause**: Cloud Run generates new URL or service was renamed

**Fix**: Get the actual URL from GCP Console and update:
1. Visit: https://console.cloud.google.com/run
2. Click on your service
3. Copy the URL (e.g., `https://SERVICE-HASH-REGION.a.run.app`)
4. Update `mcp-console/src/app/config.ts` with the real URL

---

## Step 6: Test Deployment

Once deployed, test the endpoints:

```bash
# Health check (no auth required)
curl https://YOUR-CLOUD-RUN-URL/healthz

# Readiness check (no auth required)
curl https://YOUR-CLOUD-RUN-URL/healthz/ready

# Status check (requires API key)
curl -H "x-api-key: YOUR_API_KEY" https://YOUR-CLOUD-RUN-URL/v1/status
```

**Expected responses**:
- `/healthz`: `{"ok":true}`
- `/healthz/ready`: `{"ok":true,"status":"ready","database":"connected","version":"0.1.0"}`
- `/v1/status`: `{"status":"up","version":"0.1.0","uptime":123,"activeConnections":0}`

---

## Step 7: Update Console Configuration

Once you have the correct Cloud Run URL, update the console:

```bash
cd mcp-console

# Edit src/app/config.ts
# Change hubUrl to your actual Cloud Run URL
```

Example:
```typescript
export const config = {
  hubUrl: import.meta.env.VITE_HUB_URL || 'https://mcp-hub-ACTUAL-HASH-uc.a.run.app',
  hubApiKey: import.meta.env.VITE_HUB_API_KEY || 'N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs',
};
```

Then commit and push:
```bash
git add mcp-console/src/app/config.ts
git commit -m "fix: update console with correct Cloud Run URL"
git push
```

---

## Alternative: Deploy Without Secrets (Container Registry)

If Workload Identity Federation is too complex, use container-based deployment:

1. **Build and push to GHCR**:
   ```bash
   # Already automated via .github/workflows/mcp-hub-container.yml
   # Pushes to: ghcr.io/bcali/mcp/mcp-hub:latest
   ```

2. **Deploy from container**:
   ```bash
   gcloud run deploy mcp-hub \
     --image ghcr.io/bcali/mcp/mcp-hub:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --min-instances 0 \
     --max-instances 3 \
     --set-env-vars MCP_HUB_API_KEY=YOUR_KEY,DATABASE_URL=YOUR_DB_URL
   ```

---

## Quick Win: Use Local Setup

While troubleshooting Cloud Run, use the local setup:

**Terminal 1** (MCP Hub):
```bash
cd mcp-hub
npm run dev
```

**Terminal 2** (Console):
```bash
cd mcp-console
npm run dev
```

**Browser**: Open `http://localhost:5173` (or whatever Vite shows)

This will work immediately without any Cloud Run complexity!

---

## Next Steps

1. ✅ Check GitHub Actions: https://github.com/bcali/MCP/actions
2. ✅ Verify secrets: https://github.com/bcali/MCP/settings/secrets/actions
3. ✅ Check GCP Console: https://console.cloud.google.com/run
4. ✅ Get actual service URL
5. ✅ Update console config
6. ✅ Test endpoints

**Need Help?** Share the GitHub Actions error logs or GCP Cloud Run logs for debugging.
