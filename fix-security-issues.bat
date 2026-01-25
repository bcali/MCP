@echo off
echo ========================================
echo MCP Security Issue Remediation Script
echo ========================================
echo.
echo This script will help you fix the security issues found in the audit.
echo.
echo CRITICAL: You must rotate your API keys immediately!
echo.
pause

REM Generate new API keys
echo.
echo Generating new secure API keys...
echo.

set PATH=C:\Program Files\nodejs;%PATH%

echo New Cloud Hub API Key:
node -e "console.log('VITE_HUB_API_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
echo.

echo New Local Hub API Key:
node -e "console.log('MCP_HUB_API_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
echo.

echo ========================================
echo NEXT STEPS:
echo ========================================
echo.
echo 1. Copy the keys above
echo 2. Update mcp-hub/.env with MCP_HUB_API_KEY
echo 3. Update mcp-console/.env with VITE_HUB_API_KEY
echo 4. Update .claude/mcp-servers.json with new x-api-key
echo 5. Update Google Cloud Run environment variables
echo 6. Restart all servers
echo.
echo After updating keys, run: fix-security-code.bat
echo.
pause
