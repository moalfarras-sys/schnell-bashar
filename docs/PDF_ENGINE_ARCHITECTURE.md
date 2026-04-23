# PDF Engine Architecture

## Gewählte Architektur

- HTML/CSS Templates
- serverseitiges Rendering
- `puppeteer-core` + `@sparticuz/chromium-min`
- `pdf-lib` nur für Merge/Appendix

## Warum diese Architektur

- bessere visuelle Qualität als reines `pdfkit`
- sauberere Wartbarkeit für deutsche Geschäftsdokumente
- bessere Kontrolle über A4, Seitenumbrüche, Tabellen und Signaturblöcke
- einfacher erweiterbar für neue Dokumenttypen
- Vercel-kompatibel mit Node Runtime

## Unterstützte Dokumenttypen

- Angebot
- Rechnung
- Auftrag / Vertrag
- Mahnung
- Kurz-AGB / Zusatzseite

## Rendering Pipeline

1. Admin erstellt oder bearbeitet Dokumentdaten.
2. Daten werden versioniert gespeichert.
3. HTML-Template wird aus Snapshot gerendert.
4. Chromium rendert PDF serverseitig.
5. Optional wird eine AGB-Zusatzseite per `pdf-lib` angehängt.
6. Finale PDF-Datei wird privat gespeichert oder als Response ausgeliefert.

## Storage-Strategie

- private PDFs nicht in `public/`
- Speicherung über Supabase Storage
- Download nur über geschützte API-Routen
- `/tmp` nur temporär während des Requests

## Lokale Generierung

Für lokale Sample-PDFs ist aktuell `PUPPETEER_EXECUTABLE_PATH` erforderlich.

## Neue Dokumenttypen hinzufügen

1. Typ in Prisma/Zod/Types ergänzen
2. Nummernpräfix definieren
3. neues Template unter `src/lib/documents/templates/` anlegen
4. `renderer.ts` erweitern
5. Admin-Auswahl und Validierung ergänzen
