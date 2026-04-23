# Domain-Migration zu Vercel

## Ziel-Domains

- `schnellsicherumzug.de`
- `www.schnellsicherumzug.de`

Canonical Host:

- `https://schnellsicherumzug.de`

## Schritte in Vercel

1. Git-Repository in Vercel importieren.
2. Neues Vercel Project erstellen.
3. Framework Preset automatisch auf Next.js prüfen.
4. Umgebungsvariablen aus `.env.example` in Project Settings eintragen.
5. Unter `Project Settings > Domains` beide Domains hinzufügen:
   - `schnellsicherumzug.de`
   - `www.schnellsicherumzug.de`

## DNS-Hinweise

- Vercel Project Settings > Domains ist die Quelle der Wahrheit.
- Für die Apex-Domain wird normalerweise ein `A`-Record verwendet.
- Für `www` wird normalerweise ein `CNAME` verwendet.
- Die exakten Zielwerte immer direkt aus Vercel übernehmen.
- Alte konfliktierende Hostinger-/VPS-A- oder CNAME-Records entfernen.
- MX- und TXT-Records für E-Mail nicht löschen.
- Vercel hostet keine E-Mail-Postfächer.

## Prüfung

```bash
dig A schnellsicherumzug.de +short
dig CNAME www.schnellsicherumzug.de +short
```

## Nach DNS-Umstellung

1. Auf Propagation warten.
2. SSL-Zertifikat in Vercel prüfen.
3. Beide URLs testen:
   - `https://schnellsicherumzug.de`
   - `https://www.schnellsicherumzug.de`
4. Sicherstellen, dass `www` per Redirect auf Apex geht.
