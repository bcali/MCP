#!/bin/bash
# Stop MCP Hub development server

set -e

PORT=8080
PID_FILE="/tmp/mcp-hub.pid"

# Try to find process by port
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t)
    echo "[mcp-hub] Stopping server (PID: $PID)..."
    kill $PID 2>/dev/null || true
    echo "[mcp-hub] Server stopped ✓"
elif [ -f "$PID_FILE" ]; then
    # Try PID file as backup
    PID=$(cat "$PID_FILE")
    echo "[mcp-hub] Stopping server (PID from file: $PID)..."
    kill $PID 2>/dev/null || true
    echo "[mcp-hub] Server stopped ✓"
else
    echo "[mcp-hub] Server not running on port $PORT"
fi

# Clean up PID file
if [ -f "$PID_FILE" ]; then
    rm -f "$PID_FILE"
fi
