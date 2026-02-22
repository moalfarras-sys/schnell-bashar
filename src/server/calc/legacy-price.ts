import {
  calculateDriveChargeCents,
  resolveDistancePricingConfig,
} from "@/server/calc/distance-pricing";

export type LegacyServiceType = "UMZUG" | "ENTSORGUNG" | "KOMBI";
export type LegacySpeedType = "ECONOMY" | "STANDARD" | "EXPRESS";
export type LegacyAddon =
  | "PACKING"
  | "DISMANTLE_ASSEMBLE"
  | "HALTEVERBOT"
  | "ENTRUEMPELUNG";

export type LegacyPricing = {
  movingBaseFeeCents: number;
  disposalBaseFeeCents: number;
  perM3MovingCents: number;
  perM3DisposalCents: number;
  stairsSurchargePerFloorCents: number;
  parkingSurchargeHardCents: number;
  uncertaintyPercent: number;
  economyMultiplier: number;
  standardMultiplier: number;
  expressMultiplier: number;
  perKmCents: number;
};

export type LegacyEstimateInput = {
  serviceType: LegacyServiceType;
  speed: LegacySpeedType;
  volumeM3: number;
  floors: number;
  hasElevator?: boolean;
  needNoParkingZone: boolean;
  addons: LegacyAddon[];
  distanceKm?: number;
};

export type LegacyEstimateResult = {
  priceNet: number;
  vat: number;
  priceGross: number;
  breakdown: {
    baseCents: number;
    volumeCents: number;
    floorsCents: number;
    parkingCents: number;
    addonsCents: number;
    driveChargeCents: number;
    subtotalCents: number;
    minCents: number;
    maxCents: number;
    distanceKm?: number;
    distanceSource?: "approx" | "ors" | "cache" | "fallback";
  };
};

const ADDON_SURCHARGES_CENTS: Record<LegacyAddon, number> = {
  PACKING: 2500,
  DISMANTLE_ASSEMBLE: 3500,
  HALTEVERBOT: 12000,
  ENTRUEMPELUNG: 4000,
};

export function calculateLegacyPrice(
  input: LegacyEstimateInput,
  pricing: LegacyPricing,
  options?: {
    distanceSource?: "approx" | "ors" | "cache" | "fallback";
  },
): LegacyEstimateResult {
  const { serviceType, speed, volumeM3, floors, hasElevator, needNoParkingZone, addons, distanceKm } =
    input;

  let baseCents: number;
  let volumeCents: number;

  if (serviceType === "UMZUG") {
    baseCents = pricing.movingBaseFeeCents;
    volumeCents = volumeM3 * pricing.perM3MovingCents;
  } else if (serviceType === "ENTSORGUNG") {
    baseCents = pricing.disposalBaseFeeCents;
    volumeCents = volumeM3 * pricing.perM3DisposalCents;
  } else {
    baseCents = pricing.movingBaseFeeCents + pricing.disposalBaseFeeCents;
    volumeCents = (volumeM3 * (pricing.perM3MovingCents + pricing.perM3DisposalCents)) / 2;
  }

  const floorsCents =
    floors > 0 && !hasElevator ? floors * pricing.stairsSurchargePerFloorCents : 0;
  const parkingCents = needNoParkingZone ? pricing.parkingSurchargeHardCents : 0;

  let addonsCents = 0;
  for (const addon of addons) {
    addonsCents += ADDON_SURCHARGES_CENTS[addon] ?? 0;
  }

  const distancePricing = resolveDistancePricingConfig(pricing.perKmCents);
  const driveChargeCents =
    serviceType === "UMZUG" || serviceType === "KOMBI"
      ? calculateDriveChargeCents(distanceKm, distancePricing)
      : 0;

  let subtotalCents = Math.round(
    baseCents + volumeCents + floorsCents + parkingCents + addonsCents + driveChargeCents,
  );

  const speedMult =
    speed === "ECONOMY"
      ? pricing.economyMultiplier
      : speed === "EXPRESS"
        ? pricing.expressMultiplier
        : pricing.standardMultiplier;
  subtotalCents = Math.round(subtotalCents * speedMult);

  const uncertainty = pricing.uncertaintyPercent / 100;
  const minCents = Math.max(0, Math.round(subtotalCents * (1 - uncertainty)));
  const maxCents = Math.round(subtotalCents * (1 + uncertainty));

  const netCents = maxCents;
  const vatCents = Math.round(netCents * 0.19);
  const grossCents = netCents + vatCents;

  return {
    priceNet: netCents,
    vat: vatCents,
    priceGross: grossCents,
    breakdown: {
      baseCents: Math.round(baseCents),
      volumeCents: Math.round(volumeCents),
      floorsCents: Math.round(floorsCents),
      parkingCents: Math.round(parkingCents),
      addonsCents: Math.round(addonsCents),
      driveChargeCents: Math.round(driveChargeCents),
      subtotalCents,
      minCents,
      maxCents,
      distanceKm,
      distanceSource: options?.distanceSource,
    },
  };
}

