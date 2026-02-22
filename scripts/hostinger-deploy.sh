#!/usr/bin/env bash
set -euo pipefail

APP_NAME="schnell-sicher-umzug"
APP_DIR="/var/www/schnell-sicher-umzug"
DOMAIN="${1:-}"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: ./scripts/hostinger-deploy.sh <domain>"
  exit 1
fi

echo "==> Deploying ${APP_NAME} in ${APP_DIR}"
cd "$APP_DIR"

echo "==> Installing dependencies"
npm ci

echo "==> Prisma generate + migrate deploy"
npm run prisma:generate
npm run prisma:deploy

echo "==> Building Next.js production bundle"
npm run build

echo "==> Starting/reloading PM2 app"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload "$APP_NAME"
else
  pm2 start ecosystem.config.cjs --only "$APP_NAME"
fi
pm2 save

echo "==> Smoke checks"
curl -fI "https://${DOMAIN}/"
curl -fI "https://${DOMAIN}/buchen"
curl -fI "https://${DOMAIN}/admin/login"

echo "==> Deployment finished successfully"
