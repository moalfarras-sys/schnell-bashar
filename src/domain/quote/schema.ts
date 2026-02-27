import { z } from "zod";

const germanPostalCodeRegex = /^\d{5}$/;
const germanStreetRegex = /[\p{L}]/u;

export const QuoteServiceContextSchema = z.enum([
  "MOVING",
  "MONTAGE",
  "ENTSORGUNG",
  "SPEZIALSERVICE",
  "COMBO",
]);

export const QuoteStatusSchema = z.enum([
  "QUOTE",
  "PENDING_SIGNATURE",
  "CONFIRMED",
  "SCHEDULED",
  "CANCELLED",
  "EXPIRED",
]);

export const QuotePackageSpeedSchema = z.enum(["ECONOMY", "STANDARD", "EXPRESS"]);

export const QuoteAddressSchema = z
  .object({
    displayName: z.string().trim().min(5).max(240),
    postalCode: z
      .string()
      .trim()
      .regex(germanPostalCodeRegex, "Bitte geben Sie eine gültige deutsche PLZ ein."),
    city: z.string().trim().min(2).max(120),
    street: z.string().trim().min(2).max(160).optional(),
    houseNumber: z.string().trim().max(40).optional(),
    state: z.string().trim().max(120).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),
  })
  .superRefine((value, ctx) => {
    if (!germanStreetRegex.test(value.displayName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bitte geben Sie eine vollständige Adresse in Deutschland ein.",
        path: ["displayName"],
      });
    }
    if ((typeof value.lat === "number") !== (typeof value.lon === "number")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Koordinaten müssen vollständig angegeben werden.",
        path: ["lat"],
      });
    }
  });

export const QuoteExtrasSchema = z.object({
  packing: z.boolean().default(false),
  stairs: z.boolean().default(false),
  express: z.boolean().default(false),
  noParkingZone: z.boolean().default(false),
  disposalBags: z.boolean().default(false),
});

export const QuoteServiceOptionSchema = z.object({
  code: z.string().trim().min(2).max(80),
  qty: z.number().int().min(1).max(50),
});

export const QuoteDraftSchema = z
  .object({
    serviceContext: QuoteServiceContextSchema,
    packageSpeed: QuotePackageSpeedSchema,
    volumeM3: z.number().min(1).max(200),
    floors: z.number().int().min(0).max(10).default(0),
    hasElevator: z.boolean().default(false),
    needNoParkingZone: z.boolean().default(false),
    fromAddress: QuoteAddressSchema.optional(),
    toAddress: QuoteAddressSchema.optional(),
    extras: QuoteExtrasSchema.default({
      packing: false,
      stairs: false,
      express: false,
      noParkingZone: false,
      disposalBags: false,
    }),
    selectedServiceOptions: z.array(QuoteServiceOptionSchema).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.serviceContext === "MOVING" || value.serviceContext === "COMBO") {
      if (!value.fromAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bitte geben Sie eine Startadresse an.",
          path: ["fromAddress"],
        });
      }
      if (!value.toAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bitte geben Sie eine Zieladresse an.",
          path: ["toAddress"],
        });
      }
    }
    if (
      (value.serviceContext === "MONTAGE" ||
        value.serviceContext === "ENTSORGUNG" ||
        value.serviceContext === "SPEZIALSERVICE") &&
      !value.toAddress
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Für diese Leistung wird eine Einsatzadresse benötigt.",
        path: ["toAddress"],
      });
    }
  });

export const QuoteResultSchema = z.object({
  distanceKm: z.number().min(0).optional(),
  distanceSource: z.enum(["approx", "ors", "cache", "fallback"]).optional(),
  driveCostCents: z.number().int().min(0).default(0),
  subtotalCents: z.number().int().min(0),
  totalCents: z.number().int().min(0),
  priceMinCents: z.number().int().min(0),
  priceMaxCents: z.number().int().min(0),
  netCents: z.number().int().min(0),
  vatCents: z.number().int().min(0),
  grossCents: z.number().int().min(0),
  packages: z.array(
    z.object({
      tier: QuotePackageSpeedSchema,
      minCents: z.number().int().min(0),
      maxCents: z.number().int().min(0),
      netCents: z.number().int().min(0),
      vatCents: z.number().int().min(0),
      grossCents: z.number().int().min(0),
    }),
  ),
  laborHours: z.number().min(0).optional(),
  packageSpeed: QuotePackageSpeedSchema,
  computedAt: z.string().datetime(),
  serviceCart: z.array(
    z.object({
      kind: z.enum(["UMZUG", "MONTAGE", "ENTSORGUNG", "SPECIAL"]),
      qty: z.number().int().min(1).max(50),
      moduleSlug: z.enum(["MONTAGE", "ENTSORGUNG", "SPECIAL"]).optional(),
      titleDe: z.string().min(2).max(120).optional(),
    }),
  ),
  servicesBreakdown: z
    .array(
      z.object({
        kind: z.enum(["UMZUG", "MONTAGE", "ENTSORGUNG", "SPECIAL"]),
        title: z.string(),
        subtotalCents: z.number().int().min(0),
        minCents: z.number().int().min(0),
        maxCents: z.number().int().min(0),
        optionTotalCents: z.number().int().min(0),
        optionCount: z.number().int().min(0),
      }),
    )
    .default([]),
  breakdown: z
    .object({
      laborHours: z.number().min(0).optional(),
      distanceKm: z.number().min(0).optional(),
      distanceSource: z.enum(["approx", "ors", "cache", "fallback"]).optional(),
      driveChargeCents: z.number().int().min(0).optional(),
      subtotalCents: z.number().int().min(0).optional(),
      serviceOptionsCents: z.number().int().min(0).optional(),
      addonsCents: z.number().int().min(0).optional(),
      minimumOrderAppliedCents: z.number().int().min(0).optional(),
      discountCents: z.number().int().min(0).optional(),
      totalCents: z.number().int().min(0).optional(),
    })
    .optional(),
});
