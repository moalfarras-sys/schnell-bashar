# Schnell Sicher Umzug

Next.js 16 App Router Projekt für `schnellsicherumzug.de` mit:

- öffentlicher Website auf Deutsch
- Booking- und Anfrage-Workflow
- Admin-Bereich mit Cookie/JWT-Session
- PostgreSQL + Prisma
- Supabase Storage für Dokumente und Medien
- Dokumentensystem für Angebot, Rechnung, Auftrag/Vertrag und Mahnung
- Admin-Freigabe vor jeder Kundensignatur

## Lokale Entwicklung

```bash
npm ci
npm run prisma:generate
npx tsc --noEmit
npm run dev
```

Erforderlich:

- laufende PostgreSQL-Datenbank
- `.env` auf Basis von `.env.example`
- optional `PUPPETEER_EXECUTABLE_PATH` für lokale HTML/CSS-PDF-Generierung

## Wichtige Scripts

```bash
npm run dev
npm run build
npm run lint
npx tsc --noEmit
npm run prisma:generate
npm run prisma:deploy
npm run pdf:samples:documents
```

## Produktion

- Zielplattform: Vercel
- Canonical Host: `https://schnellsicherumzug.de`
- `www.schnellsicherumzug.de` wird per Middleware auf Apex umgeleitet
- Dokumente und private PDFs gehören nicht nach `public/`

## Dokument-Workflow

1. Kunde sendet Anfrage oder Booking.
2. Admin prüft die Anfrage.
3. Admin erstellt oder bearbeitet Dokumententwurf.
4. Nur nach Klick auf `Zur Unterschrift freigeben` wird ein Signatur-Link erzeugt.
5. Jede Änderung nach der Freigabe invalidiert alte Tokens und erfordert neue Freigabe.

Siehe auch:

- `docs/AUDIT_CURRENT_ARCHITECTURE.md`
- `docs/DOCUMENT_WORKFLOW.md`
- `docs/ADMIN_SIGNATURE_APPROVAL_WORKFLOW.md`
- `docs/PDF_ENGINE_ARCHITECTURE.md`
- `DEPLOYMENT.md`
