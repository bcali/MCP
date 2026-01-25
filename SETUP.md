# MCP Setup Guide for Home PC

## ✅ Current Status
- ✅ Git installed (v2.52.0)
- ✅ MCP repository cloned
- ❌ Node.js not installed
- ❌ Python not installed
- ⚠️ MCP servers not configured in Claude Code

## 📦 Step 1: Install Required Software

### Node.js (REQUIRED)
1. Download Node.js LTS from https://nodejs.org/
2. Run installer and follow defaults
3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### Python (For tiktok-content-analysis)
1. Download from https://www.python.org/downloads/ (Python 3.11+)
2. ✅ **IMPORTANT**: Check "Add Python to PATH" during installation
3. Verify:
   ```bash
   python --version
   pip --version
   ```

## 🔨 Step 2: Build Your MCP Servers

After Node.js is installed:

### Gamma MCP Server
```bash
cd C:\Users\brian\Documents\MCP\gamma-mcp-server
npm install
npm run build
```

### MCP Hub (Optional - for local hub)
```bash
cd C:\Users\brian\Documents\MCP\mcp-hub
npm install
npm run build
```

### MCP Console (Optional - management dashboard)
```bash
cd C:\Users\brian\Documents\MCP\mcp-console
npm install
npm run build
```

## ⚙️ Step 3: Configure MCP Servers in Claude Code

### Option A: Using Claude Code CLI (Recommended)
If Claude Code CLI is available:

```bash
# Add Gamma MCP server
claude mcp add --transport stdio gamma npx -- @gamma/mcp-server

# Or add your local hub
claude mcp add --transport http hub-local http://localhost:8080/v1/sse
```

### Option B: Manual Configuration
Edit `C:\Users\brian\.claude\settings.local.json` or create MCP config:

Create/edit `.claude/mcp-servers.json` in your home directory:

```json
{
  "mcpServers": {
    "gamma": {
      "command": "node",
      "args": ["C:/Users/brian/Documents/MCP/gamma-mcp-server/dist/index.js"],
      "env": {
        "GAMMA_API_KEY": "your-gamma-api-key-here"
      }
    },
    "hub-local": {
      "url": "http://localhost:8080/v1/sse",
      "headers": {
        "x-api-key": "N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs"
      }
    }
  }
}
```

### Claude.ai MCP Servers (Cloud-based)
The MCP servers you're currently using (Gamma, Atlassian, Cloudflare, Figma) are cloud-based integrations provided by Claude.ai and are already working! These don't require local installation.

## 🚀 Step 4: Clone Other Repositories

After Node.js is installed, clone your other projects:

```bash
cd C:\Users\brian\Documents

# Clone all repositories
git clone https://github.com/bcali/AI-Shop-Bot.git
git clone https://github.com/bcali/hotel-intake-form.git
git clone https://github.com/bcali/pinseeking.git
git clone https://github.com/bcali/prompt-library.git
git clone https://github.com/bcali/tiktok-content-analysis.git

# Install dependencies for TypeScript projects
cd AI-Shop-Bot && npm install && cd ..
cd hotel-intake-form && npm install && cd ..
cd pinseeking && npm install && cd ..

# Install dependencies for Python project
cd tiktok-content-analysis
pip install -r requirements.txt
```

## 🧪 Step 5: Test Everything

### Test Node.js Projects
```bash
cd C:\Users\brian\Documents\MCP\gamma-mcp-server
npm run test
```

### Test MCP Connection
```bash
claude mcp list  # List configured servers
```

## 📚 Repository Summary

| Repository | Language | Purpose |
|-----------|----------|---------|
| **AI-Shop-Bot** | TypeScript | Agentic payments and shopping |
| **hotel-intake-form** | TypeScript | Hotel opportunity dashboard |
| **MCP** | TypeScript | MCP servers monorepo |
| **pinseeking** | TypeScript | (Project details TBD) |
| **prompt-library** | HTML | 82 AI prompts for PM |
| **tiktok-content-analysis** | Python | TikTok content analytics |

## 🔗 Useful Links

- [Claude Code MCP Docs](https://code.claude.com/docs/en/mcp)
- [MCP Server Configuration Guide](https://scottspence.com/posts/configuring-mcp-tools-in-claude-code)
- [Your MCP Hub Cloud Instance](https://mcp-hub-6jzkdzuf2a-uc.a.run.app)

## 🆘 Troubleshooting

### "node: command not found"
- Restart your terminal after installing Node.js
- Verify Node.js is in PATH: `echo $PATH`

### MCP servers not showing in Claude Code
- Restart Claude Code completely
- Check configuration file syntax (must be valid JSON)
- Run `claude mcp list` to verify servers are registered

### Gamma API not working
- Ensure you have a Gamma API key from https://developers.gamma.app
- Add it to your environment or MCP config

## ⚡ Quick Start Checklist

- [ ] Install Node.js
- [ ] Install Python
- [ ] Build Gamma MCP server (`cd gamma-mcp-server && npm install && npm run build`)
- [ ] Configure MCP servers in Claude Code
- [ ] Clone other repositories
- [ ] Test installations
