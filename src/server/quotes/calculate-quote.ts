import { estimateOrder } from "@/server/calc/estimate";
import { resolveRouteDistance } from "@/server/distance/ors";
import { QuoteDraftSchema } from "@/domain/quote/schema";
import type { QuoteDraft, QuoteResult } from "@/domain/quote/types";
import {
  quoteContextToServiceCart,
  quoteDraftToWizardPayload,
  quoteSpeedToPackageTier,
} from "@/server/quotes/map-quote-to-wizard";
import { getRuntimePricingConfig } from "@/server/pricing/runtime-config";

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
  rows: Array<{ tier: PackageBreakdown["tier"]; netCents: number }>,
  uncertaintyPercent: number,
): PackageBreakdown[] {
  return rows.map(({ tier, netCents }) => {
    const normalizedNet = Math.max(0, Math.round(netCents));
    const spread = Math.max(0, Math.round(normalizedNet * (uncertaintyPercent / 100)));
    const minCents = Math.max(0, normalizedNet - spread);
    const maxCents = normalizedNet + spread;
    const vatCents = Math.round(normalizedNet * 0.19);
    return {
      tier,
      minCents,
      maxCents,
      netCents: normalizedNet,
      vatCents,
      grossCents: normalizedNet + vatCents,
    };
  });
}

export async function calculateQuote(
  input: QuoteDraft,
  options?: { allowDistanceFallback?: boolean },
): Promise<{
  draft: QuoteDraft;
  result: QuoteResult;
}> {
  const parsed = QuoteDraftSchema.parse(input);
  const wizardPayload = quoteDraftToWizardPayload(parsed);
  const runtimeConfig = await getRuntimePricingConfig();

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

  const estimateInput = {
    catalog: [] as Array<{
      id: string;
      nameDe: string;
      categoryKey: string;
      defaultVolumeM3: number;
      laborMinutesPerUnit: number;
      isHeavy: boolean;
    }>,
    pricing: runtimeConfig.pricing,
    serviceOptions: runtimeConfig.serviceOptions,
  };

  const estimateOptions = { distanceKm, distanceSource };

  const estimateBySpeed = new Map<"ECONOMY" | "STANDARD" | "EXPRESS", ReturnType<typeof estimateOrder>>();
  for (const speed of ["ECONOMY", "STANDARD", "EXPRESS"] as const) {
    const payloadForSpeed = {
      ...wizardPayload,
      packageTier: quoteSpeedToPackageTier(speed),
      timing: {
        ...wizardPayload.timing,
        speed,
      },
    };
    estimateBySpeed.set(speed, estimateOrder(payloadForSpeed, estimateInput, estimateOptions));
  }

  const selectedEstimate = estimateBySpeed.get(parsed.packageSpeed) ?? estimateBySpeed.get("STANDARD")!;
  const perM3MovingCents = runtimeConfig.pricing.perM3MovingCents ?? 0;
  const perM3DisposalCents = runtimeConfig.pricing.perM3DisposalCents ?? 0;
  const perKmCents = runtimeConfig.pricing.perKmCents ?? 0;
  const movingBaseFeeCents = runtimeConfig.pricing.movingBaseFeeCents ?? 0;
  const entsorgungBaseFeeCents = runtimeConfig.pricing.entsorgungBaseFeeCents ?? 0;
  const montageBaseFeeCents = runtimeConfig.pricing.montageBaseFeeCents ?? 0;
  const packages = packageSet(
    (["ECONOMY", "STANDARD", "EXPRESS"] as const).map((tier) => ({
      tier,
      netCents: estimateBySpeed.get(tier)?.breakdown.totalCents ?? 0,
    })),
    runtimeConfig.pricing.uncertaintyPercent,
  );
  const selected =
    packages.find((pkg) => pkg.tier === parsed.packageSpeed) ??
    packages.find((pkg) => pkg.tier === "STANDARD")!;

  const serviceOptionsByCode = new Map(runtimeConfig.serviceOptions.map((option) => [option.code, option]));
  const cart = quoteContextToServiceCart(parsed.serviceContext).map((item) => ({
    ...item,
    titleDe: item.titleDe || serviceKindLabel[item.kind],
  }));

  const servicesBreakdown = cart.map((service) => {
    const optionRows = parsed.selectedServiceOptions.filter((item) => {
      const moduleSlug = serviceOptionsByCode.get(item.code)?.moduleSlug;
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
        movingBaseFeeCents +
        Math.round(parsed.volumeM3 * perM3MovingCents) +
        (distanceKm ? Math.round(distanceKm * perKmCents) : 0);
    } else if (service.kind === "ENTSORGUNG") {
      baseCents =
        entsorgungBaseFeeCents +
        Math.round(parsed.volumeM3 * perM3DisposalCents);
    } else if (service.kind === "MONTAGE" || service.kind === "SPECIAL") {
      baseCents = montageBaseFeeCents;
    }

    const subtotalCents = Math.max(0, baseCents + optionTotal);
    const spread = Math.round(subtotalCents * (runtimeConfig.pricing.uncertaintyPercent / 100));

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
    driveCostCents: selectedEstimate.breakdown.driveChargeCents ?? 0,
    subtotalCents: selectedEstimate.breakdown.subtotalCents,
    totalCents: selectedEstimate.breakdown.totalCents,
    priceMinCents: selected.minCents,
    priceMaxCents: selected.maxCents,
    netCents: selected.netCents,
    vatCents: selected.vatCents,
    grossCents: selected.grossCents,
    packages,
    laborHours: selectedEstimate.laborHours,
    packageSpeed: parsed.packageSpeed,
    computedAt: new Date().toISOString(),
    serviceCart: cart,
    servicesBreakdown,
    lineItems: selectedEstimate.lineItems,
    breakdown: {
      laborHours: selectedEstimate.breakdown.laborHours,
      distanceKm: selectedEstimate.breakdown.distanceKm,
      distanceSource: selectedEstimate.breakdown.distanceSource,
      driveChargeCents: selectedEstimate.breakdown.driveChargeCents,
      subtotalCents: selectedEstimate.breakdown.subtotalCents,
      serviceOptionsCents: selectedEstimate.breakdown.serviceOptionsCents,
      addonsCents: selectedEstimate.breakdown.addonsCents,
      minimumOrderAppliedCents: selectedEstimate.breakdown.minimumOrderAppliedCents,
      discountCents: selectedEstimate.breakdown.discountCents,
      totalCents: selectedEstimate.breakdown.totalCents,
    },
  };

  return {
    draft: parsed,
    result,
  };
}
