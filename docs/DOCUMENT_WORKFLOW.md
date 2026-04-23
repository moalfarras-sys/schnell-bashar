# Document Workflow

## Grundablauf

1. Kunde sendet Anfrage oder Booking.
2. Anfrage wird als Datensatz gespeichert.
3. Admin erstellt daraus einen Dokumententwurf oder legt ein Dokument manuell an.
4. Dokument bleibt zunächst im Status `DRAFT` oder `INTERNAL_REVIEW`.
5. Admin bearbeitet Inhalte, Positionen und Konditionen.
6. Erst nach ausdrücklicher Freigabe wird ein Signatur-Link erstellt.
7. Kunde kann nur die freigegebene, eingefrorene Version bestätigen.

## Typischer Geschäftsablauf

1. Anfrage
2. Angebot
3. Angebotsannahme
4. Auftrag / Vertrag
5. Admin-Freigabe zur Unterschrift
6. Signatur
7. Leistungserbringung
8. Rechnung
9. Mahnung bei Bedarf

## Website-Anfrage zu Dokument

- `Order` bleibt der originäre Anfrage-Datensatz
- daraus wird ein `Document`-Entwurf erstellt
- Kundendaten, Leistungsdaten und Adressen werden vorbefüllt
- Preiswerte bleiben editierbar

## Manueller Modus

Der Admin kann Dokumente vollständig manuell anlegen:

- Kunde
- Leistungsart
- Adressen
- Positionen
- Fälligkeit
- Notizen
- AGB-Anhang
