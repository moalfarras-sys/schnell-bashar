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

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371; // km
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

function accessExtraMinutes(access?: WizardPayload["accessPickup"]) {
  if (!access) return 0;

  const floor = access.floor ?? 0;
  const carryBlocks = Math.round(clamp(access.carryDistanceM ?? 0, 0, 200) / 25);

  const parkingMinutes =
    access.parking === "hard" ? 20 : access.parking === "medium" ? 10 : 0;

  const stairsMinutes =
    access.stairs === "many" ? 20 : access.stairs === "few" ? 10 : 0;

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
  },
  options?: {
    distanceKm?: number;
    distanceSource?: "approx" | "ors" | "cache" | "fallback";
    distancePricing?: DistancePricingConfig;
  },
): EstimateResult {
  const { catalog, pricing } = input;
  const byId = new Map(catalog.map((i) => [i.id, i]));

  const itemsMove = payload.itemsMove ?? {};
  const itemsDisposal = payload.itemsDisposal ?? {};

  const moveIds = Object.keys(itemsMove);
  const disposalIds = Object.keys(itemsDisposal);

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

  const moveVolume = calcVolume(itemsMove);
  const disposalBaseVolume = calcVolume(itemsDisposal);
  const disposalExtra = payload.disposal?.volumeExtraM3 ?? 0;
  const disposalVolume = disposalBaseVolume + disposalExtra;

  const totalVolume = moveVolume + disposalVolume;

  const heavyCount = calcHeavyCount(itemsMove) + calcHeavyCount(itemsDisposal);

  const itemMinutes = calcMinutes(itemsMove) + calcMinutes(itemsDisposal);
  const baseMinutes =
    payload.serviceType === "MOVING"
      ? 30
      : payload.serviceType === "DISPOSAL"
        ? 25
        : 45;

  const accessMinutes =
    accessExtraMinutes(payload.accessPickup) +
    accessExtraMinutes(payload.accessStart) +
    accessExtraMinutes(payload.accessDestination) +
    heavyCount * 8;

  const laborMinutes = baseMinutes + itemMinutes + accessMinutes;
  const laborHours = Math.max(1, Math.round((laborMinutes / 60) * 4) / 4); // round to 15min, min 1h

  let distanceKm: number | undefined = undefined;
  let distanceSource: EstimateResult["distanceSource"] = undefined;
  if (Number.isFinite(options?.distanceKm)) {
    distanceKm = round2(Number(options?.distanceKm));
    distanceSource = options?.distanceSource || "fallback";
  } else if (payload.startAddress && payload.destinationAddress) {
    const direct = haversineKm(payload.startAddress, payload.destinationAddress);
    distanceKm = round2(Math.max(3, direct * 1.25)); // rough road factor
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

  let subtotalCents = 0;
  if (payload.serviceType === "MOVING" || payload.serviceType === "BOTH") {
    subtotalCents += pricing.movingBaseFeeCents;
    subtotalCents += Math.round(moveVolume * pricing.perM3MovingCents);
    subtotalCents += driveChargeCents;
  }
  if (payload.serviceType === "DISPOSAL" || payload.serviceType === "BOTH") {
    subtotalCents += pricing.disposalBaseFeeCents;
    subtotalCents += Math.round(disposalVolume * pricing.perM3DisposalCents);
  }

  subtotalCents += Math.round(laborHours * pricing.hourlyRateCents);

  // Access-based surcharges (applied for each relevant address)
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

    if (a.elevator === "none" && a.floor > 0) {
      subtotalCents += a.floor * pricing.stairsSurchargePerFloorCents;
    }
    if (a.elevator === "small") subtotalCents -= pricing.elevatorDiscountSmallCents;
    if (a.elevator === "large") subtotalCents -= pricing.elevatorDiscountLargeCents;
  }

  subtotalCents += heavyCount * pricing.heavyItemSurchargeCents;

  subtotalCents = Math.max(0, subtotalCents);

  const mult = speedMultiplier(payload.timing.speed, pricing);
  const totalCents = Math.round(subtotalCents * mult);

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
      totalCents,
      priceMinCents,
      priceMaxCents,
    },
  };
}
