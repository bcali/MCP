# MCP Dashboard Setup Guide

## 🎨 Enhanced Dashboard

Your MCP dashboard has been upgraded with a modern, beautiful design featuring:

✨ **Visual Improvements:**
- Gradient status cards with animated indicators
- Real-time performance charts with smooth animations
- Modern glassmorphism effects
- Responsive grid layout
- Dark mode optimized design
- Smooth hover effects and transitions

🔄 **Features:**
- Auto-refresh every 30 seconds
- Manual refresh button
- Real-time connection health monitoring
- Performance metrics and latency tracking
- Activity feed with status indicators
- Connection status with tool counts

## 🚀 Quick Start

### Option 1: Start Everything (Recommended)

Double-click `start-servers.bat` to start both the MCP Hub server and Dashboard:

```
MCP Hub Server:    http://localhost:8080
Dashboard:         http://localhost:5173
```

This will open two command windows:
1. **MCP Hub Server** - Backend API on port 8080
2. **MCP Console Dashboard** - Frontend UI on port 5173

### Option 2: Start Individually

**Start MCP Hub only:**
```bash
# Double-click: start-hub-only.bat
# Or run manually:
cd mcp-hub
npm run dev
```

**Start Dashboard only:**
```bash
# Double-click: start-dashboard-only.bat
# Or run manually:
cd mcp-console
npm run dev
```

## ⚙️ Configuration

### Local Development (Default)

The dashboard is configured to connect to your local MCP Hub:

**File:** `mcp-console/.env`
```env
VITE_HUB_URL=http://localhost:8080
VITE_HUB_API_KEY=N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs
```

**File:** `mcp-hub/.env`
```env
MCP_HUB_API_KEY=N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs
PORT=8080
HOST=0.0.0.0
```

### Cloud Deployment (Optional)

To connect to your cloud-hosted MCP Hub, edit `mcp-console/.env`:

```env
VITE_HUB_URL=https://mcp-hub-6jzkdzuf2a-uc.a.run.app
VITE_HUB_API_KEY=Iwant@newpass007
```

## 🎯 Dashboard Features

### Overview Tab
- **Hub Status Card**: Server health, version, and uptime
- **Live Sessions**: Active SSE connections
- **Success Rate**: Percentage of successful tool executions
- **Available Tools**: Total tools across all connections

### Performance Monitoring
- Real-time latency charts
- Response time tracking
- Trend analysis

### Activity Feed
- Recent tool executions
- Status indicators (success/failure)
- Timestamp tracking

### Connection Health
- Status of all MCP server connections
- Tool count per connection
- Latency metrics

## 🔧 Troubleshooting

### Dashboard shows "Connection Error"

1. **Make sure MCP Hub is running:**
   ```bash
   cd C:\Users\brian\Documents\MCP\mcp-hub
   npm run dev
   ```

2. **Check if port 8080 is available:**
   ```bash
   netstat -ano | findstr :8080
   ```

3. **Verify the API key matches** in both:
   - `mcp-hub/.env`
   - `mcp-console/.env`

### Dashboard not updating

1. Check browser console for errors (F12)
2. Verify the Hub API is responding:
   ```
   http://localhost:8080/v1/status?key=N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs
   ```

### Port already in use

**MCP Hub (8080):**
```bash
# Find process using port 8080
netstat -ano | findstr :8080
# Kill process (use PID from above)
taskkill /PID <PID> /F
```

**Dashboard (5173):**
```bash
# Find process using port 5173
netstat -ano | findstr :5173
# Kill process
taskkill /PID <PID> /F
```

## 📊 Status Indicators

| Color | Meaning |
|-------|---------|
| 🟢 Green (Healthy) | Connection is active and responding |
| 🟡 Yellow (Degraded) | Connection is slow or intermittent |
| 🔴 Red (Down) | Connection is unavailable |

## 🔐 Security Notes

- **API Keys**: Change the default API keys in production
- **Network**: The Hub listens on `0.0.0.0` for development (all interfaces)
- **CORS**: Configure CORS settings for production deployment

## 🚀 Production Deployment

### Deploy MCP Hub to Cloud Run

1. Build the Docker image:
   ```bash
   cd mcp-hub
   docker build -t mcp-hub .
   ```

2. Push to Google Container Registry
3. Deploy to Cloud Run with environment variables
4. Update `mcp-console/.env` with your cloud URL

### Deploy Dashboard to Vercel/Netlify

1. Build the dashboard:
   ```bash
   cd mcp-console
   npm run build
   ```

2. Deploy the `dist` folder to your hosting service
3. Set environment variables in hosting platform

## 📝 Development Commands

### MCP Hub
```bash
cd mcp-hub
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
```

### MCP Console
```bash
cd mcp-console
npm run dev      # Start development server (port 5173)
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🆘 Support

For issues or questions:
1. Check the [main README](./README.md)
2. Review [API documentation](./mcp-hub/API.md)
3. Open an issue on GitHub

## 📚 Related Documentation

- [MCP Hub API Reference](./mcp-hub/API.md)
- [Deployment Guide](./mcp-hub/DEPLOYMENT.md)
- [Architecture Overview](./ARCHITECTURE.md)
