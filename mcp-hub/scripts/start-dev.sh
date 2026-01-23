#!/bin/bash
# Start MCP Hub in development mode (auto-start script for Claude Code sessions)

set -e

PORT=8080
LOG_FILE="/tmp/mcp-hub.log"
PID_FILE="/tmp/mcp-hub.pid"

# Check if server is already running
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "[mcp-hub] Already running on port $PORT"
    exit 0
fi

# Navigate to mcp-hub directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[mcp-hub] Installing dependencies..."
    npm install
fi

# Start MCP Hub in background
echo "[mcp-hub] Starting server on port $PORT..."
nohup npm run dev > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

# Wait for server to be ready (max 30 seconds)
echo "[mcp-hub] Waiting for server to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:$PORT/healthz > /dev/null 2>&1; then
        echo "[mcp-hub] Server started successfully ✓"
        echo "[mcp-hub] Logs: $LOG_FILE"
        echo "[mcp-hub] PID: $(cat $PID_FILE)"
        exit 0
    fi
    sleep 1
done

# If we get here, startup failed
echo "[mcp-hub] Failed to start server (timeout after 30s)"
echo "[mcp-hub] Check logs: $LOG_FILE"
exit 1
