# Run MCP Hub as Windows Service

To keep your MCP Hub running 24/7, you can install it as a Windows service using PM2 or NSSM.

## Method 1: Using PM2 (Recommended)

PM2 is a production-ready process manager for Node.js applications.

### Install PM2 globally:
```bash
npm install -g pm2
pm2 install pm2-windows-startup
pm2-startup install
```

### Start MCP Hub with PM2:
```bash
cd C:\Users\brian\Documents\MCP\mcp-hub
pm2 start npm --name "mcp-hub" -- run start
pm2 save
```

### Useful PM2 Commands:
```bash
pm2 list                # List all processes
pm2 logs mcp-hub        # View logs
pm2 restart mcp-hub     # Restart service
pm2 stop mcp-hub        # Stop service
pm2 delete mcp-hub      # Remove from PM2
pm2 monit               # Monitor in real-time
```

## Method 2: Using NSSM (Non-Sucking Service Manager)

### Install NSSM:
1. Download from https://nssm.cc/download
2. Extract to `C:\nssm`
3. Add to PATH

### Install as Service:
```bash
nssm install MCPHub "C:\Program Files\nodejs\node.exe" "C:\Users\brian\Documents\MCP\mcp-hub\dist\index.js"
nssm set MCPHub AppDirectory "C:\Users\brian\Documents\MCP\mcp-hub"
nssm set MCPHub DisplayName "MCP Hub Server"
nssm set MCPHub Description "Model Context Protocol Hub Server"
nssm set MCPHub Start SERVICE_AUTO_START
nssm start MCPHub
```

### Manage Service:
```bash
nssm start MCPHub
nssm stop MCPHub
nssm restart MCPHub
nssm remove MCPHub confirm
```

## Method 3: Windows Task Scheduler (Simple)

### Create a scheduled task:
1. Open Task Scheduler
2. Create Basic Task
3. Name: "MCP Hub Server"
4. Trigger: At startup
5. Action: Start a program
6. Program: `C:\Users\brian\Documents\MCP\start-hub-only.bat`
7. Settings: Run whether user is logged on or not

## Auto-start Dashboard on Login

### Create a shortcut:
1. Right-click `start-dashboard-only.bat`
2. Create shortcut
3. Move shortcut to: `C:\Users\brian\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

## Production Considerations

For production use:
1. Use PM2 or NSSM for MCP Hub
2. Set up logging with rotation
3. Configure automatic restarts on failure
4. Monitor with external tools (Uptime Robot, Pingdom)
5. Set up alerts for downtime

## Monitoring

### Check if service is running:
```bash
# PM2
pm2 status

# NSSM
sc query MCPHub

# Process
tasklist | findstr node
```

### View logs:
```bash
# PM2
pm2 logs mcp-hub

# NSSM (check Event Viewer)
eventvwr.msc
```
