import type { WizardPayload } from "@/lib/wizard-schema";
import type { QuoteDraft } from "@/domain/quote/types";

export function quoteContextToServiceCart(context: QuoteDraft["serviceContext"]): WizardPayload["serviceCart"] {
  if (context === "MONTAGE") {
    return [{ kind: "MONTAGE", qty: 1, moduleSlug: "MONTAGE", titleDe: "Montage" }];
  }
  if (context === "ENTSORGUNG") {
    return [{ kind: "ENTSORGUNG", qty: 1, moduleSlug: "ENTSORGUNG", titleDe: "Entsorgung" }];
  }
  if (context === "SPEZIALSERVICE") {
    return [{ kind: "SPECIAL", qty: 1, moduleSlug: "SPECIAL", titleDe: "Spezialservice" }];
  }
  if (context === "COMBO") {
    return [
      { kind: "UMZUG", qty: 1, titleDe: "Umzug" },
      { kind: "ENTSORGUNG", qty: 1, moduleSlug: "ENTSORGUNG", titleDe: "Entsorgung" },
    ];
  }
  return [{ kind: "UMZUG", qty: 1, titleDe: "Umzug" }];
}

export function quoteContextToWizardServiceType(
  context: QuoteDraft["serviceContext"],
): WizardPayload["serviceType"] {
  if (context === "ENTSORGUNG") return "DISPOSAL";
  if (context === "COMBO") return "BOTH";
  return "MOVING";
}

export function quoteContextToBookingContext(
  context: QuoteDraft["serviceContext"],
): WizardPayload["bookingContext"] {
  if (context === "MONTAGE") return "MONTAGE";
  if (context === "ENTSORGUNG") return "ENTSORGUNG";
  if (context === "SPEZIALSERVICE") return "SPECIAL";
  return "STANDARD";
}

export function quoteSpeedToPackageTier(
  speed: QuoteDraft["packageSpeed"],
): WizardPayload["packageTier"] {
  if (speed === "ECONOMY") return "STANDARD";
  if (speed === "EXPRESS") return "PREMIUM";
  return "PLUS";
}

export function quoteDraftToWizardPayload(draft: QuoteDraft): WizardPayload {
  const normalizeAddress = (address?: QuoteDraft["fromAddress"]) =>
    address
      ? {
          ...address,
          lat: typeof address.lat === "number" ? address.lat : 0,
          lon: typeof address.lon === "number" ? address.lon : 0,
        }
      : undefined;

  const context = quoteContextToBookingContext(draft.serviceContext);
  const serviceType = quoteContextToWizardServiceType(draft.serviceContext);
  const serviceCart = quoteContextToServiceCart(draft.serviceContext);
  const access = {
    propertyType: "apartment" as const,
    floor: draft.floors,
    elevator: draft.hasElevator ? ("small" as const) : ("none" as const),
    stairs: draft.floors > 0 && !draft.hasElevator ? ("few" as const) : ("none" as const),
    parking: draft.needNoParkingZone ? ("hard" as const) : ("easy" as const),
    needNoParkingZone: draft.needNoParkingZone,
    carryDistanceM: 0,
  };

  const addons: WizardPayload["addons"] = [];
  if (draft.extras.packing) addons.push("PACKING");
  if (draft.extras.stairs) addons.push("DISMANTLE_ASSEMBLE");
  if (draft.extras.disposalBags) addons.push("BASEMENT_ATTIC_CLEARING");

  return {
    payloadVersion: 2,
    bookingContext: context,
    packageTier: quoteSpeedToPackageTier(draft.packageSpeed),
    serviceCart,
    serviceType,
    addons,
    selectedServiceOptions: draft.selectedServiceOptions,
    pickupAddress:
      draft.serviceContext === "MONTAGE" || draft.serviceContext === "ENTSORGUNG" || draft.serviceContext === "SPEZIALSERVICE"
        ? normalizeAddress(draft.toAddress)
        : undefined,
    startAddress:
      draft.serviceContext === "MOVING" || draft.serviceContext === "COMBO"
        ? normalizeAddress(draft.fromAddress)
        : undefined,
    destinationAddress:
      draft.serviceContext === "MOVING" || draft.serviceContext === "COMBO"
        ? normalizeAddress(draft.toAddress)
        : undefined,
    accessPickup:
      draft.serviceContext === "MONTAGE" || draft.serviceContext === "ENTSORGUNG" || draft.serviceContext === "SPEZIALSERVICE"
        ? access
        : undefined,
    accessStart:
      draft.serviceContext === "MOVING" || draft.serviceContext === "COMBO" ? access : undefined,
    accessDestination:
      draft.serviceContext === "MOVING" || draft.serviceContext === "COMBO" ? access : undefined,
    itemsMove: {},
    itemsDisposal: {},
    disposal:
      draft.serviceContext === "ENTSORGUNG" || draft.serviceContext === "COMBO"
        ? {
            categories: [],
            volumeExtraM3: Math.max(0, draft.volumeM3 - 5),
            forbiddenConfirmed: true,
          }
        : undefined,
    timing: {
      speed: draft.packageSpeed,
      requestedFrom: new Date().toISOString(),
      requestedTo: new Date().toISOString(),
      preferredTimeWindow: "FLEXIBLE",
      jobDurationMinutes: 120,
    },
    customer: {
      name: "Preisberechnung",
      phone: "+49",
      email: "kontakt@schnellsicherumzug.de",
      contactPreference: "EMAIL",
      note: "",
    },
  };
}
