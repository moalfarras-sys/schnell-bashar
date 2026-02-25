import { z } from "zod";

export const serviceTypeSchema = z.enum(["MOVING", "DISPOSAL", "BOTH"]);
export const speedTypeSchema = z.enum(["ECONOMY", "STANDARD", "EXPRESS"]);
export const contactPreferenceSchema = z.enum(["PHONE", "WHATSAPP", "EMAIL"]);
export const bookingContextSchema = z.enum(["STANDARD", "MONTAGE", "ENTSORGUNG"]);

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
  lat: z.number(),
  lon: z.number(),
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

export const timingSchema = z.object({
  speed: speedTypeSchema,
  preferredFrom: z.string().datetime(),
  preferredTo: z.string().datetime(),
  selectedSlotStart: z.string().datetime(),
  jobDurationMinutes: z.number().int().min(60).max(24 * 60),
});

export const customerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(6).max(30),
  email: z.string().email(),
  contactPreference: contactPreferenceSchema,
  note: z.string().max(300).optional().default(""),
});

export const wizardPayloadSchema = z.object({
  bookingContext: bookingContextSchema.default("STANDARD"),
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

