@echo off
echo ========================================
echo Starting MCP Console Dashboard
echo ========================================
echo.

REM Set Node.js path
set PATH=C:\Program Files\nodejs;%PATH%

REM Navigate to mcp-console directory
cd /d %~dp0mcp-console

echo Starting dashboard on http://localhost:5173
echo Press Ctrl+C to stop
echo.

npm run dev
