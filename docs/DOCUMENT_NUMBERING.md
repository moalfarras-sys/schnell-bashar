# Document Numbering

## Formate

- Angebot: `ANG-2026-0001`
- Rechnung: `RE-2026-0001`
- Auftrag / Vertrag: `AUF-2026-0001`
- Mahnung: `MAH-2026-0001`

## Regeln

- Präfix pro Dokumenttyp
- Jahresbezug im Nummernkreis
- fortlaufende Nummer pro Jahr und Typ
- keine Wiederverwendung gelöschter Nummern

## Technische Umsetzung

- Modell: `DocumentNumberSequence`
- Erzeugung in Transaktion
- Speicherung des letzten Counters pro Jahr und Typ
