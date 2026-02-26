import { prisma } from "@/server/db/prisma";

export type BookingPricing = {
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
};

export type BookingCatalogItem = {
  id: string;
  slug: string;
  categoryKey: string;
  nameDe: string;
  defaultVolumeM3: number;
  laborMinutesPerUnit: number;
  isHeavy: boolean;
};

export type BookingServiceOption = {
  id: string;
  code: string;
  nameDe: string;
  descriptionDe: string | null;
  pricingType: "FLAT" | "PER_UNIT" | "PER_M3" | "PER_HOUR";
  defaultPriceCents: number;
  defaultLaborMinutes: number;
  defaultVolumeM3: number;
  requiresQuantity: boolean;
  requiresPhoto: boolean;
  isHeavy: boolean;
  sortOrder: number;
};

export type BookingServiceModule = {
  id: string;
  slug: "MONTAGE" | "ENTSORGUNG" | "SPECIAL";
  nameDe: string;
  descriptionDe: string | null;
  sortOrder: number;
  options: BookingServiceOption[];
};

export type BookingPromoRule = {
  id: string;
  code: string;
  moduleSlug: "MONTAGE" | "ENTSORGUNG" | "SPECIAL" | null;
  serviceTypeScope: "MOVING" | "DISPOSAL" | "BOTH" | null;
  discountType: "PERCENT" | "FLAT_CENTS";
  discountValue: number;
  minOrderCents: number;
  maxDiscountCents: number | null;
  validFrom: string | null;
  validTo: string | null;
};

export async function loadBookingConfig() {
  const now = new Date();
  const [pricingData, catalogData, moduleData, promoRulesData] = await Promise.all([
    prisma.pricingConfig.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } }),
    prisma.catalogItem.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { nameDe: "asc" }],
      select: {
        id: true,
        slug: true,
        categoryKey: true,
        nameDe: true,
        defaultVolumeM3: true,
        laborMinutesPerUnit: true,
        isHeavy: true,
      },
    }),
    prisma.serviceModule.findMany({
      where: { active: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        options: {
          where: { active: true, deletedAt: null },
          orderBy: [{ sortOrder: "asc" }, { nameDe: "asc" }],
          select: {
            id: true,
            code: true,
            nameDe: true,
            descriptionDe: true,
            pricingType: true,
            defaultPriceCents: true,
            defaultLaborMinutes: true,
            defaultVolumeM3: true,
            requiresQuantity: true,
            requiresPhoto: true,
            isHeavy: true,
            sortOrder: true,
          },
        },
      },
    }),
    prisma.promoRule.findMany({
      where: {
        active: true,
        deletedAt: null,
        OR: [{ validFrom: null }, { validFrom: { lte: now } }],
        AND: [{ OR: [{ validTo: null }, { validTo: { gte: now } }] }],
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        module: {
          select: { slug: true },
        },
      },
    }),
  ]);

  if (!pricingData || catalogData.length === 0) {
    return null;
  }

  const pricing: BookingPricing = {
    currency: pricingData.currency,
    movingBaseFeeCents: pricingData.movingBaseFeeCents,
    disposalBaseFeeCents: pricingData.disposalBaseFeeCents,
    hourlyRateCents: pricingData.hourlyRateCents,
    perM3MovingCents: pricingData.perM3MovingCents,
    perM3DisposalCents: pricingData.perM3DisposalCents,
    perKmCents: pricingData.perKmCents,
    heavyItemSurchargeCents: pricingData.heavyItemSurchargeCents,
    stairsSurchargePerFloorCents: pricingData.stairsSurchargePerFloorCents,
    carryDistanceSurchargePer25mCents: pricingData.carryDistanceSurchargePer25mCents,
    parkingSurchargeMediumCents: pricingData.parkingSurchargeMediumCents,
    parkingSurchargeHardCents: pricingData.parkingSurchargeHardCents,
    elevatorDiscountSmallCents: pricingData.elevatorDiscountSmallCents,
    elevatorDiscountLargeCents: pricingData.elevatorDiscountLargeCents,
    uncertaintyPercent: pricingData.uncertaintyPercent,
    economyMultiplier: pricingData.economyMultiplier,
    standardMultiplier: pricingData.standardMultiplier,
    expressMultiplier: pricingData.expressMultiplier,
    economyLeadDays: pricingData.economyLeadDays,
    standardLeadDays: pricingData.standardLeadDays,
    expressLeadDays: pricingData.expressLeadDays,
    montageBaseFeeCents: pricingData.montageBaseFeeCents,
    entsorgungBaseFeeCents: pricingData.entsorgungBaseFeeCents,
    montageStandardMultiplier: pricingData.montageStandardMultiplier,
    montagePlusMultiplier: pricingData.montagePlusMultiplier,
    montagePremiumMultiplier: pricingData.montagePremiumMultiplier,
    entsorgungStandardMultiplier: pricingData.entsorgungStandardMultiplier,
    entsorgungPlusMultiplier: pricingData.entsorgungPlusMultiplier,
    entsorgungPremiumMultiplier: pricingData.entsorgungPremiumMultiplier,
    montageMinimumOrderCents: pricingData.montageMinimumOrderCents,
    entsorgungMinimumOrderCents: pricingData.entsorgungMinimumOrderCents,
  };

  const catalog: BookingCatalogItem[] = catalogData;
  const modules: BookingServiceModule[] = moduleData.map((module) => ({
    id: module.id,
    slug: module.slug,
    nameDe: module.nameDe,
    descriptionDe: module.descriptionDe,
    sortOrder: module.sortOrder,
    options: module.options.map((option) => ({
      id: option.id,
      code: option.code,
      nameDe: option.nameDe,
      descriptionDe: option.descriptionDe,
      pricingType: option.pricingType,
      defaultPriceCents: option.defaultPriceCents,
      defaultLaborMinutes: option.defaultLaborMinutes,
      defaultVolumeM3: option.defaultVolumeM3,
      requiresQuantity: option.requiresQuantity,
      requiresPhoto: option.requiresPhoto,
      isHeavy: option.isHeavy,
      sortOrder: option.sortOrder,
    })),
  }));

  const promoRules: BookingPromoRule[] = promoRulesData.map((rule) => ({
    id: rule.id,
    code: rule.code,
    moduleSlug: rule.module?.slug ?? null,
    serviceTypeScope: rule.serviceTypeScope,
    discountType: rule.discountType,
    discountValue: rule.discountValue,
    minOrderCents: rule.minOrderCents,
    maxDiscountCents: rule.maxDiscountCents,
    validFrom: rule.validFrom ? rule.validFrom.toISOString() : null,
    validTo: rule.validTo ? rule.validTo.toISOString() : null,
  }));

  return { pricing, catalog, modules, promoRules };
}
