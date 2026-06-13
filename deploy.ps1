param(
    [string]$OutputPath = "PingMonitor-Deploy.zip"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Path $PSCommandPath -Parent
$OutputPath = Join-Path -Path $ProjectRoot -ChildPath $OutputPath

Write-Host "=== PingMonitor Deployment Packager ===" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot"
Write-Host "Output: $OutputPath"
Write-Host ""

if (!(Test-Path -LiteralPath "$ProjectRoot\vendor")) {
    Write-Host "ERROR: vendor/ directory not found. Run 'composer install' first." -ForegroundColor Red
    exit 1
}
if (!(Test-Path -LiteralPath "$ProjectRoot\node_modules")) {
    Write-Host "ERROR: node_modules/ directory not found. Run 'npm install' first." -ForegroundColor Red
    exit 1
}
if (!(Test-Path -LiteralPath "$ProjectRoot\public\build")) {
    Write-Host "ERROR: public/build/ directory not found. Run 'npm run build' first." -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Removing old archive if exists..."
Remove-Item -LiteralPath $OutputPath -ErrorAction SilentlyContinue

Write-Host "Step 2: Packaging everything (this may take a minute)..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($ProjectRoot, $OutputPath, 'Optimal', $false)

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host "Archive created: $OutputPath"
$size = (Get-Item -LiteralPath $OutputPath).Length
Write-Host "Size: $([math]::Round($size/1MB,1)) MB"
Write-Host ""
Write-Host "To deploy on the local server without internet:" -ForegroundColor Yellow
Write-Host "  1. Copy PingMonitor-Deploy.zip to the server via USB / network"
Write-Host "  2. Extract to C:\inetpub\wwwroot\PingMonitor (or your web root)"
Write-Host "  3. Run: php artisan key:generate"
Write-Host "  4. Run: php artisan migrate"
Write-Host "  5. Set up web server to point to the public/ directory"
Write-Host ""
Write-Host "To work from git on the local server (requires internet first time):" -ForegroundColor Cyan
Write-Host "  git clone https://github.com/ahmed-oukhchine/Ping-Monitor.git"
Write-Host "  cd Ping-Monitor"
Write-Host "  composer install"
Write-Host "  npm install"
Write-Host "  npm run build"
