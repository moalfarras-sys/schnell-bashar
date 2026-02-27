import { prisma } from "@/server/db/prisma";
import { estimateOrder } from "@/server/calc/estimate";
import { resolveRouteDistance } from "@/server/distance/ors";
import { QuoteDraftSchema } from "@/domain/quote/schema";
import type { QuoteDraft, QuoteResult } from "@/domain/quote/types";
import {
  quoteContextToServiceCart,
  quoteDraftToWizardPayload,
} from "@/server/quotes/map-quote-to-wizard";

type PricingMultipliers = {
  economyMultiplier: number;
  standardMultiplier: number;
  expressMultiplier: number;
};

type PackageBreakdown = {
  tier: "ECONOMY" | "STANDARD" | "EXPRESS";
  minCents: number;
  maxCents: number;
  netCents: number;
  vatCents: number;
  grossCents: number;
};

const serviceKindLabel: Record<"UMZUG" | "MONTAGE" | "ENTSORGUNG" | "SPECIAL", string> = {
  UMZUG: "Umzug",
  MONTAGE: "Montage",
  ENTSORGUNG: "Entsorgung",
  SPECIAL: "Spezialservice",
};

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

export async function calculateQuote(input: QuoteDraft): Promise<{
  draft: QuoteDraft;
  result: QuoteResult;
}>;
export async function calculateQuote(
  input: QuoteDraft,
  options?: { allowDistanceFallback?: boolean },
): Promise<{
  draft: QuoteDraft;
  result: QuoteResult;
}> {
  const parsed = QuoteDraftSchema.parse(input);
  const wizardPayload = quoteDraftToWizardPayload(parsed);

  const pricing = await prisma.pricingConfig.findFirst({
    where: { active: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!pricing) {
    throw new Error("Die Preiskonfiguration ist aktuell nicht verfügbar.");
  }

  const serviceOptionsDb = await prisma.serviceOption.findMany({
    where: {
      active: true,
      deletedAt: null,
      module: { active: true, deletedAt: null, slug: { in: ["MONTAGE", "ENTSORGUNG", "SPECIAL"] } },
    },
    include: { module: { select: { slug: true } } },
  });

  const needsRoute = parsed.serviceContext === "MOVING" || parsed.serviceContext === "COMBO";
  let distanceKm: number | undefined;
  let distanceSource: "approx" | "ors" | "cache" | "fallback" | undefined;

  if (needsRoute && parsed.fromAddress && parsed.toAddress) {
    const route = await resolveRouteDistance({
      from: {
        lat: parsed.fromAddress.lat,
        lon: parsed.fromAddress.lon,
        postalCode: parsed.fromAddress.postalCode,
        text: parsed.fromAddress.displayName,
      },
      to: {
        lat: parsed.toAddress.lat,
        lon: parsed.toAddress.lon,
        postalCode: parsed.toAddress.postalCode,
        text: parsed.toAddress.displayName,
      },
      profile: "driving-car",
      allowFallback: options?.allowDistanceFallback ?? false,
    });
    distanceKm = route.distanceKm;
    distanceSource = route.source;
  }

  const estimate = estimateOrder(
    wizardPayload,
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
        montageBaseFeeCents: pricing.montageBaseFeeCents,
        entsorgungBaseFeeCents: pricing.entsorgungBaseFeeCents,
        montageStandardMultiplier: pricing.montageStandardMultiplier,
        montagePlusMultiplier: pricing.montagePlusMultiplier,
        montagePremiumMultiplier: pricing.montagePremiumMultiplier,
        entsorgungStandardMultiplier: pricing.entsorgungStandardMultiplier,
        entsorgungPlusMultiplier: pricing.entsorgungPlusMultiplier,
        entsorgungPremiumMultiplier: pricing.entsorgungPremiumMultiplier,
        montageMinimumOrderCents: pricing.montageMinimumOrderCents,
        entsorgungMinimumOrderCents: pricing.entsorgungMinimumOrderCents,
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

  const packages = packageSet(estimate.breakdown.totalCents, pricing.uncertaintyPercent, {
    economyMultiplier: pricing.economyMultiplier,
    standardMultiplier: pricing.standardMultiplier,
    expressMultiplier: pricing.expressMultiplier,
  });
  const selected =
    packages.find((pkg) => pkg.tier === parsed.packageSpeed) ??
    packages.find((pkg) => pkg.tier === "STANDARD")!;

  const serviceOptionsByCode = new Map(serviceOptionsDb.map((option) => [option.code, option]));
  const cart = quoteContextToServiceCart(parsed.serviceContext).map((item) => ({
    ...item,
    titleDe: item.titleDe || serviceKindLabel[item.kind],
  }));

  const servicesBreakdown = cart.map((service) => {
    const optionRows = parsed.selectedServiceOptions.filter((item) => {
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
        Math.round(parsed.volumeM3 * pricing.perM3MovingCents) +
        (distanceKm ? Math.round(distanceKm * pricing.perKmCents) : 0);
    } else if (service.kind === "ENTSORGUNG") {
      baseCents =
        pricing.entsorgungBaseFeeCents + Math.round(parsed.volumeM3 * pricing.perM3DisposalCents);
    } else if (service.kind === "MONTAGE" || service.kind === "SPECIAL") {
      baseCents = pricing.montageBaseFeeCents;
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

  const result: QuoteResult = {
    distanceKm,
    distanceSource,
    driveCostCents: estimate.breakdown.driveChargeCents ?? 0,
    subtotalCents: estimate.breakdown.subtotalCents,
    totalCents: estimate.breakdown.totalCents,
    priceMinCents: selected.minCents,
    priceMaxCents: selected.maxCents,
    netCents: selected.netCents,
    vatCents: selected.vatCents,
    grossCents: selected.grossCents,
    packages,
    laborHours: estimate.laborHours,
    packageSpeed: parsed.packageSpeed,
    computedAt: new Date().toISOString(),
    serviceCart: cart,
    servicesBreakdown,
  };

  return {
    draft: parsed,
    result,
  };
}
