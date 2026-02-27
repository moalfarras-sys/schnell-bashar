export type BookingService = "MOVING" | "DISPOSAL" | "ASSEMBLY" | "COMBO";

export type BookingSpeed = "ECONOMY" | "STANDARD" | "EXPRESS";

export type BookingContext = "STANDARD" | "MONTAGE" | "ENTSORGUNG";

export type ApiServiceType = "UMZUG" | "ENTSORGUNG" | "KOMBI" | "MONTAGE";

export type WizardServiceType = "MOVING" | "DISPOSAL" | "BOTH";

export type WizardPackageTier = "STANDARD" | "PLUS" | "PREMIUM";

export type PriceCalcPackage = {
  tier: BookingSpeed;
  minCents: number;
  maxCents: number;
  netCents: number;
  vatCents: number;
  grossCents: number;
};

export type PriceCalcResponse = {
  serviceCart: Array<{
    kind: "UMZUG" | "MONTAGE" | "ENTSORGUNG" | "SPECIAL";
    qty: number;
    moduleSlug?: "MONTAGE" | "ENTSORGUNG" | "SPECIAL";
    titleDe?: string;
  }>;
  packages: PriceCalcPackage[];
  totals: PriceCalcPackage;
  breakdown?: {
    laborHours?: number;
    distanceKm?: number;
    distanceSource?: "approx" | "ors" | "cache" | "fallback";
    driveChargeCents?: number;
    subtotalCents?: number;
    serviceOptionsCents?: number;
    addonsCents?: number;
    minimumOrderAppliedCents?: number;
    discountCents?: number;
    totalCents?: number;
  };
  servicesBreakdown?: Array<{
    title: string;
    subtotalCents: number;
    minCents: number;
    maxCents: number;
    optionTotalCents: number;
  }>;
  lineItems?: Array<{
    code: string;
    label: string;
    amountCents: number;
    quantity?: number;
    unit?: string;
  }>;
};

export function formatEuroFromCents(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function toApiServiceType(service: BookingService): ApiServiceType {
  if (service === "DISPOSAL") return "ENTSORGUNG";
  if (service === "ASSEMBLY") return "MONTAGE";
  if (service === "COMBO") return "KOMBI";
  return "UMZUG";
}

export function toWizardServiceType(service: BookingService): WizardServiceType {
  if (service === "DISPOSAL") return "DISPOSAL";
  if (service === "COMBO") return "BOTH";
  return "MOVING";
}

export function toBookingContext(service: BookingService): BookingContext {
  if (service === "ASSEMBLY") return "MONTAGE";
  if (service === "DISPOSAL") return "ENTSORGUNG";
  return "STANDARD";
}

export function toWizardPackageTier(speed: BookingSpeed): WizardPackageTier {
  if (speed === "ECONOMY") return "STANDARD";
  if (speed === "EXPRESS") return "PREMIUM";
  return "PLUS";
}

export function toServiceCart(service: BookingService) {
  if (service === "DISPOSAL") {
    return [{ kind: "ENTSORGUNG" as const, qty: 1, moduleSlug: "ENTSORGUNG" as const, titleDe: "Entsorgung" }];
  }
  if (service === "ASSEMBLY") {
    return [{ kind: "MONTAGE" as const, qty: 1, moduleSlug: "MONTAGE" as const, titleDe: "Montage" }];
  }
  if (service === "COMBO") {
    return [
      { kind: "UMZUG" as const, qty: 1, titleDe: "Umzug" },
      { kind: "ENTSORGUNG" as const, qty: 1, moduleSlug: "ENTSORGUNG" as const, titleDe: "Entsorgung" },
    ];
  }
  return [{ kind: "UMZUG" as const, qty: 1, titleDe: "Umzug" }];
}

export function serviceLabel(service: BookingService) {
  if (service === "DISPOSAL") return "Entsorgung";
  if (service === "ASSEMBLY") return "Montage";
  if (service === "COMBO") return "Umzug + Entsorgung";
  return "Umzug";
}
