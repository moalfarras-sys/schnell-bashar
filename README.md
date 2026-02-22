## Schnell Sicher Umzug — Premium Booking Platform (Deutsch)

Modernes, mobilfreundliches Portal für **Umzug + Entsorgung** mit:

- **Multi‑Step Wizard** (Auswahl statt Freitext): m³‑Schätzung, Zeit‑Schätzung, Preisrahmen, Termin‑Slots
- **Online Terminbuchung** (Kapazitätsprüfung)
- **Uploads** (optional, max. 10 Fotos)
- **Order-Erstellung**: Speicherung in DB + E‑Mail an `kontakt@schnellsicherumzug.de`
- **Admin Dashboard**: Aufträge, Katalog, Preise, Zeitfenster, CSV‑Export

---

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Prisma ORM v7 (inkl. `prisma.config.ts`) + Postgres (VPS)
- Nodemailer (SMTP)
- JWT Cookie Admin‑Auth (via `jose`)

---

## Lokale Entwicklung

### 1) Install

```bash
npm install
```

### 2) Env

Kopiere `.env.example` → `.env` und setze mindestens:

- `DATABASE_URL`
- `SESSION_SECRET`

### 3) Prisma Client generieren

```bash
npm run prisma:generate
```

### 4) Migrationen + Seed

> Hinweis: Dieses Projekt nutzt **Postgres**. Lokal brauchst du eine laufende Postgres‑DB.

```bash
npm run prisma:migrate
npm run db:seed
```

### 5) Dev starten

```bash
npm run dev
```

App: `http://localhost:3000`

Admin: `http://localhost:3000/admin/login`

### Lokale DB mit Docker (empfohlen)

```bash
npm run db:up
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run dev
```

Stoppen:

```bash
npm run db:down
```

## Supabase Setup + Migration

Zielbild:

- App Runtime (`DATABASE_URL`) nutzt Supabase Session Pooler.
- Prisma Migrationen (`DIRECT_URL`) laufen gegen den direkten Supabase Host.
- Lokale Daten werden vollstaendig nach Supabase uebernommen.

### 1) `.env` setzen

Pflichtvariablen:

- `DATABASE_URL` = Supabase pooler URL
- `DIRECT_URL` = Supabase direct URL
- `LOCAL_DATABASE_URL` = lokale Docker URL

Siehe `.env.example` fuer konkrete Beispiele.

### 2) Migration nach Supabase ausfuehren

```bash
npm run db:migrate:supabase
```

Script: `scripts/migrate-to-supabase.ts`

1. Fuehrt `prisma migrate deploy` gegen Supabase aus.
2. Exportiert alle lokalen Daten (`LOCAL_DATABASE_URL`), ohne `_prisma_migrations`.
3. Leert Supabase `public` Tabellen (ohne `_prisma_migrations`).
4. Importiert den kompletten Datenbestand.
5. Fuehrt `ANALYZE` aus.

Docker Desktop muss dabei laufen (das Script nutzt `postgres:16` fuer `pg_dump`/`psql`).

## Produktfluss (Termin + Zeitfenster + PDF Angebot)

Der Flow ist bereits im Code umgesetzt:

1. Formular sammelt Service, Datum, Zeitfenster und Kundendaten.
2. Slot-Verfuegbarkeit wird serverseitig geprueft.
3. Auftrag + Positionen + Uploads werden gespeichert.
4. Angebot-PDF wird generiert.
5. E-Mail mit PDF-Anhang wird versendet.

Relevante Dateien:

- `src/app/api/orders/route.ts`
- `src/server/availability/slots.ts`
- `src/server/pdf/generate-quote.tsx`
- `src/server/email/send-order-email.ts`

---

## Admin Login

Setze in `.env` (Produktion empfohlen):

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH` (bcrypt)

Hash erzeugen:

```bash
npm run admin:hash -- "DEIN_PASSWORT"
```

Dann den Output als `ADMIN_PASSWORD_HASH` in `.env` eintragen.

---

## Hostinger VPS Deployment (Production)

### A) Voraussetzungen (VPS)

- Node.js **20.19+**
- Postgres (z. B. 16)
- Nginx
- PM2
- Domain + SSL (Let’s Encrypt)

### B) Projekt auf den Server bringen

Option 1: Git clone (empfohlen)

Option 2: ZIP/SFTP Upload

### C) `.env` auf dem VPS setzen

Mindestens:

- `NEXT_PUBLIC_BASE_URL="https://DEINE-DOMAIN.DE"`
- `DATABASE_URL` (Supabase pooler URL)
- `DIRECT_URL` (Supabase direct URL)
- `SESSION_SECRET="..."`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ORDER_RECEIVER_EMAIL`

Optional:

- `DATABASE_SSL_REJECT_UNAUTHORIZED="false"` (falls Provider/SSL Probleme macht)
- `UPLOAD_DIR="/var/www/schnell/uploads"` (persistente Uploads außerhalb des Deploy‑Ordners)

Empfohlenes Beispiel:

```env
NEXT_PUBLIC_BASE_URL="https://deine-domain.de"
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?schema=public&sslmode=require&pgbouncer=true&connection_limit=5&pool_timeout=20"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?schema=public&sslmode=require"
SESSION_SECRET="lange-zufaellige-zeichenkette"
ADMIN_EMAIL="admin@deine-domain.de"
ADMIN_PASSWORD_HASH="..."
SMTP_HOST="smtp.dein-provider.de"
SMTP_PORT="587"
SMTP_USER="smtp-user"
SMTP_PASS="smtp-pass"
SMTP_FROM="Schnell Sicher Umzug <kontakt@schnellsicherumzug.de>"
ORDER_RECEIVER_EMAIL="kontakt@schnellsicherumzug.de"
DB_CONNECTION_LIMIT="5"
DB_POOL_TIMEOUT="20"
UPLOAD_DIR="/var/www/schnell/uploads"
```

### D) Prisma (Production)

```bash
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
```

### E) Build

```bash
npm run build
```

> Auf Linux wird automatisch `output: "standalone"` genutzt. Auf Windows ist Standalone deaktiviert.

### F) Start mit PM2

**Standalone (Linux):**

```bash
pm2 start ecosystem.config.cjs --only schnell-sicher-umzug
pm2 status
pm2 save
pm2 startup
```

Alternative: ohne Standalone (weniger “clean”, aber ok)

```bash
pm2 start npm --name schnell-sicher-umzug -- start
```

Bei Updates:

```bash
git pull
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run build
pm2 restart schnell-sicher-umzug
```

Oder als Ein-Befehl-Skript:

```bash
chmod +x scripts/hostinger-deploy.sh
./scripts/hostinger-deploy.sh deine-domain.de
```

### G) Nginx Reverse Proxy (Beispiel)

```nginx
server {
  server_name deine-domain.de;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

**Uploads außerhalb von `public/` (optional):** Nginx Alias

```nginx
location /uploads/ {
  alias /var/www/schnell/uploads/;
}
```

### H) SSL (Let’s Encrypt)

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d deine-domain.de
```

### I) Smoke-Test nach Deployment (Checkliste)

```bash
# 1) Basis
curl -I https://deine-domain.de/
curl -I https://deine-domain.de/buchen
curl -I https://deine-domain.de/admin/login

# 2) Slot API (Beispiel)
curl "https://deine-domain.de/api/slots?speed=STANDARD&from=2026-03-10&to=2026-03-12&durationMinutes=120"
```

Manuell im Browser prüfen:

1. `/buchen`: Service wählen -> Gegenstände wählen -> Slot wählen -> Anfrage senden.
2. `/admin/orders`: neuer Auftrag sichtbar.
3. Auftrag öffnen -> Status ändern.
4. CSV Export über `/admin/orders/export`.
5. Mobile/Tablet/Desktop kurz gegenprüfen (Header, Cards, Wizard Sidebar, Footer).

### J) Rollback (schnell)

```bash
pm2 logs schnell-sicher-umzug --lines 120
pm2 restart schnell-sicher-umzug
```

Falls nötig, letzte stabile Version aus Git auschecken und erneut `npm ci && npm run build && pm2 restart ...`.

---

## Wichtige Pfade

- Wizard: `/buchen`
- Admin: `/admin/*`
- API: `/api/orders`, `/api/slots`, `/api/geocode`
