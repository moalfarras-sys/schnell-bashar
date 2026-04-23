# Admin Signature Approval Workflow

## Ziel

Keine Kundensignatur vor administrativer Prüfung.

## Freigaberegeln

Ein Kunde kann nur unterschreiben, wenn:

- ein aktiver Token vorliegt
- der Token nicht abgelaufen ist
- der Token nicht verwendet wurde
- das Dokument `approvedAt` und `approvedByUserId` hat
- `customerSignatureEnabled === true`
- die aktuelle Dokumentversion mit dem genehmigten Hash übereinstimmt

## Admin-Ablauf

1. Dokumententwurf öffnen
2. Inhalte prüfen und finalisieren
3. `Zur Unterschrift freigeben` klicken
4. System setzt:
   - Dokumentstatus auf `SIGNATURE_PENDING`
   - aktuelle Version auf `ADMIN_APPROVED`
   - `approvedAt`
   - `approvedByUserId`
   - `customerSignatureEnabled = true`
   - neuen Signing Token
5. Admin kann den Link weitergeben

## Bearbeitung nach Freigabe

Wenn das Dokument nach der Freigabe geändert wird:

- alte Tokens werden auf `SUPERSEDED` gesetzt
- alte Version wird `SUPERSEDED`
- Dokument fällt zurück in einen Entwurfszustand
- neue Freigabe ist zwingend erforderlich

## Kundenseite

Die Signaturseite blockiert nicht freigegebene Dokumente und zeigt eine Wartemeldung auf Deutsch.
