import { prisma } from "@/server/db/prisma";
import type { PricingConfigLite, PromoRuleLite, ServiceOptionLite } from "@/server/calc/estimate";

type RuntimePricingConfig = {
  pricing: PricingConfigLite;
  serviceOptions: ServiceOptionLite[];
  promoRules: PromoRuleLite[];
  leadDays: {
    economy: number;
    standard: number;
    express: number;
  };
  version: string;
  updatedAt: string;
};

type CacheState = {
  data: RuntimePricingConfig;
  expiresAt: number;
  markerCheckedAt: number;
};

const MAX_AGE_MS = 120_000;
const MARKER_CHECK_MS = 15_000;

declare global {
  var __ssuPricingRuntimeCache: CacheState | undefined;
}

function mapPricing(pricing: {
  currency: string;
  movingBaseFeeCents: number;
  disposalBaseFeeCents: number;
  hourlyRateCents: number;
  perM3MovingCents: number;
  perM3DisposalCents: number;
  perKmCents: number;
  heavyItemSurchargeCents: number;
  stairsSurchargePerFloorCents: number;
  carryDistanceSurchargePer25mCents: number;
  parkingSurchargeMediumCents: number;
  parkingSurchargeHardCents: number;
  elevatorDiscountSmallCents: number;
  elevatorDiscountLargeCents: number;
  uncertaintyPercent: number;
  economyMultiplier: number;
  standardMultiplier: number;
  expressMultiplier: number;
  economyLeadDays: number;
  standardLeadDays: number;
  expressLeadDays: number;
  montageBaseFeeCents: number;
  entsorgungBaseFeeCents: number;
  montageStandardMultiplier: number;
  montagePlusMultiplier: number;
  montagePremiumMultiplier: number;
  entsorgungStandardMultiplier: number;
  entsorgungPlusMultiplier: number;
  entsorgungPremiumMultiplier: number;
  montageMinimumOrderCents: number;
  entsorgungMinimumOrderCents: number;
}): PricingConfigLite {
  return {
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
  };
}

async function resolveMarkerVersion() {
  const [pricingMarker, optionMarker, promoMarker] = await Promise.all([
    prisma.pricingConfig.findFirst({
      where: { active: true, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true, updatedAt: true },
    }),
    prisma.serviceOption.aggregate({
      where: {
        active: true,
        deletedAt: null,
        module: {
          active: true,
          deletedAt: null,
          slug: { in: ["MONTAGE", "ENTSORGUNG", "SPECIAL"] },
        },
      },
      _max: { updatedAt: true },
    }),
    prisma.promoRule.aggregate({
      where: { active: true, deletedAt: null },
      _max: { updatedAt: true },
    }),
  ]);

  if (!pricingMarker) {
    throw new Error("Die Preiskonfiguration ist aktuell nicht verfügbar.");
  }

  return `${pricingMarker.id}:${pricingMarker.updatedAt.toISOString()}:${optionMarker._max.updatedAt?.toISOString() ?? "none"}:${promoMarker._max.updatedAt?.toISOString() ?? "none"}`;
}

async function fetchFreshRuntimeConfig(version: string): Promise<RuntimePricingConfig> {
  const [pricing, serviceOptionsDb, promoRulesDb] = await Promise.all([
    prisma.pricingConfig.findFirst({
      where: { active: true, deletedAt: null },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.serviceOption.findMany({
      where: {
        active: true,
        deletedAt: null,
        module: {
          active: true,
          deletedAt: null,
          slug: { in: ["MONTAGE", "ENTSORGUNG", "SPECIAL"] },
        },
      },
      include: { module: { select: { slug: true } } },
      orderBy: [{ sortOrder: "asc" }, { nameDe: "asc" }],
    }),
    prisma.promoRule.findMany({
      where: { active: true, deletedAt: null },
      include: { module: { select: { slug: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!pricing) {
    throw new Error("Die Preiskonfiguration ist aktuell nicht verfügbar.");
  }

  const serviceOptions: ServiceOptionLite[] = serviceOptionsDb.map((option) => ({
    code: option.code,
    moduleSlug: option.module.slug,
    pricingType: option.pricingType,
    defaultPriceCents: option.defaultPriceCents,
    defaultLaborMinutes: option.defaultLaborMinutes,
    isHeavy: option.isHeavy,
    requiresQuantity: option.requiresQuantity,
  }));
  const promoRules: PromoRuleLite[] = promoRulesDb.map((rule) => ({
    id: rule.id,
    code: rule.code,
    moduleSlug: rule.module?.slug ?? null,
    serviceTypeScope: rule.serviceTypeScope,
    discountType: rule.discountType,
    discountValue: rule.discountValue,
    minOrderCents: rule.minOrderCents,
    maxDiscountCents: rule.maxDiscountCents,
    validFrom: rule.validFrom,
    validTo: rule.validTo,
    active: rule.active,
  }));

  return {
    pricing: mapPricing(pricing),
    serviceOptions,
    promoRules,
    leadDays: {
      economy: pricing.economyLeadDays,
      standard: pricing.standardLeadDays,
      express: pricing.expressLeadDays,
    },
    version,
    updatedAt: pricing.updatedAt.toISOString(),
  };
}

export async function getRuntimePricingConfig(): Promise<RuntimePricingConfig> {
  const now = Date.now();
  const cache = globalThis.__ssuPricingRuntimeCache;

  if (cache && now < cache.expiresAt && now - cache.markerCheckedAt < MARKER_CHECK_MS) {
    return cache.data;
  }

  const currentVersion = await resolveMarkerVersion();

  if (cache && now < cache.expiresAt && cache.data.version === currentVersion) {
    globalThis.__ssuPricingRuntimeCache = {
      ...cache,
      markerCheckedAt: now,
    };
    return cache.data;
  }

  const fresh = await fetchFreshRuntimeConfig(currentVersion);
  globalThis.__ssuPricingRuntimeCache = {
    data: fresh,
    expiresAt: now + MAX_AGE_MS,
    markerCheckedAt: now,
  };

  return fresh;
}
