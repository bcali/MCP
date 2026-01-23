# Stop MCP Hub development server

$ErrorActionPreference = "Stop"

$PORT = 8080

# Try to find process by port
$connection = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue
if ($connection) {
    $processId = $connection.OwningProcess
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

    if ($process) {
        Write-Host "mcp-hub: Stopping server (PID: $processId, Name: $($process.ProcessName))..."
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue

        # Wait a moment to ensure it's stopped
        Start-Sleep -Seconds 1

        # Check if it's still running
        $stillRunning = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue
        if (-not $stillRunning) {
            Write-Host "mcp-hub: Server stopped successfully"
        } else {
            Write-Host "mcp-hub: Warning - Server may still be running"
        }
    }
}
else {
    Write-Host "mcp-hub: Server not running on port $PORT"
}

# Also stop any PowerShell jobs running npm
$jobs = Get-Job | Where-Object { $_.Command -like "*npm run dev*" }
if ($jobs) {
    Write-Host "mcp-hub: Stopping background jobs..."
    $jobs | Stop-Job
    $jobs | Remove-Job
}
