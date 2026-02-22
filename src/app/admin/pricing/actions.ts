"use server";

import { prisma } from "@/server/db/prisma";

export async function updatePricingAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.pricingConfig.update({
    where: { id },
    data: {
      movingBaseFeeCents: Number(formData.get("movingBaseFeeCents") ?? 0),
      disposalBaseFeeCents: Number(formData.get("disposalBaseFeeCents") ?? 0),
      hourlyRateCents: Number(formData.get("hourlyRateCents") ?? 0),
      perM3MovingCents: Number(formData.get("perM3MovingCents") ?? 0),
      perM3DisposalCents: Number(formData.get("perM3DisposalCents") ?? 0),
      perKmCents: Number(formData.get("perKmCents") ?? 0),
      heavyItemSurchargeCents: Number(formData.get("heavyItemSurchargeCents") ?? 0),
      stairsSurchargePerFloorCents: Number(formData.get("stairsSurchargePerFloorCents") ?? 0),
      carryDistanceSurchargePer25mCents: Number(formData.get("carryDistanceSurchargePer25mCents") ?? 0),
      parkingSurchargeMediumCents: Number(formData.get("parkingSurchargeMediumCents") ?? 0),
      parkingSurchargeHardCents: Number(formData.get("parkingSurchargeHardCents") ?? 0),
      elevatorDiscountSmallCents: Number(formData.get("elevatorDiscountSmallCents") ?? 0),
      elevatorDiscountLargeCents: Number(formData.get("elevatorDiscountLargeCents") ?? 0),
      uncertaintyPercent: Number(formData.get("uncertaintyPercent") ?? 12),
      economyMultiplier: Number(formData.get("economyMultiplier") ?? 1),
      standardMultiplier: Number(formData.get("standardMultiplier") ?? 1),
      expressMultiplier: Number(formData.get("expressMultiplier") ?? 1),
      economyLeadDays: Number(formData.get("economyLeadDays") ?? 10),
      standardLeadDays: Number(formData.get("standardLeadDays") ?? 5),
      expressLeadDays: Number(formData.get("expressLeadDays") ?? 2),
    },
  });
}

