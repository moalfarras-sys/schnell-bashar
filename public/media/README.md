# Public Media

Diese Dateien sind produktive, öffentliche Website-Assets für `schnellsicherumzug.de`.

## Struktur
- `brand/`
  - öffentliche Branding-Dateien wie Logo oder sichtbare Stempelgrafiken
- `gallery/`
  - Hero-, Galerie- und Servicebilder für Marketing-Seiten

## Regeln
- Keine privaten PDFs, Signatur-Snapshots oder Kundendokumente hier speichern.
- Keine Runtime-Uploads für den Live-Betrieb in diesem Ordner ablegen.
- Öffentliche Website-Bilder bleiben in `public/media`.
- Admin-Uploads für die Mediathek laufen produktiv über `Supabase Storage` (`media-public`), nicht über das lokale Dateisystem.

## Hinweis
- Gelöschte Altdateien wie `gallery/1.jpeg`, `gallery/2.jpeg` und alte Signaturdateien wurden bewusst aus dem öffentlichen Bestand entfernt.
- Verweise auf diese Dateien müssen durch aktuelle Assets ersetzt werden.
