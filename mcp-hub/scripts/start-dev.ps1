# Start MCP Hub in development mode (auto-start script for Claude Code sessions)

$ErrorActionPreference = "Stop"

$PORT = 8080

# Check if server is already running
$existingProcess = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue
if ($existingProcess) {
    Write-Host "mcp-hub: Already running on port $PORT"
    exit 0
}

# Navigate to mcp-hub directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location "$scriptPath\.."

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "mcp-hub: Installing dependencies..."
    npm install
}

# Start MCP Hub in background using Start-Job
Write-Host "mcp-hub: Starting server on port $PORT..."
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
}

Pop-Location

# Wait for server to be ready (max 30 seconds)
Write-Host "mcp-hub: Waiting for server to be ready..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$PORT/healthz" `
            -UseBasicParsing `
            -TimeoutSec 1 `
            -ErrorAction SilentlyContinue

        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    }
    catch {
        # Server not ready yet, continue waiting
    }
    Start-Sleep -Seconds 1
}

if ($ready) {
    Write-Host "mcp-hub: Server started successfully (Job ID: $($job.Id))"
    Write-Host "mcp-hub: Check logs with: Receive-Job -Id $($job.Id)"
    Write-Host "mcp-hub: Stop with: Stop-Job -Id $($job.Id)"
    exit 0
}
else {
    Write-Host "mcp-hub: Failed to start server (timeout after 30s)"
    Write-Host "mcp-hub: Check job status: Get-Job -Id $($job.Id)"
    Write-Host "mcp-hub: View output: Receive-Job -Id $($job.Id)"
    Stop-Job -Id $job.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $job.Id -ErrorAction SilentlyContinue
    exit 1
}
