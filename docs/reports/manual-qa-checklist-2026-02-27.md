# Manual QA Checklist – 2026-02-27

## Gates
- [x] `npm run lint`
- [x] `npm run text:scan-mojibake`
- [x] `npm run text:scan-transliteration`
- [x] `npm run build`
- [x] `npm run test:unit`

## Booking/Pricing
- [x] Volumen-Änderungen beeinflussen Preis in Engine-Tests.
- [x] Addons (inkl. PACKING) beeinflussen Preis in Engine-Tests.
- [x] Quote/Booking-Flow nutzt zentralen Pricing-Runtime-Pfad.

## Admin Accounting
- [x] Ausgaben-CRUD APIs vorhanden.
- [x] Monats-CSV Export vorhanden.
- [x] Quartalsbericht JSON/PDF/CSV vorhanden.
- [x] Nav/Dashboard-Verlinkung auf neue Module vorhanden.

## Hinweise
- Lokaler Build zeigt erwartete DB-Erreichbarkeits-Logs bei fehlender Supabase-Verbindung im Build-Umfeld.
- VPS-Deployment ist als separater Schritt erforderlich.
