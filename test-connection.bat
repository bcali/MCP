@echo off
echo ========================================
echo Testing MCP Hub Connection
echo ========================================
echo.

REM Read API key from .env file (fallback to default for local testing)
set API_KEY=YOUR_API_KEY_HERE
set HUB_URL=http://localhost:8080

echo NOTE: Update API_KEY in this file or set MCP_HUB_API_KEY environment variable
echo.

echo Testing connection to: %HUB_URL%
echo.

curl -s "%HUB_URL%/v1/status?key=%API_KEY%"

echo.
echo.
echo ========================================
if %errorlevel% == 0 (
    echo ✓ Connection successful!
) else (
    echo ✗ Connection failed!
    echo.
    echo Troubleshooting:
    echo 1. Make sure MCP Hub is running ^(start-hub-only.bat^)
    echo 2. Check if port 8080 is available
    echo 3. Verify the API key matches in .env files
)
echo ========================================
echo.

pause
