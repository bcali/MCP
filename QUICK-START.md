# MCP Dashboard - Quick Start Guide

## 🎉 Setup Complete!

Your MCP Dashboard with beautiful modern design is ready to use!

## ✨ What's New

### Enhanced Dashboard Features:
- 🎨 **Beautiful gradient status cards** with animated indicators
- 📊 **Real-time performance charts** with smooth area graphs
- ⚡ **Live connection monitoring** with health status
- 🔄 **Auto-refresh every 30 seconds** with manual refresh option
- 📱 **Fully responsive** design that works on all screen sizes
- 🌙 **Dark mode optimized** for comfortable viewing

## 🚀 Start the Dashboard (3 Easy Steps)

### Step 1: Start the Servers

**Option A: Start Both (Recommended)**
```
Double-click: start-servers.bat
```
This starts:
- MCP Hub Server → http://localhost:8080
- Dashboard → http://localhost:5173

**Option B: Start Individually**
```
MCP Hub:    start-hub-only.bat
Dashboard:  start-dashboard-only.bat
```

### Step 2: Open Dashboard

Open your browser and navigate to:
```
http://localhost:5173
```

### Step 3: Verify Connection

Click the refresh button in the top right to test the connection.

You should see:
- ✅ Hub Status: ONLINE
- ✅ Live Sessions count
- ✅ Success Rate percentage
- ✅ Available Tools count

## 🎨 Dashboard Overview

### Main Dashboard (/)
Four beautiful gradient cards showing:
1. **Hub Status** (Purple) - Server status, version, uptime
2. **Live Sessions** (Pink) - Active SSE connections
3. **Success Rate** (Blue) - Tool execution success percentage
4. **Available Tools** (Orange) - Total tools from all connections

### Performance Chart
- Real-time latency monitoring
- Smooth animated area chart
- Average response time display

### Activity Feed
- Recent tool executions
- Success/failure indicators
- Timestamps

### Connection Health
- Status of all MCP servers
- Latency metrics
- Tool counts per connection

## 🧪 Testing

### Test Hub Connection
```
Double-click: test-connection.bat
```

This will check if the MCP Hub is responding correctly.

### Manual Test
Visit in browser:
```
http://localhost:8080/v1/status?key=N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs
```

You should see JSON response with server status.

## ⚙️ Configuration

### Connecting to Different Hub

**Local Hub** (default):
- Edit `mcp-console/.env`
- Set `VITE_HUB_URL=http://localhost:8080`

**Cloud Hub**:
- Edit `mcp-console/.env`
- Set `VITE_HUB_URL=https://mcp-hub-6jzkdzuf2a-uc.a.run.app`
- Set `VITE_HUB_API_KEY=Iwant@newpass007`

### Changing API Key

1. Update `mcp-hub/.env`:
   ```
   MCP_HUB_API_KEY=your-new-key
   ```

2. Update `mcp-console/.env`:
   ```
   VITE_HUB_API_KEY=your-new-key
   ```

3. Restart both servers

## 🔄 Keeping Server Running 24/7

### Quick Method: Task Scheduler
1. Open Task Scheduler
2. Create task to run `start-hub-only.bat` at startup

### Professional Method: PM2
```bash
npm install -g pm2
cd C:\Users\brian\Documents\MCP\mcp-hub
pm2 start npm --name "mcp-hub" -- run start
pm2 save
pm2 startup
```

See [install-as-service.md](./install-as-service.md) for detailed instructions.

## 🐛 Troubleshooting

### Dashboard shows "Connection Error"

✅ **Solution 1:** Make sure MCP Hub is running
```
Double-click: start-hub-only.bat
```

✅ **Solution 2:** Check port availability
```bash
netstat -ano | findstr :8080
```

✅ **Solution 3:** Verify API keys match
- Check `mcp-hub/.env`
- Check `mcp-console/.env`
- Keys should be identical

### Dashboard not loading

✅ **Clear browser cache**: Ctrl+Shift+R

✅ **Check console**: Press F12 and look for errors

✅ **Restart both servers**:
```
Close all cmd windows
Double-click: start-servers.bat
```

### Port already in use

✅ **Kill process on port 8080**:
```bash
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

## 📚 Next Steps

1. ✅ **Explore the Dashboard**
   - Click through all tabs
   - Test the refresh button
   - View connection health

2. ✅ **Add MCP Server Connections**
   - Go to "Connections" tab
   - Click "Add Connection"
   - Configure new MCP servers

3. ✅ **Monitor Performance**
   - Watch the latency chart
   - Track success rates
   - Monitor active connections

4. ✅ **Set up Always-On**
   - Install as Windows service (PM2 or NSSM)
   - Set up auto-start on boot
   - Configure monitoring alerts

## 🆘 Need Help?

1. Check [DASHBOARD-SETUP.md](./DASHBOARD-SETUP.md) for detailed configuration
2. See [install-as-service.md](./install-as-service.md) for 24/7 operation
3. Review [mcp-hub/API.md](./mcp-hub/API.md) for API documentation
4. Open an issue on GitHub

## 📁 File Structure

```
C:\Users\brian\Documents\MCP\
├── mcp-hub/              # Backend server
│   ├── .env              # Hub configuration
│   └── dist/             # Built server code
├── mcp-console/          # Frontend dashboard
│   ├── .env              # Console configuration
│   └── src/              # React source code
├── start-servers.bat     # Start both servers
├── start-hub-only.bat    # Start hub only
├── start-dashboard-only.bat  # Start dashboard only
├── test-connection.bat   # Test hub connection
├── QUICK-START.md        # This file
├── DASHBOARD-SETUP.md    # Detailed setup guide
└── install-as-service.md # Always-on configuration
```

## 🎯 Quick Commands

```bash
# Start everything
start-servers.bat

# Test connection
test-connection.bat

# View hub only
start-hub-only.bat

# View dashboard only
start-dashboard-only.bat
```

---

**You're all set!** 🚀 Double-click `start-servers.bat` to begin.
