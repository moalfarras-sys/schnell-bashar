import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { ORSDistanceError, resolveRouteDistance } from "@/server/distance/ors";
import {
  calculateLegacyPrice,
  type LegacyAddon,
  type LegacyPricing,
} from "@/server/calc/legacy-price";
import { estimateOrder } from "@/server/calc/estimate";
import type { WizardPayload } from "@/lib/wizard-schema";

export const runtime = "nodejs";

const priceCalcSchema = z.object({
  serviceType: z.enum(["UMZUG", "ENTSORGUNG", "KOMBI", "MONTAGE"]),
  speed: z.enum(["ECONOMY", "STANDARD", "EXPRESS"]),
  volumeM3: z.coerce.number().min(1).max(200),
  floors: z.coerce.number().min(0).max(10).default(0),
  hasElevator: z.boolean().optional().default(false),
  needNoParkingZone: z.boolean().default(false),
  addons: z
    .array(z.enum(["PACKING", "DISMANTLE_ASSEMBLE", "HALTEVERBOT", "ENTRUEMPELUNG"]))
    .default([]),
  selectedServiceOptions: z
    .array(
      z.object({
        code: z.string().trim().min(2).max(80),
        qty: z.coerce.number().int().min(1).max(50).default(1),
      }),
    )
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
    selectedServiceOptions,
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
      hourlyRateCents: true,
      currency: true,
      heavyItemSurchargeCents: true,
      carryDistanceSurchargePer25mCents: true,
      parkingSurchargeMediumCents: true,
      elevatorDiscountSmallCents: true,
      elevatorDiscountLargeCents: true,
      montageBaseFeeCents: true,
      montageStandardMultiplier: true,
      montagePlusMultiplier: true,
      montagePremiumMultiplier: true,
      montageMinimumOrderCents: true,
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
          ? "Die Distanzberechnung ist derzeit nicht verfügbar (ORS-Zugriff abgelehnt). Bitte kontaktieren Sie uns kurz."
          : "Die Distanz konnte nicht berechnet werden. Bitte prüfen Sie die Adressen (inkl. PLZ).";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
  }

  if (serviceType === "MONTAGE") {
    const montageOptions = await prisma.serviceOption.findMany({
      where: {
        active: true,
        deletedAt: null,
        module: { slug: "MONTAGE", active: true, deletedAt: null },
      },
      select: {
        code: true,
        pricingType: true,
        defaultPriceCents: true,
        defaultLaborMinutes: true,
        isHeavy: true,
        requiresQuantity: true,
      },
    });

    const payload: WizardPayload = {
      bookingContext: "MONTAGE",
      packageTier: "PLUS",
      serviceType: "MOVING",
      addons: [],
      selectedServiceOptions: selectedServiceOptions.map((item) => ({
        code: item.code,
        qty: Math.max(1, item.qty || 1),
      })),
      pickupAddress: undefined,
      startAddress: undefined,
      destinationAddress: undefined,
      accessPickup: undefined,
      accessStart: undefined,
      accessDestination: undefined,
      itemsMove: {},
      itemsDisposal: {},
      disposal: undefined,
      timing: {
        speed,
        requestedFrom: new Date().toISOString(),
        requestedTo: new Date().toISOString(),
        preferredTimeWindow: "FLEXIBLE",
        jobDurationMinutes: 120,
      },
      customer: {
        name: "Kunde",
        phone: "+49",
        email: "kunde@example.com",
        contactPreference: "EMAIL",
        note: "",
      },
    };

    const estimate = estimateOrder(
      payload,
      {
        catalog: [],
        pricing: {
          currency: pricingDb?.currency ?? "EUR",
          movingBaseFeeCents: pricing.movingBaseFeeCents,
          disposalBaseFeeCents: pricing.disposalBaseFeeCents,
          hourlyRateCents: pricingDb?.hourlyRateCents ?? 0,
          perM3MovingCents: pricing.perM3MovingCents,
          perM3DisposalCents: pricing.perM3DisposalCents,
          perKmCents: pricing.perKmCents,
          heavyItemSurchargeCents: pricingDb?.heavyItemSurchargeCents ?? 0,
          stairsSurchargePerFloorCents: pricing.stairsSurchargePerFloorCents,
          carryDistanceSurchargePer25mCents: pricingDb?.carryDistanceSurchargePer25mCents ?? 0,
          parkingSurchargeMediumCents: pricingDb?.parkingSurchargeMediumCents ?? 0,
          parkingSurchargeHardCents: pricing.parkingSurchargeHardCents,
          elevatorDiscountSmallCents: pricingDb?.elevatorDiscountSmallCents ?? 0,
          elevatorDiscountLargeCents: pricingDb?.elevatorDiscountLargeCents ?? 0,
          uncertaintyPercent: pricing.uncertaintyPercent,
          economyMultiplier: pricing.economyMultiplier,
          standardMultiplier: pricing.standardMultiplier,
          expressMultiplier: pricing.expressMultiplier,
          montageBaseFeeCents: pricingDb?.montageBaseFeeCents ?? pricing.movingBaseFeeCents,
          montageStandardMultiplier: pricingDb?.montageStandardMultiplier ?? 0.98,
          montagePlusMultiplier: pricingDb?.montagePlusMultiplier ?? 1,
          montagePremiumMultiplier: pricingDb?.montagePremiumMultiplier ?? 1.12,
          montageMinimumOrderCents: pricingDb?.montageMinimumOrderCents ?? pricing.movingBaseFeeCents,
        },
        serviceOptions: montageOptions.map((option) => ({
          code: option.code,
          moduleSlug: "MONTAGE",
          pricingType: option.pricingType,
          defaultPriceCents: option.defaultPriceCents,
          defaultLaborMinutes: option.defaultLaborMinutes,
          isHeavy: option.isHeavy,
          requiresQuantity: option.requiresQuantity,
        })),
      },
      undefined,
    );

    const net = estimate.priceMaxCents;
    const vat = Math.round(net * 0.19);
    return NextResponse.json({
      priceNet: net,
      vat,
      priceGross: net + vat,
      breakdown: {
        baseCents: pricingDb?.montageBaseFeeCents ?? pricing.movingBaseFeeCents,
        volumeCents: 0,
        floorsCents: 0,
        parkingCents: 0,
        addonsCents: 0,
        driveChargeCents: 0,
        subtotalCents: estimate.breakdown.totalCents,
        minCents: estimate.priceMinCents,
        maxCents: estimate.priceMaxCents,
        serviceOptionsCents: estimate.breakdown.serviceOptionsCents,
        minimumOrderAppliedCents: estimate.breakdown.minimumOrderAppliedCents,
      },
    });
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



