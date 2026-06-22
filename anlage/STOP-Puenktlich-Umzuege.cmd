@echo off
setlocal
cd /d "%~dp0"
echo Stoppe lokale Prozesse fuer dieses Dokumenten-System...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=(Resolve-Path '.').Path; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($root) -and $_.Name -match 'node|npm|cmd' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
echo Fertig.
pause

