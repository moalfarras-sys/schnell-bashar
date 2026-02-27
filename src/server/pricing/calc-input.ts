import { z } from "zod";

import type { QuoteDraft } from "@/domain/quote/types";

const serviceKindSchema = z.enum(["UMZUG", "MONTAGE", "ENTSORGUNG", "SPECIAL"]);
const speedSchema = z.enum(["ECONOMY", "STANDARD", "EXPRESS"]);
const addonSchema = z.enum([
  "PACKING",
  "DISMANTLE_ASSEMBLE",
  "OLD_KITCHEN_DISPOSAL",
  "BASEMENT_ATTIC_CLEARING",
]);

export const calcInputSchema = z.object({
  serviceType: z.enum(["UMZUG", "ENTSORGUNG", "KOMBI", "MONTAGE", "SPECIAL"]).default("UMZUG"),
  serviceCart: z
    .array(
      z.object({
        kind: serviceKindSchema,
      }),
    )
    .default([]),
  speed: speedSchema.default("STANDARD"),
  volumeM3: z.coerce.number().min(1).max(200).default(12),
  floors: z.coerce.number().int().min(0).max(10).default(0),
  hasElevator: z.boolean().default(false),
  needNoParkingZone: z.boolean().default(false),
  selectedServiceOptions: z
    .array(
      z.object({
        code: z.string().trim().min(2).max(80),
        qty: z.coerce.number().int().min(1).max(50),
      }),
    )
    .default([]),
  promoCode: z.string().trim().min(3).max(40).optional(),
  addons: z.array(addonSchema).default([]),
  extras: z
    .object({
      packing: z.boolean().optional(),
      stairs: z.boolean().optional(),
      express: z.boolean().optional(),
      noParkingZone: z.boolean().optional(),
      disposalBags: z.boolean().optional(),
    })
    .optional(),
  fromAddress: z.string().trim().optional(),
  toAddress: z.string().trim().optional(),
  fromAddressObject: z
    .object({
      displayName: z.string(),
      postalCode: z.string(),
      city: z.string(),
      state: z.string().optional(),
      street: z.string().optional(),
      houseNumber: z.string().optional(),
      lat: z.number().optional(),
      lon: z.number().optional(),
    })
    .optional(),
  toAddressObject: z
    .object({
      displayName: z.string(),
      postalCode: z.string(),
      city: z.string(),
      state: z.string().optional(),
      street: z.string().optional(),
      houseNumber: z.string().optional(),
      lat: z.number().optional(),
      lon: z.number().optional(),
    })
    .optional(),
});

function inferContext(
  serviceType: z.infer<typeof calcInputSchema>["serviceType"],
  serviceCart: z.infer<typeof calcInputSchema>["serviceCart"],
): QuoteDraft["serviceContext"] {
  const kinds = new Set(serviceCart.map((item) => item.kind));
  if (kinds.has("MONTAGE") && kinds.size === 1) return "MONTAGE";
  if (kinds.has("ENTSORGUNG") && kinds.size === 1) return "ENTSORGUNG";
  if (kinds.has("SPECIAL") && kinds.size === 1) return "SPEZIALSERVICE";
  if (kinds.has("UMZUG") && kinds.has("ENTSORGUNG")) return "COMBO";
  if (serviceType === "MONTAGE") return "MONTAGE";
  if (serviceType === "ENTSORGUNG") return "ENTSORGUNG";
  if (serviceType === "SPECIAL") return "SPEZIALSERVICE";
  if (serviceType === "KOMBI") return "COMBO";
  return "MOVING";
}

function toAddressObject(
  rawText: string | undefined,
  objectAddress: z.infer<typeof calcInputSchema>["fromAddressObject"] | undefined,
) {
  if (objectAddress) return objectAddress;
  if (!rawText?.trim()) return undefined;
  const value = rawText.trim();
  const plz = value.match(/\b\d{5}\b/)?.[0] ?? "";
  const cityMatch = value.match(/\b\d{5}\s+([^,]+)$/);
  const city = cityMatch?.[1]?.trim() || value.split(",").pop()?.trim() || "Berlin";
  const street = value.split(",")[0]?.trim() || value;
  return {
    displayName: value,
    postalCode: plz,
    city,
    street,
  };
}

export function mapCalcInputToQuoteDraft(
  input: z.infer<typeof calcInputSchema>,
): QuoteDraft {
  const context = inferContext(input.serviceType, input.serviceCart);
  const fromAddress = toAddressObject(input.fromAddress, input.fromAddressObject);
  const toAddress = toAddressObject(input.toAddress, input.toAddressObject);
  const addonSet = new Set(input.addons);
  const floors = Math.max(0, input.floors);
  const stairsFromFloors = floors > 0 && !input.hasElevator;

  return {
    serviceContext: context,
    packageSpeed: input.speed,
    volumeM3: input.volumeM3,
    floors,
    hasElevator: input.hasElevator,
    needNoParkingZone: input.needNoParkingZone,
    fromAddress,
    toAddress,
    extras: {
      packing: Boolean(input.extras?.packing || addonSet.has("PACKING")),
      stairs: Boolean(input.extras?.stairs || stairsFromFloors || addonSet.has("DISMANTLE_ASSEMBLE")),
      express: Boolean(input.extras?.express || input.speed === "EXPRESS"),
      noParkingZone: Boolean(input.extras?.noParkingZone || input.needNoParkingZone),
      disposalBags: Boolean(
        input.extras?.disposalBags ||
          addonSet.has("BASEMENT_ATTIC_CLEARING") ||
          addonSet.has("OLD_KITCHEN_DISPOSAL"),
      ),
    },
    selectedServiceOptions: input.selectedServiceOptions,
  };
}
