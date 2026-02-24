#!/usr/bin/env bash
set -euo pipefail

APP_NAME="schnell-sicher-umzug"
APP_DIR="/var/www/schnell-bashar"
DOMAIN="${1:-}"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: ./scripts/hostinger-deploy.sh <domain>"
  exit 1
fi

echo "==> Deploying ${APP_NAME} in ${APP_DIR}"
cd "$APP_DIR"

echo "==> Stopping PM2 web app processes (PM2 reserved for workers only)"
pm2 delete schnell >/dev/null 2>&1 || true
pm2 delete schnell-web >/dev/null 2>&1 || true
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
pm2 save || true

echo "==> Restarting Docker stack"
docker compose down --remove-orphans
docker compose up -d

echo "==> Waiting for app startup"
sleep 20

echo "==> Running post-deploy invoice backfill (idempotent)"
docker compose exec -T web npm run accounting:backfill:invoices || true

echo "==> Smoke checks"
wget -S --spider "https://${DOMAIN}/"
wget -S --spider "https://${DOMAIN}/buchen"
wget -S --spider "https://${DOMAIN}/admin/login"
wget -qO- "https://${DOMAIN}/api/availability/dates?from=2026-03-01&to=2026-03-05&speed=STANDARD&volumeM3=10" > /tmp/availability-dates.json
wget -qO- "https://${DOMAIN}/api/availability/slots?date=2026-03-03&speed=STANDARD&volumeM3=10" > /tmp/availability-slots.json

if grep -q '"demoMode":true' /tmp/availability-dates.json || grep -q '"demoMode":true' /tmp/availability-slots.json; then
  echo "ERROR: Booking APIs are still in demo mode."
  echo "dates: $(cat /tmp/availability-dates.json)"
  echo "slots: $(cat /tmp/availability-slots.json)"
  exit 1
fi

echo "==> Booking APIs are live (demoMode=false)"

echo "==> Deployment finished successfully"
