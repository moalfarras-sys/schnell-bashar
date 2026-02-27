import { NextResponse } from "next/server";
import { z } from "zod";

import { calculateQuote } from "@/server/quotes/calculate-quote";
import { calcInputSchema, mapCalcInputToQuoteDraft } from "@/server/pricing/calc-input";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const parsed = calcInputSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const firstFieldError = Object.values(flattened.fieldErrors)
      .flat()
      .find((msg): msg is string => typeof msg === "string" && msg.length > 0);

    return NextResponse.json(
      { error: firstFieldError || "Ungültige Eingabedaten", details: flattened },
      { status: 400 },
    );
  }

  const draft = mapCalcInputToQuoteDraft(parsed.data);

  try {
    const { result } = await calculateQuote(draft, { allowDistanceFallback: false });
    return NextResponse.json({
      serviceCart: result.serviceCart,
      servicesBreakdown: result.servicesBreakdown,
      lineItems: result.lineItems,
      packages: result.packages,
      totals: {
        tier: result.packageSpeed,
        minCents: result.priceMinCents,
        maxCents: result.priceMaxCents,
        netCents: result.netCents,
        vatCents: result.vatCents,
        grossCents: result.grossCents,
      },
      priceNet: result.netCents,
      vat: result.vatCents,
      priceGross: result.grossCents,
      breakdown: {
        laborHours: result.laborHours,
        distanceKm: result.distanceKm,
        distanceSource: result.distanceSource,
        driveChargeCents: result.driveCostCents,
        subtotalCents: result.subtotalCents,
        serviceOptionsCents: result.breakdown?.serviceOptionsCents,
        addonsCents: result.breakdown?.addonsCents,
        minimumOrderAppliedCents: result.breakdown?.minimumOrderAppliedCents,
        discountCents: result.breakdown?.discountCents,
        totalCents: result.totalCents,
      },
    });
  } catch (error) {
    const isValidationError = error instanceof z.ZodError;
    let message = isValidationError
      ? (error.issues.find((issue) => issue.message)?.message ?? "Ungültige Eingabedaten")
      : error instanceof Error
        ? error.message
        : "Preisberechnung fehlgeschlagen.";
    if (/address not found/i.test(message)) {
      message =
        "Adresse konnte nicht eindeutig gefunden werden. Bitte prüfen Sie PLZ/Straße oder wählen Sie einen Vorschlag aus.";
    }
    const status = isValidationError
      ? 400
      : /nicht verfügbar|Distanz/i.test(message)
        ? 503
        : /Adresse konnte nicht eindeutig gefunden/i.test(message)
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

