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

export async function loadBookingConfig() {
  const [pricingData, catalogData] = await Promise.all([
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
  };

  const catalog: BookingCatalogItem[] = catalogData;
  return { pricing, catalog };
}
