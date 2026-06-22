# Vercel + Supabase Umstellung

## Zielzustand
Die App läuft lokal weiter mit JSON-Fallback, ist aber für Vercel + Supabase vorbereitet.

Wenn beide Supabase-ENV-Variablen gesetzt sind, nutzt die App Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_PDF_BUCKET=pdf-documents
ADMIN_PASSWORD=ein-sicheres-passwort
ADMIN_SESSION_SECRET=ein-langer-zufaelliger-secret
```

Wenn `NEXT_PUBLIC_SUPABASE_URL` oder `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` fehlen, nutzt die App lokal weiter:

```text
src/data/companies.json
src/data/customers.json
src/data/jobs.json
src/data/counters.json
```

Keys werden nicht hardcodiert. `.env.local` wird nicht committet.

## Firmen
Aktuelle `companyId`s:

```text
punktlich-umzuege
schnell-sicher-umzug
```

Firma 2 wird in PDFs so dargestellt:

```text
Schnell Sicher Umzug
Bashar Transport – Inhaber: Baschar Al Hasan
```

## Supabase Tabellen erstellen
1. Supabase Dashboard öffnen.
2. SQL Editor öffnen.
3. Inhalt von `supabase/schema.sql` ausführen.
4. Danach Inhalt von `supabase/seed.sql` ausführen.

Tabellen:

```text
companies
customers
jobs
documents
document_counters
```

Die Policies in `schema.sql` sind für den Browser geschlossen. Produktiv läuft der Zugriff über den Server mit `SUPABASE_SERVICE_ROLE_KEY`. Diesen Key niemals mit `NEXT_PUBLIC_` prefix setzen und niemals im Client verwenden.

## Vercel Deployment
1. Projekt zu GitHub pushen.
2. In Vercel neues Projekt importieren.
3. Environment Variables setzen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `ADMIN_PASSWORD`
4. Build Command:
   - `npm run build`
5. Start erfolgt automatisch über Vercel.

## Warum JSON nicht produktiv auf Vercel
Vercel Functions haben kein dauerhaftes beschreibbares Dateisystem für App-Daten. JSON-Dateien im Repository eignen sich für lokale Seeds und Entwicklung, aber nicht für produktive Kunden-, Auftrags- oder Rechnungsdaten.

Produktiv muss Supabase genutzt werden.

## PDF-Ausgabe
Lokal werden PDFs getrennt gespeichert:

```text
output/
  punktlich-umzuege/
    angebote/
    vertraege/
    rechnungen/
  schnell-sicher-umzug/
    angebote/
    vertraege/
    rechnungen/
```

Wenn `SUPABASE_PDF_BUCKET` gesetzt ist, speichert die App generierte PDFs zusätzlich in Supabase Storage und schreibt den Storage-Pfad in `documents.pdf_path`. Ohne Bucket bleibt der direkte Download funktionsfähig, aber Vercel-Dateien unter `/tmp` sind nicht dauerhaft.

## Login
Wenn `ADMIN_PASSWORD` gesetzt ist, schützt Middleware Dashboard, Print-Routen und APIs.

Lokal ohne `ADMIN_PASSWORD` bleibt die Entwicklung offen, damit das Projekt weiter ohne Blockade getestet werden kann.
