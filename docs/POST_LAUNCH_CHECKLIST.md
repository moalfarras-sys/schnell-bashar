# Post Launch Checklist

## Technik

- `npm run build` in CI/Vercel erfolgreich
- Datenbank erreichbar
- Prisma Migrationen angewendet
- Supabase Storage Buckets vorhanden
- keine Secrets im Repository

## Website

- Startseite lädt
- `/umzug`, `/entsorgung`, `/montage`, `/preise`, `/booking` laden
- Mobilansicht prüfen
- keine Query-URLs in Hauptnavigation
- `robots.txt` und `sitemap.xml` erreichbar

## Admin & Dokumente

- Admin-Login funktioniert
- Dokument manuell anlegen
- Dokument aus Anfrage erzeugen
- PDF generieren
- Signaturfreigabe erzeugen
- alte Signaturtokens nach Bearbeitung werden ungültig

## SEO

- Canonical Host ist Apex
- Search Console Sitemap eingereicht
- Kernseiten indexierbar
- private Seiten nicht in Sitemap

## Recht & Betrieb

- Impressum geprüft
- Datenschutz geprüft
- AGB geprüft
- Unternehmensdaten, IBAN, BIC, Steuerdaten final bestätigt
