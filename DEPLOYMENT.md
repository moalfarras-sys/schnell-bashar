# Deployment auf Vercel

## Ziel

Produktionsdeployment für `schnellsicherumzug.de` und `www.schnellsicherumzug.de` auf Vercel.

## Technische Basis

- Framework: Next.js 16 App Router
- Package Manager: npm
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `.next`
- Node Runtime: erforderlich für PDF-, Download- und Signatur-Routen
- Datenbank: PostgreSQL
- ORM: Prisma
- Storage: Supabase Storage

## Erforderliche Umgebungsvariablen

Mindestens:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SITE_URL=https://schnellsicherumzug.de`
- `NEXT_PUBLIC_BASE_URL=https://schnellsicherumzug.de`
- `SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Für E-Mail:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

Für Dokumente:

- `SIGNING_TOKEN_SECRET`
- `PDF_RENDER_SECRET`

Optional lokal oder außerhalb Vercel:

- `PUPPETEER_EXECUTABLE_PATH`

## Datenbank-Migration

Vor dem Go-Live:

1. Produktions-PostgreSQL bereitstellen.
2. `DATABASE_URL` und `DIRECT_URL` setzen.
3. `npm run prisma:generate`
4. `npm run prisma:deploy`

Hinweis:

- Die Migration `prisma/migrations/20260423143000_add_document_workflow/` ergänzt das neue Dokument- und Signaturmodell.
- `prisma migrate dev` war in dieser Umgebung nicht vollständig ausführbar, deshalb wurde die Migration als SQL-Datei angelegt und Prisma Client erfolgreich neu generiert.

## Storage Setup

Empfohlene Buckets:

- `documents-private`
- `signed-documents-private`
- `expense-receipts`
- optional `media-public`

Regeln:

- keine privaten PDFs in `public/`
- keine Runtime-Uploads auf lokalem Dateisystem in Produktion
- `/tmp` nur temporär während der Request-Verarbeitung

## Admin Setup

- Admin-Zugang ist cookie-/JWT-basiert
- `ADMIN_PASSWORD_HASH` verwenden, kein Klartext-Passwort
- alle neuen Dokumentrouten sind Admin-geschützt

## PDF Setup

- Architektur: HTML/CSS Templates + `puppeteer-core` + `@sparticuz/chromium-min`
- auf Vercel serverseitig rendern
- lokal für Sample-Generierung `PUPPETEER_EXECUTABLE_PATH` setzen

## Post-Deploy Checks

1. `https://schnellsicherumzug.de` lädt
2. `https://www.schnellsicherumzug.de` leitet auf Apex um
3. `/robots.txt` und `/sitemap.xml` sind erreichbar
4. `/booking` funktioniert mobil
5. Admin-Login funktioniert
6. Dokument anlegen, bearbeiten und PDF generieren
7. Unterschrift erst nach Admin-Freigabe möglich

## Rollback

- vorige Vercel-Deployment-Version wiederherstellen
- keine Datenbank-Rollbacks ohne Migrationsprüfung durchführen
- bei Dokument-Workflow-Problemen Signaturfreigaben widerrufen und Tokens invalidieren
