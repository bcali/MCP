# MCP Console Deployment Guide

**Version**: 1.0.0
**Last Updated**: 2026-01-25

This guide covers deploying the MCP Console to GitHub Pages (automated), manual deployment, and local development.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Automated Deployment (GitHub Pages)](#automated-deployment-github-pages)
3. [Manual Deployment](#manual-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Custom Domain Setup](#custom-domain-setup)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

The MCP Console is automatically deployed to GitHub Pages on every push to `main` that modifies files in the `mcp-console/` directory.

**Live URL**: https://bcali.github.io/mcp-console/ *(adjust for your username)*

**Prerequisites**:
- GitHub Pages enabled in repository settings
- GitHub Actions enabled
- Workflow file: `.github/workflows/deploy-console.yml`

---

## Automated Deployment (GitHub Pages)

### How It Works

The deployment workflow is triggered automatically when:
1. Code is pushed to the `main` branch
2. Files in `mcp-console/**` are modified
3. The workflow file `.github/workflows/deploy-console.yml` is changed

### Workflow Steps

```yaml
1. Checkout code
2. Set up Node.js 20
3. Install dependencies (npm ci)
4. Build production bundle (npm run build)
5. Configure GitHub Pages
6. Upload build artifacts
7. Deploy to GitHub Pages
```

### Monitoring Deployments

**View Workflow Status**:
1. Go to https://github.com/bcali/MCP/actions
2. Look for "Deploy Console to GitHub Pages"
3. Click on the latest run to view logs

**Deployment Artifacts**:
- Build output: `mcp-console/dist/`
- Build time: ~2-3 minutes
- Hosted files: Static HTML, CSS, JS

---

## Manual Deployment

### Prerequisites

```bash
# Install Node.js 20+
node --version  # Should be v20.x or higher

# Navigate to console directory
cd mcp-console

# Install dependencies
npm install
```

### Build for Production

```bash
# Create optimized production build
npm run build

# Output directory: ./dist/
```

### Build Output

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other hashed assets]
└── favicon.ico
```

### Deploy to Other Platforms

#### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

**Netlify Configuration** (`netlify.toml`):
```toml
[build]
  base = "mcp-console/"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Build and deploy
npm run build
vercel --prod
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### AWS S3 + CloudFront

```bash
# Build
npm run build

# Sync to S3
aws s3 sync dist/ s3://your-bucket-name/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

#### Static File Server

```bash
# Build
npm run build

# Serve with any static file server
cd dist
python -m http.server 8080
# or
npx serve -s
```

---

## Environment Configuration

### Build-time Environment Variables

The console uses Vite for building. Environment variables are embedded at **build time**.

**Required Variables**:
- `VITE_MCP_HUB_URL` - MCP Hub API base URL
- `VITE_MCP_HUB_API_KEY` - API key for Hub REST API

### Configuration Methods

#### 1. `.env` File (Local Development)

Create `mcp-console/.env`:
```bash
VITE_MCP_HUB_URL=http://localhost:8080
VITE_MCP_HUB_API_KEY=your-local-api-key
```

#### 2. `.env.production` File (Production Build)

Create `mcp-console/.env.production`:
```bash
VITE_MCP_HUB_URL=https://mcp-hub-example.run.app
VITE_MCP_HUB_API_KEY=your-production-api-key
```

#### 3. CI/CD Environment Variables

**GitHub Actions** (already configured):
```yaml
- name: Build
  run: cd mcp-console && npm run build
  env:
    VITE_MCP_HUB_URL: ${{ secrets.VITE_MCP_HUB_URL }}
    VITE_MCP_HUB_API_KEY: ${{ secrets.VITE_MCP_HUB_API_KEY }}
```

**Set GitHub Secrets**:
1. Go to Repository Settings → Secrets and variables → Actions
2. Add secrets:
   - `VITE_MCP_HUB_URL`
   - `VITE_MCP_HUB_API_KEY`

#### 4. Runtime Configuration

For advanced use cases, you can inject config at runtime using a `config.js` file:

**public/config.js**:
```javascript
window.APP_CONFIG = {
  MCP_HUB_URL: 'https://mcp-hub-example.run.app',
  MCP_HUB_API_KEY: 'key-from-backend'
};
```

**index.html**:
```html
<script src="/config.js"></script>
```

---

## Custom Domain Setup

### GitHub Pages Custom Domain

1. **Purchase Domain** (e.g., Namecheap, Google Domains)

2. **Configure DNS** (in your domain registrar):

For subdomain (e.g., `console.yourdomain.com`):
```
Type: CNAME
Name: console
Value: bcali.github.io
```

For apex domain (e.g., `yourdomain.com`):
```
Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

3. **Configure in GitHub**:
   - Go to Repository Settings → Pages
   - Under "Custom domain", enter your domain
   - Click "Save"
   - Wait for DNS check (may take 24-48 hours)

4. **Enable HTTPS**:
   - Check "Enforce HTTPS" in Pages settings
   - GitHub will provision a Let's Encrypt certificate

### Custom Domain with Other Platforms

See platform-specific documentation:
- **Netlify**: https://docs.netlify.com/domains-https/custom-domains/
- **Vercel**: https://vercel.com/docs/custom-domains
- **AWS**: Use Route 53 or your DNS provider

---

## Troubleshooting

### Build Failures

**Error**: `Module not found: Error: Can't resolve 'X'`
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Error**: `ENOENT: no such file or directory, open 'dist/index.html'`
```bash
# Ensure build completed successfully
npm run build
ls -la dist/  # Verify dist/ directory exists
```

### CORS Issues

**Symptom**: Console can't connect to MCP Hub, browser shows CORS error

**Solution 1**: Ensure Hub has CORS enabled for your domain

Check `mcp-hub/src/index.ts`:
```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://bcali.github.io',
    'https://your-custom-domain.com'
  ],
  credentials: true
}));
```

**Solution 2**: Proxy API requests through the same domain

Update `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://mcp-hub-example.run.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
```

### API Connection Failures

**Symptom**: Console loads but shows "Failed to fetch status"

**Checklist**:
1. ✅ Verify `VITE_MCP_HUB_URL` is correct
2. ✅ Verify `VITE_MCP_HUB_API_KEY` is valid
3. ✅ Check Hub is running: `curl https://your-hub-url/healthz`
4. ✅ Check browser console for detailed errors
5. ✅ Verify CORS headers (see above)

**Debug Build**:
```bash
# Build and check embedded config
npm run build
grep -r "MCP_HUB_URL" dist/assets/*.js
```

### GitHub Pages Deployment Fails

**Error**: `Error: Process completed with exit code 1`

**Solution**: Check workflow logs
1. Go to Actions tab
2. Click failed run
3. Expand "Build" step
4. Look for specific error (usually npm/build errors)

**Common Causes**:
- Missing dependencies
- Build script errors
- Environment variable issues

**Fix**:
```bash
# Test build locally first
cd mcp-console
npm ci
npm run build
```

### Stale Content After Deployment

**Symptom**: Changes not reflected on live site

**Solution 1**: Hard refresh browser
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Solution 2**: Clear cache in workflow

Add cache busting to `vite.config.ts`:
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`
      }
    }
  }
});
```

---

## Performance Optimization

### Build Optimizations

**Reduce bundle size**:
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.log in production
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@mui/material', '@radix-ui/react']
        }
      }
    }
  }
});
```

**Enable compression** (for S3/Nginx/etc.):
```bash
# Gzip all assets
find dist -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' \) \
  -exec gzip -9 -k {} \;
```

### CDN Configuration

For GitHub Pages (automatic CDN):
- Files cached automatically by GitHub's CDN
- No additional configuration needed

For custom CDN (CloudFlare, Fastly):
1. Point CDN to your deployment
2. Configure cache rules (cache static assets for 1 year)
3. Enable gzip/brotli compression

---

## Deployment Checklist

### Pre-Deployment
- [ ] Test build locally (`npm run build`)
- [ ] Verify environment variables are set
- [ ] Check MCP Hub is accessible
- [ ] Test CORS if using custom domain
- [ ] Review recent changes in dashboard

### Post-Deployment
- [ ] Verify deployment succeeded in Actions tab
- [ ] Test live site loads correctly
- [ ] Check API connection (Dashboard shows data)
- [ ] Test all routes (Dashboard, Tools, Runs, Connections)
- [ ] Verify on mobile/tablet (responsive design)
- [ ] Clear browser cache if issues

---

## Rollback Procedure

### GitHub Pages Rollback

**Option 1**: Revert commit
```bash
# Find commit to revert
git log --oneline

# Revert to previous working commit
git revert <commit-hash>
git push origin main
```

**Option 2**: Redeploy previous version
```bash
# Check out previous version
git checkout <previous-commit-hash> -- mcp-console/

# Commit and push
git commit -m "Rollback console to previous version"
git push origin main
```

### Emergency: Disable Console

Temporarily disable by adding to `mcp-console/dist/index.html`:
```html
<body>
  <div style="padding: 20px; text-align: center;">
    <h1>Maintenance Mode</h1>
    <p>Console temporarily unavailable. Please check back soon.</p>
  </div>
</body>
```

---

## Monitoring

### Deployment Metrics

Track in GitHub Actions:
- Build time (target: <3 minutes)
- Bundle size (target: <2MB)
- Deployment success rate (target: >95%)

### Runtime Monitoring

Use browser DevTools or analytics:
- Page load time (target: <2s)
- API response time (target: <500ms)
- Error rate (target: <1%)

### Logs

**GitHub Actions Logs**:
- Available for 90 days
- Download via Actions tab

**Browser Console Logs**:
- Enable in development: `VITE_DEV_LOGS=true`
- Disabled in production for performance

---

## Additional Resources

- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Main README](./README.md)
- [MCP Hub API Reference](../mcp-hub/API.md)

---

**Questions or Issues?**
Open an issue: https://github.com/bcali/MCP/issues
