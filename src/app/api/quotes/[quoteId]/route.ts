import { NextResponse } from "next/server";
import { z } from "zod";

import {
  QuoteAddressSchema,
  QuotePackageSpeedSchema,
  QuoteServiceContextSchema,
  QuoteServiceOptionSchema,
} from "@/domain/quote/schema";
import { getQuoteByPublicId, updateQuote } from "@/server/quotes/service";

export const runtime = "nodejs";

const patchSchema = z.object({
  serviceContext: QuoteServiceContextSchema.optional(),
  packageSpeed: QuotePackageSpeedSchema.optional(),
  volumeM3: z.number().min(1).max(200).optional(),
  floors: z.number().int().min(0).max(10).optional(),
  hasElevator: z.boolean().optional(),
  needNoParkingZone: z.boolean().optional(),
  fromAddress: QuoteAddressSchema.optional(),
  toAddress: QuoteAddressSchema.optional(),
  extras: z
    .object({
      packing: z.boolean().optional(),
      stairs: z.boolean().optional(),
      express: z.boolean().optional(),
      noParkingZone: z.boolean().optional(),
      disposalBags: z.boolean().optional(),
    })
    .optional(),
  selectedServiceOptions: z.array(QuoteServiceOptionSchema).optional(),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ quoteId: string }> },
) {
  const { quoteId } = await context.params;
  const snapshot = await getQuoteByPublicId(quoteId);
  if (!snapshot) {
    return NextResponse.json({ error: "Angebot nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({ snapshot });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ quoteId: string }> },
) {
  const { quoteId } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const parsed = z.object({ draft: patchSchema }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabedaten", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const snapshot = await updateQuote(quoteId, parsed.data.draft);
    if (!snapshot) {
      return NextResponse.json({ error: "Angebot nicht gefunden oder abgelaufen." }, { status: 404 });
    }
    return NextResponse.json({ snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Angebot konnte nicht aktualisiert werden.";
    const status = /nicht verfügbar|Distanz/.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
