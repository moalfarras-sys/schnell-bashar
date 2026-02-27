# Pricing/Booking Audit – 2026-02-27

## Gefundene Ursachen
- Uneinheitliche Pricing-Ladepfade (Quote/Calc/Order nutzten nicht konsequent dieselbe Runtime-Quelle).
- Addon-/ServiceOption-Übernahme war zwischen `/preise` und `/booking` nicht vollständig synchronisiert.
- Antwortmodell aus `/api/price/calc` war nicht durchgehend mit Line-Items versehen.

## Umgesetzte Fixes
- Neue zentrale Runtime-Pricing-Ladeebene mit Cache/Invalidierung:
  - `src/server/pricing/runtime-config.ts`
- Einheitliche Berechnungskette auf Runtime-Config umgestellt:
  - `src/server/quotes/calculate-quote.ts`
  - `src/app/api/price/calc/route.ts`
  - `src/app/api/orders/route.ts`
- Pricing-Engine um `lineItems` erweitert:
  - `src/server/calc/estimate.ts`
- Quote/Booking-Hydration inklusive `selectedServiceOptions` durchgezogen:
  - `src/app/booking-v2/booking-v2-client.tsx`
  - `src/app/booking-v2/components/types.ts`
  - `src/app/booking-v2/lib/pricing.ts`
- Schema-Antwort angepasst:
  - `src/domain/quote/schema.ts`

## Tests
- Unit ergänzt:
  - `src/server/calc/estimate.test.ts` (PACKING/Addons + LineItems)
- Mapping-Tests bestehen weiterhin:
  - `src/server/pricing/calc-input.test.ts`

## Ergebnis
- Für denselben Input nutzen `/preise` und `/booking` denselben serverseitigen Pricing-Pfad.
- Live-Kalkulation liefert konsistente Breakdown-Werte inklusive `lineItems`.
