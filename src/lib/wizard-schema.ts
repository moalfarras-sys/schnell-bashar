import { z } from "zod";

export const serviceTypeSchema = z.enum(["MOVING", "DISPOSAL", "BOTH"]);
export const speedTypeSchema = z.enum(["ECONOMY", "STANDARD", "EXPRESS"]);
export const contactPreferenceSchema = z.enum(["PHONE", "WHATSAPP", "EMAIL"]);
export const bookingContextSchema = z.enum(["STANDARD", "MONTAGE", "ENTSORGUNG", "SPECIAL"]);
export const packageTierSchema = z.enum(["STANDARD", "PLUS", "PREMIUM"]);
export const serviceCartKindSchema = z.enum(["UMZUG", "MONTAGE", "ENTSORGUNG", "SPECIAL"]);

export const addonKeySchema = z.enum([
  "PACKING",
  "DISMANTLE_ASSEMBLE",
  "OLD_KITCHEN_DISPOSAL",
  "BASEMENT_ATTIC_CLEARING",
]);

export const addressSchema = z.object({
  displayName: z.string().min(3),
  postalCode: z.string().regex(/^\d{5}$/),
  city: z.string().min(1),
  state: z.string().optional(),
  street: z.string().optional(),
  houseNumber: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
});

export const accessSchema = z.object({
  propertyType: z.enum(["apartment", "house", "office", "storage"]),
  floor: z.number().int().min(-1).max(30),
  elevator: z.enum(["none", "small", "large"]),
  stairs: z.enum(["none", "few", "many"]),
  parking: z.enum(["easy", "medium", "hard"]),
  needNoParkingZone: z.boolean(),
  carryDistanceM: z.number().int().min(0).max(200),
});

export const itemQtySchema = z.record(z.string(), z.number().int().min(0).max(20));

export const disposalSchema = z.object({
  categories: z
    .array(
      z.enum(["mixed", "wood", "metal", "electronics", "textiles", "cardboard"]),
    )
    .default([]),
  volumeExtraM3: z.number().min(0).max(20).default(0),
  forbiddenConfirmed: z.boolean(),
});

export const serviceSelectionSchema = z.object({
  code: z.string().trim().min(2).max(80),
  qty: z.number().int().min(1).max(50).default(1),
  meta: z.record(z.string(), z.any()).optional(),
});

export const serviceCartItemSchema = z.object({
  kind: serviceCartKindSchema,
  moduleSlug: z.enum(["MONTAGE", "ENTSORGUNG", "SPECIAL"]).optional(),
  titleDe: z.string().trim().min(2).max(120).optional(),
  qty: z.number().int().min(1).max(50).default(1),
  details: z.record(z.string(), z.any()).optional(),
});

export const timingSchema = z
  .object({
    speed: speedTypeSchema,
    requestedFrom: z.string().datetime().optional(),
    requestedTo: z.string().datetime().optional(),
    preferredFrom: z.string().datetime().optional(),
    preferredTo: z.string().datetime().optional(),
    preferredTimeWindow: z
      .enum(["MORNING", "AFTERNOON", "EVENING", "FLEXIBLE"])
      .default("FLEXIBLE"),
    // Legacy compatibility during migration window.
    selectedSlotStart: z.string().datetime().optional(),
    jobDurationMinutes: z.number().int().min(60).max(24 * 60),
  })
  .superRefine((value, ctx) => {
    const requestedFrom = value.requestedFrom ?? value.preferredFrom ?? value.selectedSlotStart;
    const requestedTo = value.requestedTo ?? value.preferredTo ?? requestedFrom;
    if (!requestedFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "requestedFrom fehlt",
        path: ["requestedFrom"],
      });
    }
    if (!requestedTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "requestedTo fehlt",
        path: ["requestedTo"],
      });
    }
  })
  .transform((value) => {
    const requestedFrom = value.requestedFrom ?? value.preferredFrom ?? value.selectedSlotStart!;
    const requestedTo = value.requestedTo ?? value.preferredTo ?? requestedFrom;
    return {
      speed: value.speed,
      requestedFrom,
      requestedTo,
      preferredTimeWindow: value.preferredTimeWindow ?? "FLEXIBLE",
      jobDurationMinutes: value.jobDurationMinutes,
    };
  });

export const customerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(6).max(30),
  email: z.string().email(),
  contactPreference: contactPreferenceSchema,
  note: z.string().max(300).optional().default(""),
});

export const wizardPayloadSchema = z.object({
  payloadVersion: z.number().int().min(1).max(10).default(2),
  bookingContext: bookingContextSchema.default("STANDARD"),
  packageTier: packageTierSchema.default("PLUS"),
  serviceCart: z.array(serviceCartItemSchema).default([]),
  serviceDetailsByKind: z
    .record(
      serviceCartKindSchema,
      z.object({
        note: z.string().max(500).optional(),
        meta: z.record(z.string(), z.any()).optional(),
      }),
    )
    .optional(),
  selectedServiceOptions: z.array(serviceSelectionSchema).default([]),
  offerContext: z
    .object({
      offerCode: z.string().trim().min(2).max(50).optional(),
      ruleId: z.string().trim().min(2).max(64).optional(),
      appliedDiscountPercent: z.number().min(0).max(100).optional(),
      appliedDiscountCents: z.number().int().min(0).optional(),
      validUntil: z.string().datetime().optional(),
    })
    .optional(),
  serviceType: serviceTypeSchema,
  addons: z.array(addonKeySchema).default([]),

  // Locations
  pickupAddress: addressSchema.optional(),
  startAddress: addressSchema.optional(),
  destinationAddress: addressSchema.optional(),

  // Access (only relevant addresses must be provided)
  accessPickup: accessSchema.optional(),
  accessStart: accessSchema.optional(),
  accessDestination: accessSchema.optional(),

  // Catalog selections
  itemsMove: itemQtySchema.default({}),
  itemsDisposal: itemQtySchema.default({}),

  // Disposal details
  disposal: disposalSchema.optional(),

  timing: timingSchema,
  customer: customerSchema,
});

export type WizardPayload = z.infer<typeof wizardPayloadSchema>;

