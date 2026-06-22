@echo off
setlocal
cd /d "%~dp0"
title Puenktlich Umzuege Dokumenten-System

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo FEHLER: Node.js ist auf diesem Computer nicht installiert.
  echo Bitte zuerst Node.js LTS installieren: https://nodejs.org
  echo Danach diese Datei erneut starten.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo FEHLER: npm wurde nicht gefunden. Bitte Node.js LTS neu installieren.
  echo.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo.
  echo FEHLER: package.json wurde nicht gefunden.
  echo Diese Datei muss im Projektordner liegen.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo.
  echo Erste Einrichtung: Abhaengigkeiten werden installiert.
  echo Das kann ein paar Minuten dauern.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo FEHLER: npm install ist fehlgeschlagen.
    echo Bitte Internetverbindung pruefen und erneut versuchen.
    echo.
    pause
    exit /b 1
  )
)

dir /b "%LOCALAPPDATA%\ms-playwright\chromium-*" >nul 2>nul
if errorlevel 1 (
  echo.
  echo Playwright Chromium wird installiert.
  echo.
  call npx playwright install chromium
  if errorlevel 1 (
    echo.
    echo FEHLER: Playwright Chromium konnte nicht installiert werden.
    echo Bitte Internetverbindung pruefen und erneut versuchen.
    echo.
    pause
    exit /b 1
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if %errorlevel%==0 (
  echo Dokumenten-System laeuft bereits. Browser wird geoeffnet.
  start "" "http://localhost:3000"
  exit /b 0
)

echo.
echo Starte Dokumenten-System...
echo Dieses Fenster bitte offen lassen, solange das Programm benutzt wird.
echo.
start "" "http://localhost:3000"
call npm run dev -- --port 3000
