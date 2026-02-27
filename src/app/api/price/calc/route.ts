import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { resolveRouteDistance } from "@/server/distance/ors";
import { estimateOrder } from "@/server/calc/estimate";
import type { WizardPayload } from "@/lib/wizard-schema";

export const runtime = "nodejs";

const serviceKindSchema = z.enum(["UMZUG", "MONTAGE", "ENTSORGUNG", "SPECIAL"]);
const speedSchema = z.enum(["ECONOMY", "STANDARD", "EXPRESS"]);

const priceCalcSchema = z.object({
  serviceType: z.enum(["UMZUG", "ENTSORGUNG", "KOMBI", "MONTAGE", "SPECIAL"]).default("UMZUG"),
  serviceCart: z
    .array(
      z.object({
        kind: serviceKindSchema,
        qty: z.coerce.number().int().min(1).max(50).default(1),
        moduleSlug: z.enum(["MONTAGE", "ENTSORGUNG", "SPECIAL"]).optional(),
        titleDe: z.string().trim().min(2).max(120).optional(),
      }),
    )
    .default([]),
  speed: speedSchema.default("STANDARD"),
  volumeM3: z.coerce.number().min(1).max(200).default(12),
  floors: z.coerce.number().min(0).max(10).default(0),
  hasElevator: z.boolean().optional().default(false),
  needNoParkingZone: z.boolean().default(false),
  addons: z
    .array(
      z.enum([
        "PACKING",
        "DISMANTLE_ASSEMBLE",
        "OLD_KITCHEN_DISPOSAL",
        "BASEMENT_ATTIC_CLEARING",
      ]),
    )
    .default([]),
  selectedServiceOptions: z
    .array(
      z.object({
        code: z.string().trim().min(2).max(80),
        qty: z.coerce.number().int().min(1).max(50).default(1),
      }),
    )
    .default([]),
  fromAddress: z.string().trim().optional(),
  toAddress: z.string().trim().optional(),
});

type ServiceKind = z.infer<typeof serviceKindSchema>;
type Speed = z.infer<typeof speedSchema>;
type PriceCalcInput = z.infer<typeof priceCalcSchema>;
type PriceCalcServiceCartItem = PriceCalcInput["serviceCart"][number];

type PackageBreakdown = {
  tier: "ECONOMY" | "STANDARD" | "EXPRESS";
  minCents: number;
  maxCents: number;
  netCents: number;
  vatCents: number;
  grossCents: number;
};

type PricingMultipliers = {
  economyMultiplier: number;
  standardMultiplier: number;
  expressMultiplier: number;
};

const serviceKindLabel: Record<ServiceKind, string> = {
  UMZUG: "Umzug",
  MONTAGE: "Montage",
  ENTSORGUNG: "Entsorgung",
  SPECIAL: "Spezialservice",
};

function speedToPackageTier(speed: Speed): WizardPayload["packageTier"] {
  if (speed === "ECONOMY") return "STANDARD";
  if (speed === "EXPRESS") return "PREMIUM";
  return "PLUS";
}

function deriveServiceCart(input: PriceCalcInput) {
  if (input.serviceCart.length > 0) {
    const dedupe = new Map<string, PriceCalcServiceCartItem>();
    for (const item of input.serviceCart) {
      const key = `${item.kind}:${item.moduleSlug ?? "-"}`;
      if (!dedupe.has(key)) dedupe.set(key, item);
    }
    return [...dedupe.values()];
  }

  switch (input.serviceType) {
    case "ENTSORGUNG":
      return [{ kind: "ENTSORGUNG" as const, qty: 1, moduleSlug: "ENTSORGUNG" as const }];
    case "KOMBI":
      return [
        { kind: "UMZUG" as const, qty: 1 },
        { kind: "ENTSORGUNG" as const, qty: 1, moduleSlug: "ENTSORGUNG" as const },
      ];
    case "MONTAGE":
      return [{ kind: "MONTAGE" as const, qty: 1, moduleSlug: "MONTAGE" as const }];
    case "SPECIAL":
      return [{ kind: "SPECIAL" as const, qty: 1, moduleSlug: "SPECIAL" as const }];
    default:
      return [{ kind: "UMZUG" as const, qty: 1 }];
  }
}

function serviceTypeFromCart(cart: ReturnType<typeof deriveServiceCart>): WizardPayload["serviceType"] {
  const hasMoving = cart.some((item) => item.kind === "UMZUG");
  const hasDisposal = cart.some((item) => item.kind === "ENTSORGUNG");
  if (hasMoving && hasDisposal) return "BOTH";
  if (hasDisposal) return "DISPOSAL";
  return "MOVING";
}

function bookingContextFromCart(cart: ReturnType<typeof deriveServiceCart>): WizardPayload["bookingContext"] {
  if (cart.length === 1) {
    if (cart[0].kind === "MONTAGE") return "MONTAGE";
    if (cart[0].kind === "ENTSORGUNG") return "ENTSORGUNG";
    if (cart[0].kind === "SPECIAL") return "SPECIAL";
  }
  return "STANDARD";
}

function packageSet(
  subtotalCents: number,
  uncertaintyPercent: number,
  multipliers: PricingMultipliers,
): PackageBreakdown[] {
  const rows: Array<{ tier: PackageBreakdown["tier"]; multiplier: number }> = [
    { tier: "ECONOMY", multiplier: multipliers.economyMultiplier },
    { tier: "STANDARD", multiplier: multipliers.standardMultiplier },
    { tier: "EXPRESS", multiplier: multipliers.expressMultiplier },
  ];

  return rows.map(({ tier, multiplier }) => {
    const netCents = Math.max(0, Math.round(subtotalCents * multiplier));
    const spread = Math.max(0, Math.round(netCents * (uncertaintyPercent / 100)));
    const minCents = Math.max(0, netCents - spread);
    const maxCents = netCents + spread;
    const vatCents = Math.round(netCents * 0.19);
    return {
      tier,
      minCents,
      maxCents,
      netCents,
      vatCents,
      grossCents: netCents + vatCents,
    };
  });
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

  const input = parsed.data;
  const serviceCart = deriveServiceCart(input).map((item) => ({
    ...item,
    titleDe: item.titleDe ?? serviceKindLabel[item.kind],
  }));
  const serviceType = serviceTypeFromCart(serviceCart);
  const bookingContext = bookingContextFromCart(serviceCart);

  let pricingDb = null;
  try {
    pricingDb = await prisma.pricingConfig.findFirst({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
      select: {
        currency: true,
        movingBaseFeeCents: true,
        disposalBaseFeeCents: true,
        hourlyRateCents: true,
        perM3MovingCents: true,
        perM3DisposalCents: true,
        perKmCents: true,
        heavyItemSurchargeCents: true,
        stairsSurchargePerFloorCents: true,
        carryDistanceSurchargePer25mCents: true,
        parkingSurchargeMediumCents: true,
        parkingSurchargeHardCents: true,
        elevatorDiscountSmallCents: true,
        elevatorDiscountLargeCents: true,
        uncertaintyPercent: true,
        economyMultiplier: true,
        standardMultiplier: true,
        expressMultiplier: true,
        montageBaseFeeCents: true,
        entsorgungBaseFeeCents: true,
        montageStandardMultiplier: true,
        montagePlusMultiplier: true,
        montagePremiumMultiplier: true,
        entsorgungStandardMultiplier: true,
        entsorgungPlusMultiplier: true,
        entsorgungPremiumMultiplier: true,
        montageMinimumOrderCents: true,
        entsorgungMinimumOrderCents: true,
      },
    });
  } catch (error) {
    console.error("[price/calc] pricing config unavailable", error);
    return NextResponse.json(
      { error: "Die Preisdaten konnten nicht live geladen werden." },
      { status: 503 },
    );
  }

  if (!pricingDb) {
    return NextResponse.json(
      {
        error:
          "Die Preiskonfiguration ist aktuell nicht verfügbar. Bitte versuchen Sie es in wenigen Minuten erneut.",
      },
      { status: 503 },
    );
  }
  const pricing = pricingDb;
  const hasMoving = serviceCart.some((item) => item.kind === "UMZUG");
  const needsRoute = hasMoving && input.fromAddress && input.toAddress;

  let distanceKm: number | undefined;
  let distanceSource: "approx" | "ors" | "cache" | "fallback" | undefined;

  if (needsRoute) {
    try {
      const route = await resolveRouteDistance({
        from: { text: input.fromAddress! },
        to: { text: input.toAddress! },
        profile: "driving-car",
        allowFallback: false,
      });
      distanceKm = route.distanceKm;
      distanceSource = route.source;
    } catch (error) {
      console.error("[price/calc] strict-live distance lookup failed", {
        error: error instanceof Error ? error.message : String(error),
        fromAddress: input.fromAddress,
        toAddress: input.toAddress,
      });
      return NextResponse.json(
        {
          error:
            "Die Distanz konnte nicht live berechnet werden. Bitte prüfen Sie die Adressen oder versuchen Sie es erneut.",
        },
        { status: 503 },
      );
    }
  }

  let serviceOptionsDb = [];
  try {
    serviceOptionsDb = await prisma.serviceOption.findMany({
      where: {
        active: true,
        deletedAt: null,
        module: { active: true, deletedAt: null, slug: { in: ["MONTAGE", "ENTSORGUNG", "SPECIAL"] } },
      },
      select: {
        code: true,
        module: { select: { slug: true } },
        pricingType: true,
        defaultPriceCents: true,
        defaultLaborMinutes: true,
        isHeavy: true,
        requiresQuantity: true,
      },
    });
  } catch (error) {
    console.error("[price/calc] service options unavailable", error);
    return NextResponse.json(
      { error: "Serviceoptionen konnten nicht live geladen werden." },
      { status: 503 },
    );
  }

  const accessTemplate = {
    propertyType: "apartment" as const,
    floor: input.floors,
    elevator: input.hasElevator ? ("small" as const) : ("none" as const),
    stairs:
      input.floors > 0 && !input.hasElevator
        ? input.floors > 3
          ? ("many" as const)
          : ("few" as const)
        : ("none" as const),
    parking: input.needNoParkingZone ? ("hard" as const) : ("easy" as const),
    needNoParkingZone: input.needNoParkingZone,
    carryDistanceM: 0,
  };

  const payload: WizardPayload = {
    payloadVersion: 2,
    bookingContext,
    packageTier: speedToPackageTier(input.speed),
    serviceCart: serviceCart.map((item) => ({
      kind: item.kind,
      qty: item.qty,
      moduleSlug: item.moduleSlug,
      titleDe: item.titleDe,
    })),
    serviceType,
    addons: input.addons,
    selectedServiceOptions: input.selectedServiceOptions.map((item) => ({
      code: item.code,
      qty: Math.max(1, item.qty || 1),
    })),
    pickupAddress: undefined,
    startAddress: undefined,
    destinationAddress: undefined,
    accessPickup:
      bookingContext === "MONTAGE" || bookingContext === "SPECIAL"
        ? accessTemplate
        : undefined,
    accessStart:
      bookingContext === "MONTAGE" || bookingContext === "SPECIAL"
        ? undefined
        : accessTemplate,
    accessDestination:
      bookingContext === "MONTAGE" || bookingContext === "SPECIAL"
        ? undefined
        : accessTemplate,
    itemsMove: {},
    itemsDisposal: {},
    disposal:
      serviceCart.some((item) => item.kind === "ENTSORGUNG")
        ? {
            categories: [],
            volumeExtraM3: Math.max(0, input.volumeM3 - 5),
            forbiddenConfirmed: true,
          }
        : undefined,
    timing: {
      speed: input.speed,
      requestedFrom: new Date().toISOString(),
      requestedTo: new Date().toISOString(),
      preferredTimeWindow: "FLEXIBLE",
      jobDurationMinutes: 120,
    },
    customer: {
      name: "Preisberechnung",
      phone: "+49",
      email: "kontakt@schnellsicherumzug.de",
      contactPreference: "EMAIL",
      note: "",
    },
  };

  const estimate = estimateOrder(
    payload,
    {
      catalog: [],
      pricing: {
        currency: pricing.currency,
        movingBaseFeeCents: pricing.movingBaseFeeCents,
        disposalBaseFeeCents: pricing.disposalBaseFeeCents,
        hourlyRateCents: pricing.hourlyRateCents,
        perM3MovingCents: pricing.perM3MovingCents,
        perM3DisposalCents: pricing.perM3DisposalCents,
        perKmCents: pricing.perKmCents,
        heavyItemSurchargeCents: pricing.heavyItemSurchargeCents,
        stairsSurchargePerFloorCents: pricing.stairsSurchargePerFloorCents,
        carryDistanceSurchargePer25mCents: pricing.carryDistanceSurchargePer25mCents,
        parkingSurchargeMediumCents: pricing.parkingSurchargeMediumCents,
        parkingSurchargeHardCents: pricing.parkingSurchargeHardCents,
        elevatorDiscountSmallCents: pricing.elevatorDiscountSmallCents,
        elevatorDiscountLargeCents: pricing.elevatorDiscountLargeCents,
        uncertaintyPercent: pricing.uncertaintyPercent,
        economyMultiplier: pricing.economyMultiplier,
        standardMultiplier: pricing.standardMultiplier,
        expressMultiplier: pricing.expressMultiplier,
        montageBaseFeeCents: pricing.montageBaseFeeCents ?? pricing.movingBaseFeeCents,
        entsorgungBaseFeeCents: pricing.entsorgungBaseFeeCents ?? pricing.disposalBaseFeeCents,
        montageStandardMultiplier: pricing.montageStandardMultiplier ?? 0.98,
        montagePlusMultiplier: pricing.montagePlusMultiplier ?? 1,
        montagePremiumMultiplier: pricing.montagePremiumMultiplier ?? 1.12,
        entsorgungStandardMultiplier: pricing.entsorgungStandardMultiplier ?? 0.98,
        entsorgungPlusMultiplier: pricing.entsorgungPlusMultiplier ?? 1,
        entsorgungPremiumMultiplier: pricing.entsorgungPremiumMultiplier ?? 1.14,
        montageMinimumOrderCents: pricing.montageMinimumOrderCents ?? pricing.montageBaseFeeCents ?? 0,
        entsorgungMinimumOrderCents:
          pricing.entsorgungMinimumOrderCents ?? pricing.entsorgungBaseFeeCents ?? 0,
      },
      serviceOptions: serviceOptionsDb.map((option) => ({
        code: option.code,
        moduleSlug: option.module.slug,
        pricingType: option.pricingType,
        defaultPriceCents: option.defaultPriceCents,
        defaultLaborMinutes: option.defaultLaborMinutes,
        isHeavy: option.isHeavy,
        requiresQuantity: option.requiresQuantity,
      })),
    },
    {
      distanceKm,
      distanceSource,
    },
  );

  const selectedPackage =
    input.speed === "ECONOMY"
      ? "ECONOMY"
      : input.speed === "EXPRESS"
        ? "EXPRESS"
        : "STANDARD";

  const packages = packageSet(estimate.breakdown.totalCents, pricing.uncertaintyPercent, {
    economyMultiplier: pricing.economyMultiplier,
    standardMultiplier: pricing.standardMultiplier,
    expressMultiplier: pricing.expressMultiplier,
  });

  const selected = packages.find((pkg) => pkg.tier === selectedPackage) ?? packages[1];
  const serviceOptionsByCode = new Map(serviceOptionsDb.map((option) => [option.code, option]));

  const servicesBreakdown = serviceCart.map((service) => {
    const optionRows = input.selectedServiceOptions.filter((item) => {
      const moduleSlug = serviceOptionsByCode.get(item.code)?.module.slug;
      if (!moduleSlug) return false;
      if (service.kind === "MONTAGE") return moduleSlug === "MONTAGE";
      if (service.kind === "ENTSORGUNG") return moduleSlug === "ENTSORGUNG";
      if (service.kind === "SPECIAL") return moduleSlug === "SPECIAL";
      return false;
    });

    const optionTotal = optionRows.reduce((sum, item) => {
      const option = serviceOptionsByCode.get(item.code);
      return sum + (option?.defaultPriceCents ?? 0) * item.qty;
    }, 0);

    let baseCents = 0;
    if (service.kind === "UMZUG") {
      baseCents =
        pricing.movingBaseFeeCents +
        Math.round(input.volumeM3 * pricing.perM3MovingCents) +
        (distanceKm ? Math.round(distanceKm * pricing.perKmCents) : 0);
    } else if (service.kind === "ENTSORGUNG") {
      baseCents =
        (pricing.entsorgungBaseFeeCents ?? pricing.disposalBaseFeeCents) +
        Math.round(input.volumeM3 * pricing.perM3DisposalCents);
    } else if (service.kind === "MONTAGE" || service.kind === "SPECIAL") {
      baseCents = pricing.montageBaseFeeCents ?? pricing.movingBaseFeeCents;
    }

    const subtotalCents = Math.max(0, baseCents + optionTotal);
    const spread = Math.round(subtotalCents * (pricing.uncertaintyPercent / 100));

    return {
      kind: service.kind,
      title: service.titleDe ?? serviceKindLabel[service.kind],
      subtotalCents,
      minCents: Math.max(0, subtotalCents - spread),
      maxCents: subtotalCents + spread,
      optionTotalCents: optionTotal,
      optionCount: optionRows.length,
    };
  });

  return NextResponse.json({
    serviceCart,
    servicesBreakdown,
    packages,
    totals: selected,
    priceNet: selected.netCents,
    vat: selected.vatCents,
    priceGross: selected.grossCents,
    breakdown: {
      ...estimate.breakdown,
      selectedPackage: selected.tier,
    },
  });
}


