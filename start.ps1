$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting The Missing Booth..." -ForegroundColor Magenta
Write-Host ""

# Start Redis
Write-Host "[1/3] Redis..." -ForegroundColor Cyan
$null = docker start redis 2>&1
if ($LASTEXITCODE -ne 0) {
    $null = docker run -d -p 6379:6379 --name redis redis:alpine 2>&1
}
Write-Host "      Done." -ForegroundColor Green
Start-Sleep -Seconds 2

# Start Backend
Write-Host "[2/3] Backend..." -ForegroundColor Cyan
$backendScript = "$root\backend\start.ps1"
Start-Process powershell -ArgumentList "-NoExit -File `"$backendScript`""
Start-Sleep -Seconds 2

# Start Frontend
Write-Host "[3/3] Frontend..." -ForegroundColor Cyan
$frontendScript = "$root\frontend\start.ps1"
Start-Process powershell -ArgumentList "-NoExit -File `"$frontendScript`""

Write-Host ""
Write-Host "Done! Open http://localhost:3000" -ForegroundColor Green
Write-Host "      Network: http://192.168.68.104:3000" -ForegroundColor White
Write-Host ""
