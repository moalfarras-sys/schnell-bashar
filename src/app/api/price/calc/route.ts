import { NextResponse } from "next/server";
import { z } from "zod";

import type { QuoteDraft } from "@/domain/quote/types";
import { calculateQuote } from "@/server/quotes/calculate-quote";

export const runtime = "nodejs";

const serviceKindSchema = z.enum(["UMZUG", "MONTAGE", "ENTSORGUNG", "SPECIAL"]);
const speedSchema = z.enum(["ECONOMY", "STANDARD", "EXPRESS"]);

const inputSchema = z.object({
  serviceType: z.enum(["UMZUG", "ENTSORGUNG", "KOMBI", "MONTAGE", "SPECIAL"]).default("UMZUG"),
  serviceCart: z
    .array(
      z.object({
        kind: serviceKindSchema,
      }),
    )
    .default([]),
  speed: speedSchema.default("STANDARD"),
  volumeM3: z.coerce.number().min(1).max(200).default(12),
  floors: z.coerce.number().int().min(0).max(10).default(0),
  hasElevator: z.boolean().default(false),
  needNoParkingZone: z.boolean().default(false),
  selectedServiceOptions: z
    .array(
      z.object({
        code: z.string().trim().min(2).max(80),
        qty: z.coerce.number().int().min(1).max(50),
      }),
    )
    .default([]),
  fromAddress: z.string().trim().optional(),
  toAddress: z.string().trim().optional(),
  fromAddressObject: z
    .object({
      displayName: z.string(),
      postalCode: z.string(),
      city: z.string(),
      state: z.string().optional(),
      street: z.string().optional(),
      houseNumber: z.string().optional(),
      lat: z.number().optional(),
      lon: z.number().optional(),
    })
    .optional(),
  toAddressObject: z
    .object({
      displayName: z.string(),
      postalCode: z.string(),
      city: z.string(),
      state: z.string().optional(),
      street: z.string().optional(),
      houseNumber: z.string().optional(),
      lat: z.number().optional(),
      lon: z.number().optional(),
    })
    .optional(),
});

function inferContext(
  serviceType: z.infer<typeof inputSchema>["serviceType"],
  serviceCart: z.infer<typeof inputSchema>["serviceCart"],
): QuoteDraft["serviceContext"] {
  const kinds = new Set(serviceCart.map((item) => item.kind));
  if (kinds.has("MONTAGE") && kinds.size === 1) return "MONTAGE";
  if (kinds.has("ENTSORGUNG") && kinds.size === 1) return "ENTSORGUNG";
  if (kinds.has("SPECIAL") && kinds.size === 1) return "SPEZIALSERVICE";
  if (kinds.has("UMZUG") && kinds.has("ENTSORGUNG")) return "COMBO";
  if (serviceType === "MONTAGE") return "MONTAGE";
  if (serviceType === "ENTSORGUNG") return "ENTSORGUNG";
  if (serviceType === "SPECIAL") return "SPEZIALSERVICE";
  if (serviceType === "KOMBI") return "COMBO";
  return "MOVING";
}

function toAddressObject(
  rawText: string | undefined,
  objectAddress: z.infer<typeof inputSchema>["fromAddressObject"] | undefined,
) {
  if (objectAddress) return objectAddress;
  if (!rawText?.trim()) return undefined;
  const value = rawText.trim();
  const plz = value.match(/\b\d{5}\b/)?.[0] ?? "";
  return {
    displayName: value,
    postalCode: plz,
    city: "Unbekannt",
    street: value,
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabedaten", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const context = inferContext(parsed.data.serviceType, parsed.data.serviceCart);
  const draft: QuoteDraft = {
    serviceContext: context,
    packageSpeed: parsed.data.speed,
    volumeM3: parsed.data.volumeM3,
    floors: parsed.data.floors,
    hasElevator: parsed.data.hasElevator,
    needNoParkingZone: parsed.data.needNoParkingZone,
    fromAddress: toAddressObject(parsed.data.fromAddress, parsed.data.fromAddressObject),
    toAddress: toAddressObject(parsed.data.toAddress, parsed.data.toAddressObject),
    extras: {
      packing: false,
      stairs: parsed.data.floors > 0 && !parsed.data.hasElevator,
      express: parsed.data.speed === "EXPRESS",
      noParkingZone: parsed.data.needNoParkingZone,
      disposalBags: false,
    },
    selectedServiceOptions: parsed.data.selectedServiceOptions,
  };

  try {
    const { result } = await calculateQuote(draft);
    return NextResponse.json({
      serviceCart: result.serviceCart,
      servicesBreakdown: result.servicesBreakdown,
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
        totalCents: result.totalCents,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preisberechnung fehlgeschlagen.";
    const status = /nicht verfügbar|Distanz/.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
