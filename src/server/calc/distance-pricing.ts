export type DistancePricingConfig = {
  perKmCents: number;
  minDriveCents: number;
};

function toCents(raw: number): number {
  return Math.round(raw * 100);
}

function parseEnvMoney(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function resolveDistancePricingConfig(fallbackPerKmCents: number): DistancePricingConfig {
  const perKmEur = parseEnvMoney(process.env.PER_KM_PRICE);
  const minDriveEur = parseEnvMoney(process.env.MIN_DRIVE_PRICE);

  return {
    perKmCents: perKmEur != null ? toCents(perKmEur) : fallbackPerKmCents,
    minDriveCents: minDriveEur != null ? toCents(minDriveEur) : 0,
  };
}

export function calculateDriveChargeCents(
  distanceKm: number | undefined,
  config: DistancePricingConfig,
): number {
  if (!distanceKm || !Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  const byDistance = Math.round(distanceKm * config.perKmCents);
  return Math.max(config.minDriveCents, byDistance);
}

