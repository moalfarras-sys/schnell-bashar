import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { ORSDistanceError, resolveRouteDistance } from "@/server/distance/ors";
import {
  calculateLegacyPrice,
  type LegacyAddon,
  type LegacyPricing,
} from "@/server/calc/legacy-price";

export const runtime = "nodejs";

const priceCalcSchema = z.object({
  serviceType: z.enum(["UMZUG", "ENTSORGUNG", "KOMBI"]),
  speed: z.enum(["ECONOMY", "STANDARD", "EXPRESS"]),
  volumeM3: z.coerce.number().min(1).max(200),
  floors: z.coerce.number().min(0).max(10).default(0),
  hasElevator: z.boolean().optional().default(false),
  needNoParkingZone: z.boolean().default(false),
  addons: z
    .array(z.enum(["PACKING", "DISMANTLE_ASSEMBLE", "HALTEVERBOT", "ENTRUEMPELUNG"]))
    .default([]),
  fromAddress: z.string().optional(),
  toAddress: z.string().optional(),
});

function fallbackPricing(): LegacyPricing {
  return {
    movingBaseFeeCents: 19000,
    disposalBaseFeeCents: 14000,
    perM3MovingCents: 3400,
    perM3DisposalCents: 4800,
    stairsSurchargePerFloorCents: 2500,
    parkingSurchargeHardCents: 12000,
    uncertaintyPercent: 12,
    economyMultiplier: 0.9,
    standardMultiplier: 1.0,
    expressMultiplier: 1.3,
    perKmCents: 250,
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const parsed = priceCalcSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabedaten", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    serviceType,
    speed,
    volumeM3,
    floors,
    hasElevator,
    needNoParkingZone,
    addons,
    fromAddress,
    toAddress,
  } = parsed.data;

  const pricingDb = await prisma.pricingConfig.findFirst({
    where: { active: true },
    orderBy: { updatedAt: "desc" },
    select: {
      movingBaseFeeCents: true,
      disposalBaseFeeCents: true,
      perM3MovingCents: true,
      perM3DisposalCents: true,
      stairsSurchargePerFloorCents: true,
      parkingSurchargeHardCents: true,
      uncertaintyPercent: true,
      economyMultiplier: true,
      standardMultiplier: true,
      expressMultiplier: true,
      perKmCents: true,
    },
  });

  const pricing = pricingDb ?? fallbackPricing();

  let distanceKm: number | undefined;
  let distanceSource: "ors" | "cache" | undefined;
  if (
    (serviceType === "UMZUG" || serviceType === "KOMBI") &&
    fromAddress?.trim() &&
    toAddress?.trim()
  ) {
    try {
      const route = await resolveRouteDistance({
        from: { text: fromAddress.trim() },
        to: { text: toAddress.trim() },
        profile: "driving-car",
      });
      distanceKm = route.distanceKm;
      distanceSource = route.source;
        } catch (error) {
      console.error("[price/calc] distance lookup failed:", error);
      const errorMessage =
        error instanceof ORSDistanceError && error.code === "ORS_FORBIDDEN"
          ? "Die Distanzberechnung ist derzeit nicht verfuegbar (ORS-Zugriff abgelehnt). Bitte kontaktieren Sie uns kurz."
          : "Die Distanz konnte nicht berechnet werden. Bitte pruefen Sie die Adressen (inkl. PLZ).";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
  }

  const estimate = calculateLegacyPrice(
    {
      serviceType,
      speed,
      volumeM3,
      floors,
      hasElevator,
      needNoParkingZone,
      addons: addons as LegacyAddon[],
      distanceKm,
    },
    pricing,
    { distanceSource },
  );

  return NextResponse.json({
    priceNet: estimate.priceNet,
    vat: estimate.vat,
    priceGross: estimate.priceGross,
    breakdown: estimate.breakdown,
  });
}

