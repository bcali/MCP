@echo off
echo ========================================
echo Starting MCP Hub Server
echo ========================================
echo.

REM Set Node.js path
set PATH=C:\Program Files\nodejs;%PATH%

REM Navigate to mcp-hub directory
cd /d %~dp0mcp-hub

echo Starting server on http://localhost:8080
echo Press Ctrl+C to stop
echo.

npm run dev
