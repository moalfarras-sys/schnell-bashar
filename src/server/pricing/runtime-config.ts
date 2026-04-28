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

const FALLBACK_RUNTIME_CONFIG: RuntimePricingConfig = {
  pricing: {
    currency: "EUR",
    movingBaseFeeCents: 19000,
    disposalBaseFeeCents: 14000,
    hourlyRateCents: 6500,
    perM3MovingCents: 3400,
    perM3DisposalCents: 4800,
    perKmCents: 250,
    heavyItemSurchargeCents: 5500,
    stairsSurchargePerFloorCents: 2500,
    carryDistanceSurchargePer25mCents: 1500,
    parkingSurchargeMediumCents: 6000,
    parkingSurchargeHardCents: 12000,
    elevatorDiscountSmallCents: 800,
    elevatorDiscountLargeCents: 1500,
    uncertaintyPercent: 12,
    economyMultiplier: 0.9,
    standardMultiplier: 1,
    expressMultiplier: 1.3,
    montageBaseFeeCents: 14900,
    entsorgungBaseFeeCents: 11900,
    montageStandardMultiplier: 0.98,
    montagePlusMultiplier: 1,
    montagePremiumMultiplier: 1.12,
    entsorgungStandardMultiplier: 0.96,
    entsorgungPlusMultiplier: 1,
    entsorgungPremiumMultiplier: 1.1,
    montageMinimumOrderCents: 9900,
    entsorgungMinimumOrderCents: 8900,
  },
  serviceOptions: [
    {
      code: "PACKING",
      moduleSlug: "SPECIAL",
      pricingType: "FLAT",
      defaultPriceCents: 2500,
      defaultLaborMinutes: 30,
      isHeavy: false,
      requiresQuantity: false,
    },
    {
      code: "DISMANTLE_ASSEMBLE",
      moduleSlug: "MONTAGE",
      pricingType: "FLAT",
      defaultPriceCents: 3500,
      defaultLaborMinutes: 45,
      isHeavy: false,
      requiresQuantity: false,
    },
    {
      code: "OLD_KITCHEN_DISPOSAL",
      moduleSlug: "ENTSORGUNG",
      pricingType: "FLAT",
      defaultPriceCents: 14900,
      defaultLaborMinutes: 90,
      isHeavy: true,
      requiresQuantity: false,
    },
    {
      code: "BASEMENT_ATTIC_CLEARING",
      moduleSlug: "ENTSORGUNG",
      pricingType: "FLAT",
      defaultPriceCents: 9900,
      defaultLaborMinutes: 75,
      isHeavy: false,
      requiresQuantity: false,
    },
    {
      code: "MONTAGE_KUECHE",
      moduleSlug: "MONTAGE",
      pricingType: "FLAT",
      defaultPriceCents: 29900,
      defaultLaborMinutes: 240,
      isHeavy: true,
      requiresQuantity: false,
    },
  ],
  promoRules: [],
  leadDays: {
    economy: 10,
    standard: 5,
    express: 2,
  },
  version: "fallback-seed-pricing",
  updatedAt: new Date(0).toISOString(),
};

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

function cacheFallbackRuntimeConfig(now: number): RuntimePricingConfig {
  globalThis.__ssuPricingRuntimeCache = {
    data: FALLBACK_RUNTIME_CONFIG,
    expiresAt: now + 15_000,
    markerCheckedAt: now,
  };
  return FALLBACK_RUNTIME_CONFIG;
}

export async function getRuntimePricingConfig(): Promise<RuntimePricingConfig> {
  const now = Date.now();
  const cache = globalThis.__ssuPricingRuntimeCache;

  if (cache && now < cache.expiresAt && now - cache.markerCheckedAt < MARKER_CHECK_MS) {
    return cache.data;
  }

  let currentVersion: string;
  try {
    currentVersion = await resolveMarkerVersion();
  } catch (error) {
    console.warn("[pricing] failed to load runtime pricing from database, using fallback seed pricing", error);
    return cacheFallbackRuntimeConfig(now);
  }

  if (cache && now < cache.expiresAt && cache.data.version === currentVersion) {
    globalThis.__ssuPricingRuntimeCache = {
      ...cache,
      markerCheckedAt: now,
    };
    return cache.data;
  }

  let fresh: RuntimePricingConfig;
  try {
    fresh = await fetchFreshRuntimeConfig(currentVersion);
  } catch (error) {
    console.warn("[pricing] failed to refresh runtime pricing from database, using fallback seed pricing", error);
    return cacheFallbackRuntimeConfig(now);
  }
  globalThis.__ssuPricingRuntimeCache = {
    data: fresh,
    expiresAt: now + MAX_AGE_MS,
    markerCheckedAt: now,
  };

  return fresh;
}
