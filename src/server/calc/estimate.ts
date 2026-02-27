import type { WizardPayload } from "@/lib/wizard-schema";
import { calculateDriveChargeCents, type DistancePricingConfig } from "./distance-pricing";

export type CatalogItemLite = {
  id: string;
  nameDe: string;
  categoryKey: string;
  defaultVolumeM3: number;
  laborMinutesPerUnit: number;
  isHeavy: boolean;
};

export type PricingConfigLite = {
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
  montageBaseFeeCents?: number;
  entsorgungBaseFeeCents?: number;
  montageStandardMultiplier?: number;
  montagePlusMultiplier?: number;
  montagePremiumMultiplier?: number;
  entsorgungStandardMultiplier?: number;
  entsorgungPlusMultiplier?: number;
  entsorgungPremiumMultiplier?: number;
  montageMinimumOrderCents?: number;
  entsorgungMinimumOrderCents?: number;
};

export type ServiceOptionLite = {
  code: string;
  moduleSlug: "MONTAGE" | "ENTSORGUNG" | "SPECIAL";
  pricingType: "FLAT" | "PER_UNIT" | "PER_M3" | "PER_HOUR";
  defaultPriceCents: number;
  defaultLaborMinutes: number;
  isHeavy: boolean;
  requiresQuantity: boolean;
};

export type PromoRuleLite = {
  id?: string;
  code: string;
  moduleSlug: "MONTAGE" | "ENTSORGUNG" | "SPECIAL" | null;
  serviceTypeScope: WizardPayload["serviceType"] | null;
  discountType: "PERCENT" | "FLAT_CENTS";
  discountValue: number;
  minOrderCents: number;
  maxDiscountCents: number | null;
};

export type EstimateBreakdown = {
  moveVolumeM3: number;
  disposalVolumeM3: number;
  totalVolumeM3: number;
  heavyItemCount: number;
  baseMinutes: number;
  itemMinutes: number;
  accessMinutes: number;
  laborMinutes: number;
  laborHours: number;
  distanceKm?: number;
  distanceSource?: "approx" | "ors" | "cache" | "fallback";
  driveChargeCents: number;
  subtotalCents: number;
  packageTier: "STANDARD" | "PLUS" | "PREMIUM";
  packageMultiplier: number;
  packageAdjustmentCents: number;
  serviceOptionsCents: number;
  addonsCents: number;
  minimumOrderAppliedCents: number;
  discountCents: number;
  totalCents: number;
  priceMinCents: number;
  priceMaxCents: number;
};

export type EstimateResult = {
  currency: string;
  priceMinCents: number;
  priceMaxCents: number;
  laborHours: number;
  totalVolumeM3: number;
  distanceKm?: number;
  distanceSource?: "approx" | "ors" | "cache" | "fallback";
  driveChargeCents: number;
  breakdown: EstimateBreakdown;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function bookingModuleSlug(context?: WizardPayload["bookingContext"]) {
  if (context === "MONTAGE") return "MONTAGE" as const;
  if (context === "ENTSORGUNG") return "ENTSORGUNG" as const;
  if (context === "SPECIAL") return "SPECIAL" as const;
  return undefined;
}

function packageMultiplierFor(
  serviceType: WizardPayload["serviceType"],
  tier: WizardPayload["packageTier"],
  pricing: PricingConfigLite,
  moduleSlug?: "MONTAGE" | "ENTSORGUNG" | "SPECIAL",
) {
  if (moduleSlug === "MONTAGE") {
    if (tier === "STANDARD") return pricing.montageStandardMultiplier ?? 0.98;
    if (tier === "PREMIUM") return pricing.montagePremiumMultiplier ?? 1.12;
    return pricing.montagePlusMultiplier ?? 1;
  }
  if (moduleSlug === "ENTSORGUNG") {
    if (tier === "STANDARD") return pricing.entsorgungStandardMultiplier ?? 0.96;
    if (tier === "PREMIUM") return pricing.entsorgungPremiumMultiplier ?? 1.1;
    return pricing.entsorgungPlusMultiplier ?? 1;
  }
  if (moduleSlug === "SPECIAL") {
    if (tier === "STANDARD") return pricing.montageStandardMultiplier ?? 0.98;
    if (tier === "PREMIUM") return pricing.montagePremiumMultiplier ?? 1.12;
    return pricing.montagePlusMultiplier ?? 1;
  }

  const map: Record<WizardPayload["serviceType"], Record<WizardPayload["packageTier"], number>> =
    {
      MOVING: { STANDARD: 0.96, PLUS: 1, PREMIUM: 1.12 },
      DISPOSAL: { STANDARD: 0.94, PLUS: 1, PREMIUM: 1.1 },
      BOTH: { STANDARD: 0.95, PLUS: 1, PREMIUM: 1.11 },
    };
  return map[serviceType][tier];
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function speedMultiplier(speed: WizardPayload["timing"]["speed"], p: PricingConfigLite) {
  switch (speed) {
    case "ECONOMY":
      return p.economyMultiplier;
    case "EXPRESS":
      return p.expressMultiplier;
    default:
      return p.standardMultiplier;
  }
}

const ADDON_SURCHARGES_CENTS: Record<WizardPayload["addons"][number], number> = {
  PACKING: 2500,
  DISMANTLE_ASSEMBLE: 3500,
  OLD_KITCHEN_DISPOSAL: 6000,
  BASEMENT_ATTIC_CLEARING: 4000,
};

function accessExtraMinutes(access?: WizardPayload["accessPickup"]) {
  if (!access) return 0;

  const floor = access.floor ?? 0;
  const carryBlocks = Math.round(clamp(access.carryDistanceM ?? 0, 0, 200) / 25);

  const parkingMinutes = access.parking === "hard" ? 20 : access.parking === "medium" ? 10 : 0;
  const stairsMinutes = access.stairs === "many" ? 20 : access.stairs === "few" ? 10 : 0;

  const floorMinutes =
    access.elevator === "none"
      ? floor > 0
        ? floor * 6
        : floor < 0
          ? Math.abs(floor) * 4
          : 0
      : 0;

  const carryMinutes = carryBlocks * 5;

  return parkingMinutes + stairsMinutes + floorMinutes + carryMinutes;
}

export function estimateOrder(
  payload: WizardPayload,
  input: {
    catalog: CatalogItemLite[];
    pricing: PricingConfigLite;
    serviceOptions?: ServiceOptionLite[];
  },
  options?: {
    distanceKm?: number;
    distanceSource?: "approx" | "ors" | "cache" | "fallback";
    distancePricing?: DistancePricingConfig;
    promoRule?: PromoRuleLite | null;
  },
): EstimateResult {
  const { catalog, pricing, serviceOptions = [] } = input;
  const byId = new Map(catalog.map((i) => [i.id, i]));
  const byServiceCode = new Map(serviceOptions.map((i) => [i.code, i]));
  const moduleSlug = bookingModuleSlug(payload.bookingContext);

  const itemsMove = payload.itemsMove ?? {};
  const itemsDisposal = payload.itemsDisposal ?? {};
  const selectedServiceOptions = payload.selectedServiceOptions ?? [];
  const addons = payload.addons ?? [];

  const calcVolume = (items: Record<string, number>) => {
    let v = 0;
    for (const [id, qty] of Object.entries(items)) {
      const item = byId.get(id);
      if (!item) continue;
      v += (qty || 0) * item.defaultVolumeM3;
    }
    return v;
  };

  const calcMinutes = (items: Record<string, number>) => {
    let m = 0;
    for (const [id, qty] of Object.entries(items)) {
      const item = byId.get(id);
      if (!item) continue;
      m += (qty || 0) * item.laborMinutesPerUnit;
    }
    return m;
  };

  const calcHeavyCount = (items: Record<string, number>) => {
    let c = 0;
    for (const [id, qty] of Object.entries(items)) {
      const item = byId.get(id);
      if (!item?.isHeavy) continue;
      c += qty || 0;
    }
    return c;
  };

  const serviceOptionExtraMinutes = selectedServiceOptions.reduce((sum, selected) => {
    const option = byServiceCode.get(selected.code);
    if (!option) return sum;
    if (moduleSlug && option.moduleSlug !== moduleSlug) return sum;
    const qty = option.requiresQuantity ? Math.max(1, selected.qty || 1) : 1;
    return sum + option.defaultLaborMinutes * qty;
  }, 0);

  const serviceOptionHeavyCount = selectedServiceOptions.reduce((sum, selected) => {
    const option = byServiceCode.get(selected.code);
    if (!option?.isHeavy) return sum;
    if (moduleSlug && option.moduleSlug !== moduleSlug) return sum;
    const qty = option.requiresQuantity ? Math.max(1, selected.qty || 1) : 1;
    return sum + qty;
  }, 0);

  const moveVolume = calcVolume(itemsMove);
  const disposalBaseVolume = calcVolume(itemsDisposal);
  const disposalExtra = payload.disposal?.volumeExtraM3 ?? 0;
  const disposalVolume = disposalBaseVolume + disposalExtra;
  const totalVolume = moveVolume + disposalVolume;

  const heavyCount =
    calcHeavyCount(itemsMove) + calcHeavyCount(itemsDisposal) + serviceOptionHeavyCount;

  const itemMinutes =
    calcMinutes(itemsMove) + calcMinutes(itemsDisposal) + serviceOptionExtraMinutes;
  const baseMinutes =
    payload.serviceType === "MOVING" ? 30 : payload.serviceType === "DISPOSAL" ? 25 : 45;

  const accessMinutes =
    accessExtraMinutes(payload.accessPickup) +
    accessExtraMinutes(payload.accessStart) +
    accessExtraMinutes(payload.accessDestination) +
    heavyCount * 8;

  const laborMinutes = baseMinutes + itemMinutes + accessMinutes;
  const laborHours = Math.max(1, Math.round((laborMinutes / 60) * 4) / 4);

  let distanceKm: number | undefined;
  let distanceSource: EstimateResult["distanceSource"];
  if (Number.isFinite(options?.distanceKm)) {
    distanceKm = round2(Number(options?.distanceKm));
    distanceSource = options?.distanceSource || "fallback";
  } else if (payload.startAddress && payload.destinationAddress) {
    const direct = haversineKm(payload.startAddress, payload.destinationAddress);
    distanceKm = round2(Math.max(3, direct * 1.25));
    distanceSource = "approx";
  }

  const distancePricing = options?.distancePricing || {
    perKmCents: pricing.perKmCents,
    minDriveCents: 0,
  };
  const driveChargeCents =
    payload.serviceType === "MOVING" || payload.serviceType === "BOTH"
      ? calculateDriveChargeCents(distanceKm, distancePricing)
      : 0;

  const isMontage = payload.bookingContext === "MONTAGE";
  const isEntsorgung = payload.bookingContext === "ENTSORGUNG";

  let subtotalCents = 0;
  if (payload.serviceType === "MOVING" || payload.serviceType === "BOTH") {
    subtotalCents += isMontage
      ? pricing.montageBaseFeeCents ?? pricing.movingBaseFeeCents
      : pricing.movingBaseFeeCents;
    subtotalCents += Math.round(moveVolume * pricing.perM3MovingCents);
    subtotalCents += driveChargeCents;
  }
  if (payload.serviceType === "DISPOSAL" || payload.serviceType === "BOTH") {
    subtotalCents += isEntsorgung
      ? pricing.entsorgungBaseFeeCents ?? pricing.disposalBaseFeeCents
      : pricing.disposalBaseFeeCents;
    subtotalCents += Math.round(disposalVolume * pricing.perM3DisposalCents);
  }

  subtotalCents += Math.round(laborHours * pricing.hourlyRateCents);

  const accessSurcharges = [
    payload.accessPickup,
    payload.accessStart,
    payload.accessDestination,
  ].filter(Boolean) as NonNullable<WizardPayload["accessPickup"]>[];

  for (const a of accessSurcharges) {
    if (a.parking === "medium") subtotalCents += pricing.parkingSurchargeMediumCents;
    if (a.parking === "hard") subtotalCents += pricing.parkingSurchargeHardCents;

    const carryBlocks = Math.round(clamp(a.carryDistanceM ?? 0, 0, 200) / 25);
    subtotalCents += carryBlocks * pricing.carryDistanceSurchargePer25mCents;

    if (a.elevator === "none" && a.floor > 0) subtotalCents += a.floor * pricing.stairsSurchargePerFloorCents;
    if (a.elevator === "small") subtotalCents -= pricing.elevatorDiscountSmallCents;
    if (a.elevator === "large") subtotalCents -= pricing.elevatorDiscountLargeCents;
  }

  subtotalCents += heavyCount * pricing.heavyItemSurchargeCents;

  const serviceOptionsCents = selectedServiceOptions.reduce((sum, selected) => {
    const option = byServiceCode.get(selected.code);
    if (!option) return sum;
    if (moduleSlug && option.moduleSlug !== moduleSlug) return sum;
    const qty = option.requiresQuantity ? Math.max(1, selected.qty || 1) : 1;
    if (option.pricingType === "FLAT") return sum + option.defaultPriceCents;
    if (option.pricingType === "PER_UNIT") return sum + option.defaultPriceCents * qty;
    if (option.pricingType === "PER_M3") return sum + option.defaultPriceCents * qty;
    if (option.pricingType === "PER_HOUR") return sum + Math.round(option.defaultPriceCents * laborHours);
    return sum;
  }, 0);

  subtotalCents += serviceOptionsCents;
  const addonsCents = addons.reduce((sum, addon) => sum + (ADDON_SURCHARGES_CENTS[addon] ?? 0), 0);
  subtotalCents += addonsCents;
  subtotalCents = Math.max(0, subtotalCents);

  const speedMult = speedMultiplier(payload.timing.speed, pricing);
  const packageTier = payload.packageTier ?? "PLUS";
  const packageMultiplier = packageMultiplierFor(payload.serviceType, packageTier, pricing, moduleSlug);
  const subtotalWithSpeed = Math.round(subtotalCents * speedMult);
  const totalAfterPackage = Math.round(subtotalWithSpeed * packageMultiplier);
  const packageAdjustmentCents = totalAfterPackage - subtotalWithSpeed;

  let discountCents = 0;
  if (options?.promoRule) {
    const promo = options.promoRule;
    const meetsMin = totalAfterPackage >= Math.max(0, promo.minOrderCents || 0);
    const serviceMatches = !promo.serviceTypeScope || promo.serviceTypeScope === payload.serviceType;
    const moduleMatches = !promo.moduleSlug || promo.moduleSlug === moduleSlug;
    if (meetsMin && serviceMatches && moduleMatches) {
      const rawDiscount =
        promo.discountType === "PERCENT"
          ? Math.round(totalAfterPackage * (clamp(promo.discountValue, 0, 100) / 100))
          : Math.max(0, promo.discountValue);
      const maxAllowed = promo.maxDiscountCents != null ? Math.max(0, promo.maxDiscountCents) : rawDiscount;
      discountCents = Math.min(rawDiscount, maxAllowed);
    }
  } else {
    const discountFromPercent = payload.offerContext?.appliedDiscountPercent
      ? Math.round(totalAfterPackage * (clamp(payload.offerContext.appliedDiscountPercent, 0, 100) / 100))
      : 0;
    const discountFromCents = payload.offerContext?.appliedDiscountCents ?? 0;
    discountCents = Math.max(0, discountFromPercent + discountFromCents);
  }

  const minOrderCents =
    moduleSlug === "MONTAGE"
      ? Math.max(0, pricing.montageMinimumOrderCents ?? 0)
      : moduleSlug === "ENTSORGUNG"
        ? Math.max(0, pricing.entsorgungMinimumOrderCents ?? 0)
        : moduleSlug === "SPECIAL"
          ? Math.max(0, pricing.montageMinimumOrderCents ?? 0)
        : 0;

  const totalAfterDiscount = Math.max(0, totalAfterPackage - discountCents);
  const totalCents = Math.max(totalAfterDiscount, minOrderCents);
  const minimumOrderAppliedCents = Math.max(0, totalCents - totalAfterDiscount);

  const u = clamp(pricing.uncertaintyPercent, 0, 30) / 100;
  const priceMinCents = Math.max(0, Math.round(totalCents * (1 - u)));
  const priceMaxCents = Math.max(priceMinCents, Math.round(totalCents * (1 + u)));

  return {
    currency: pricing.currency,
    priceMinCents,
    priceMaxCents,
    laborHours,
    totalVolumeM3: round2(totalVolume),
    distanceKm,
    distanceSource,
    driveChargeCents,
    breakdown: {
      moveVolumeM3: round2(moveVolume),
      disposalVolumeM3: round2(disposalVolume),
      totalVolumeM3: round2(totalVolume),
      heavyItemCount: heavyCount,
      baseMinutes,
      itemMinutes,
      accessMinutes,
      laborMinutes,
      laborHours,
      distanceKm,
      distanceSource,
      driveChargeCents,
      subtotalCents,
      packageTier,
      packageMultiplier,
      packageAdjustmentCents,
      serviceOptionsCents,
      addonsCents,
      minimumOrderAppliedCents,
      discountCents,
      totalCents,
      priceMinCents,
      priceMaxCents,
    },
  };
}
