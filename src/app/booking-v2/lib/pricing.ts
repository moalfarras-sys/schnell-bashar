export type BookingService = "MOVING" | "DISPOSAL" | "ASSEMBLY" | "COMBO";

export type ExtrasState = {
  packing: boolean;
  stairs: boolean;
  express: boolean;
  noParkingZone: boolean;
  disposalBags: boolean;
};

export type PriceInput = {
  service: BookingService;
  distanceKm: number;
  volumeM3: number;
  extras: ExtrasState;
};

export type PriceOutput = {
  basePrice: number;
  distanceCost: number;
  volumeCost: number;
  extrasCost: number;
  serviceMultiplier: number;
  minimumApplied: boolean;
  totalPrice: number;
  estimatedHours: number;
  tier: "Basis" | "Plus" | "Premium";
};

const serviceConfig: Record<
  BookingService,
  { base: number; perKm: number; perM3: number; multiplier: number; minimum: number }
> = {
  MOVING: { base: 160, perKm: 2.6, perM3: 14.5, multiplier: 1, minimum: 190 },
  DISPOSAL: { base: 120, perKm: 2.2, perM3: 11.5, multiplier: 0.95, minimum: 145 },
  ASSEMBLY: { base: 140, perKm: 1.9, perM3: 9.5, multiplier: 1.08, minimum: 170 },
  COMBO: { base: 210, perKm: 2.9, perM3: 17.5, multiplier: 1.15, minimum: 260 },
};

const extrasPrice = {
  packing: 45,
  stairs: 35,
  express: 70,
  noParkingZone: 55,
  disposalBags: 20,
} as const;

export function calculateBookingPrice(input: PriceInput): PriceOutput {
  const cfg = serviceConfig[input.service];

  const basePrice = cfg.base;
  const distanceCost = Math.max(0, input.distanceKm) * cfg.perKm;
  const volumeCost = Math.max(0, input.volumeM3) * cfg.perM3;
  const extrasCost =
    (input.extras.packing ? extrasPrice.packing : 0) +
    (input.extras.stairs ? extrasPrice.stairs : 0) +
    (input.extras.express ? extrasPrice.express : 0) +
    (input.extras.noParkingZone ? extrasPrice.noParkingZone : 0) +
    (input.extras.disposalBags ? extrasPrice.disposalBags : 0);

  const raw = (basePrice + distanceCost + volumeCost + extrasCost) * cfg.multiplier;
  const totalPrice = Math.max(raw, cfg.minimum);
  const minimumApplied = totalPrice !== raw;

  const estimatedHours = Math.max(1.5, 1.2 + input.volumeM3 * 0.22 + input.distanceKm * 0.04 + (input.extras.stairs ? 0.6 : 0));

  const tier = totalPrice < 320 ? "Basis" : totalPrice < 560 ? "Plus" : "Premium";

  return {
    basePrice,
    distanceCost,
    volumeCost,
    extrasCost,
    serviceMultiplier: cfg.multiplier,
    minimumApplied,
    totalPrice,
    estimatedHours,
    tier,
  };
}

export function formatEuro(value: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}
