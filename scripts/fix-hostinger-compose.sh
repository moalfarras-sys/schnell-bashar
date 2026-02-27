#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/schnell-bashar"
if [[ ! -d "$APP_DIR" ]]; then
  APP_DIR="$HOME/schnell-bashar"
fi

cd "$APP_DIR"

echo "==> Writing docker-compose.yml (no local image dependency)"
cat > docker-compose.yml <<'EOF'
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: schnell_sicher_umzug
      PGDATA: /var/lib/postgresql/data/pgdata
    command: postgres -c shared_buffers=256MB -c max_connections=100
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d schnell_sicher_umzug"]
      interval: 5s
      timeout: 5s
      retries: 20
    volumes:
      - db_data:/var/lib/postgresql/data

  web:
    image: node:20-alpine
    working_dir: /app
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./:/app
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:postgres@db:5432/schnell_sicher_umzug
      DIRECT_URL: postgresql://postgres:postgres@db:5432/schnell_sicher_umzug
      NEXT_PUBLIC_BASE_URL: https://schnellsicherumzug.de
      HOSTNAME: "0.0.0.0"
      PORT: "3000"
    command: >
      sh -c "npm ci --include=dev &&
      npm run prisma:generate &&
      npm run prisma:deploy &&
      npm run db:seed:ensure-core &&
      npm run build &&
      mkdir -p .next/standalone/.next &&
      cp -r .next/static .next/standalone/.next/static &&
      cp -r public .next/standalone/public &&
      node .next/standalone/server.js"
    expose:
      - "3000"

volumes:
  db_data:
EOF

echo "==> Verifying compose config for web service"
docker compose config | sed -n '/web:/,/^[^ ]/p'

echo "==> Restarting docker stack"
docker compose down --remove-orphans || true
docker compose pull || true
docker compose up -d

echo "==> Status"
docker compose ps

echo "==> Web logs (tail)"
docker compose logs web --tail=120 || true

echo "==> HTTP checks"
docker compose exec -T web wget --spider -q "http://127.0.0.1:3000" || true
curl -I https://schnellsicherumzug.de || true

echo "==> Done"
