# Audit Report: Preisrechner/Booking Konsistenz und Pricing-Härtung

Datum: 2026-02-27
Branch: `release/theme-media-booking-v1`

## Zusammenfassung
Diese Korrektur beseitigt Inkonsistenzen zwischen `/preise` und `/booking`, stellt eine zentrale Preislogik-Nutzung sicher und behebt fehlende Preisanteile (insbesondere Packservice/Addons) in der Live-Kalkulation.

## Gefundene Probleme (Root Cause)

1. **Addons wurden in `/api/price/calc` nicht in das Quote-Domainmodell gemappt**
- Symptom: Packservice und weitere Addons änderten den Preis in Booking nicht zuverlässig.
- Root Cause: Endpoint nutzte lokales Mapping ohne `addons`-Übernahme.
- Dateien:
  - `src/app/api/price/calc/route.ts`

2. **Doppelte Mapping-Logik für Calc-Input erhöhte Drift-Risiko zwischen Flows**
- Symptom: Preisrechner und Booking konnten bei gleichen Eingaben unterschiedliche Ergebnisse liefern.
- Root Cause: Input-Normalisierung/Context- und Extras-Mapping war nur endpoint-lokal vorhanden.
- Dateien:
  - `src/app/api/price/calc/route.ts`

3. **Booking überschrieb Etage/Aufzug implizit über `extras.stairs`**
- Symptom: Nach Quote-Übernahme wurden Zugangsdaten nicht konsistent weitergeführt.
- Root Cause: Calc-/Submit-Payload verwendete harte Ableitung `stairs ? 2 : 0` und `hasElevator=false`.
- Dateien:
  - `src/app/booking-v2/booking-v2-client.tsx`
  - `src/app/booking-v2/components/types.ts`

4. **Breakdown zeigte Addons nicht transparent an**
- Symptom: Gesamtpreis konnte sich ändern, aber Zeile „Serviceoptionen“ spiegelte nicht alle Zuschläge wider.
- Root Cause: UI addierte nur `serviceOptionsCents`, nicht `addonsCents`.
- Dateien:
  - `src/app/booking-v2/components/live-price-engine.tsx`
  - `src/app/booking-v2/lib/pricing.ts`

## Umgesetzte Fixes

1. **Zentrales Calc-Input-Mapping eingeführt**
- Neu: `src/server/pricing/calc-input.ts`
- Enthält:
  - `calcInputSchema`
  - `mapCalcInputToQuoteDraft(...)`
  - einheitliches Context-/Adress-/Extras-/Addons-Mapping

2. **`/api/price/calc` auf Shared-Mapping refaktoriert**
- Endpoint nutzt jetzt ausschließlich `calcInputSchema` + `mapCalcInputToQuoteDraft`.
- Zusätzliche Breakdown-Felder werden zurückgegeben (`addonsCents`, `serviceOptionsCents`, etc.).

3. **QuoteResult um Breakdown erweitert**
- `src/domain/quote/schema.ts` erweitert.
- `src/server/quotes/calculate-quote.ts` gibt nun strukturiertes `breakdown` zurück.

4. **Booking-Zustand und Recalc-Trigger korrigiert**
- `BookingDraft` erweitert um `floors`, `hasElevator`.
- Quote-Hydration übernimmt beide Felder.
- Calc-/Patch-/Submit-Payload verwendet diese Felder konsistent.
- Dependencies für Live-Recalc enthalten jetzt `floors`, `hasElevator`.

5. **Live-Breakdown korrigiert**
- „Serviceoptionen“ = `serviceOptionsCents + addonsCents`.

## Automatisierte Tests

### Unit
- `src/server/pricing/calc-input.test.ts` (neu)
  - prüft Addons/Extras-Mapping (u.a. Packservice)
  - prüft konsistente Etage/Aufzug-Übernahme

### E2E
- `e2e/booking-extras.spec.ts` (neu)
  - validiert: Packservice-Interaktion aktualisiert Live-Preis
- `e2e/booking-volume.spec.ts` (bestehend)
  - validiert: Volumenänderung aktualisiert Live-Preis

## Ausgeführte QA-Gates

- `npm run lint` -> PASS
- `npm run text:scan-transliteration` -> PASS
- `npm run test:unit` -> PASS
- `npm run build` -> PASS (lokal mit erwartbarer externer DB-Erreichbarkeitswarnung `P1001` in statischen Build-Phasen)
- `npx playwright test e2e/booking-volume.spec.ts e2e/booking-extras.spec.ts` -> PASS

## Manuelle QA-Checkliste

- [PASS] Preis in `/booking` ändert sich bei Volumen-Slider
- [PASS] Preis in `/booking` ändert sich beim Toggle von Packservice
- [PASS] Breakdown zeigt Serviceoptionen inkl. Addons konsistent
- [PASS] Quote-Hydration übernimmt Volumen/Adress-/Extras-Daten
- [PASS] Recalc bei Draft-Änderung triggert ohne stale UI

## Annahmen

1. Addons-Mapping:
- `PACKING` -> `extras.packing`
- `DISMANTLE_ASSEMBLE` -> `extras.stairs`
- `OLD_KITCHEN_DISPOSAL`/`BASEMENT_ATTIC_CLEARING` -> `extras.disposalBags`

2. DB-Verbindungswarnungen im lokalen Build sind Umgebungs-/Netzwerkabhängig und kein Rechenlogikfehler.
