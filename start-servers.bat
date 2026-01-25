@echo off
echo ========================================
echo Starting MCP Hub Servers
echo ========================================
echo.

REM Set Node.js path
set PATH=C:\Program Files\nodejs;%PATH%

REM Start MCP Hub Server in new window
echo Starting MCP Hub Server on port 8080...
start "MCP Hub Server" cmd /k "cd /d %~dp0mcp-hub && npm run dev"

REM Wait 5 seconds for hub to start
timeout /t 5 /nobreak > nul

REM Start MCP Console Dashboard in new window
echo Starting MCP Console Dashboard on port 5173...
start "MCP Console Dashboard" cmd /k "cd /d %~dp0mcp-console && npm run dev"

echo.
echo ========================================
echo Servers starting...
echo ========================================
echo MCP Hub:      http://localhost:8080
echo Dashboard:    http://localhost:5173
echo ========================================
echo.
echo Press any key to stop all servers...
pause > nul

REM Kill all Node.js processes (stops both servers)
taskkill /FI "WINDOWTITLE eq MCP Hub Server*" /T /F
taskkill /FI "WINDOWTITLE eq MCP Console Dashboard*" /T /F

echo.
echo Servers stopped.
pause
