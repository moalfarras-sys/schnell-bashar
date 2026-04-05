$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$sshKey = Join-Path $HOME ".ssh/codex_vps_ed25519"
$remoteHost = "root@schnellsicherumzug.de"
$dbPort = 15432
$appPort = 3005
$tunnelPattern = "15432:127.0.0.1:5432 $remoteHost"

if (-not (Test-Path $sshKey)) {
  throw "SSH key not found at $sshKey"
}

$existingTunnel = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "ssh.exe" -and
    $_.CommandLine -like "*$tunnelPattern*"
  } |
  Select-Object -First 1

if (-not $existingTunnel) {
  Write-Host "[dev:vps-tunnel] starting SSH tunnel on localhost:$dbPort"
  Start-Process -FilePath "ssh.exe" -ArgumentList @(
    "-i", $sshKey,
    "-o", "StrictHostKeyChecking=accept-new",
    "-N",
    "-L", "$dbPort`:127.0.0.1:5432",
    $remoteHost
  ) | Out-Null
  Start-Sleep -Seconds 2
} else {
  Write-Host "[dev:vps-tunnel] reusing SSH tunnel process $($existingTunnel.ProcessId)"
}

$env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:$dbPort/schnell_sicher_umzug?schema=public"
$env:DIRECT_URL = $env:DATABASE_URL
$env:LOCAL_DATABASE_URL = $env:DATABASE_URL
$env:NEXT_PUBLIC_BASE_URL = "http://localhost:$appPort"
$env:NODE_ENV = "development"
$env:PORT = "$appPort"
$env:HOSTNAME = "127.0.0.1"

Write-Host "[dev:vps-tunnel] DATABASE_URL set to tunnel on port $dbPort"
Write-Host "[dev:vps-tunnel] NODE_ENV forced to development for local admin cookies"
Write-Host "[dev:vps-tunnel] starting app on http://localhost:$appPort"

Set-Location $repoRoot
npm run dev:no-db-check
