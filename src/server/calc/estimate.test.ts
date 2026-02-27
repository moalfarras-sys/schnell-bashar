import assert from "node:assert/strict";
import test from "node:test";

import { estimateOrder } from "@/server/calc/estimate";
import type { WizardPayload } from "@/lib/wizard-schema";

const pricing = {
  currency: "EUR",
  movingBaseFeeCents: 12000,
  disposalBaseFeeCents: 9000,
  hourlyRateCents: 6000,
  perM3MovingCents: 450,
  perM3DisposalCents: 350,
  perKmCents: 120,
  heavyItemSurchargeCents: 0,
  stairsSurchargePerFloorCents: 0,
  carryDistanceSurchargePer25mCents: 0,
  parkingSurchargeMediumCents: 0,
  parkingSurchargeHardCents: 0,
  elevatorDiscountSmallCents: 0,
  elevatorDiscountLargeCents: 0,
  uncertaintyPercent: 10,
  economyMultiplier: 0.9,
  standardMultiplier: 1,
  expressMultiplier: 1.2,
};

function payloadWithVolume(volumeM3: number): WizardPayload {
  return {
    payloadVersion: 2,
    bookingContext: "STANDARD",
    packageTier: "PLUS",
    serviceType: "MOVING",
    serviceCart: [{ kind: "UMZUG", qty: 1 }],
    volumeM3,
    addons: [],
    selectedServiceOptions: [],
    startAddress: { displayName: "A", postalCode: "12043", city: "Berlin" },
    destinationAddress: { displayName: "B", postalCode: "10115", city: "Berlin" },
    accessStart: {
      propertyType: "apartment",
      floor: 0,
      elevator: "none",
      stairs: "none",
      parking: "easy",
      needNoParkingZone: false,
      carryDistanceM: 0,
    },
    accessDestination: {
      propertyType: "apartment",
      floor: 0,
      elevator: "none",
      stairs: "none",
      parking: "easy",
      needNoParkingZone: false,
      carryDistanceM: 0,
    },
    itemsMove: {},
    itemsDisposal: {},
    timing: {
      speed: "STANDARD",
      requestedFrom: new Date().toISOString(),
      requestedTo: new Date().toISOString(),
      preferredTimeWindow: "FLEXIBLE",
      jobDurationMinutes: 120,
    },
    customer: {
      name: "Test",
      phone: "+491234",
      email: "test@example.com",
      contactPreference: "EMAIL",
      note: "",
    },
  };
}

test("estimateOrder uses volumeM3 when no move items are selected", () => {
  const low = estimateOrder(payloadWithVolume(12), { catalog: [], pricing }, { distanceKm: 8, distanceSource: "cache" });
  const high = estimateOrder(payloadWithVolume(58), { catalog: [], pricing }, { distanceKm: 8, distanceSource: "cache" });

  assert.ok(high.breakdown.subtotalCents > low.breakdown.subtotalCents);
  assert.ok(high.breakdown.totalCents > low.breakdown.totalCents);
  assert.equal(low.breakdown.moveVolumeM3, 12);
  assert.equal(high.breakdown.moveVolumeM3, 58);
});

test("estimateOrder includes PACKING addon and reports line items", () => {
  const basePayload = payloadWithVolume(20);
  const base = estimateOrder(
    basePayload,
    {
      catalog: [],
      pricing,
      serviceOptions: [
        {
          code: "PACKING",
          moduleSlug: "SPECIAL",
          pricingType: "FLAT",
          defaultPriceCents: 1800,
          defaultLaborMinutes: 45,
          isHeavy: false,
          requiresQuantity: false,
        },
      ],
    },
    { distanceKm: 5, distanceSource: "cache" },
  );

  const withPacking = estimateOrder(
    { ...basePayload, addons: ["PACKING"] },
    {
      catalog: [],
      pricing,
      serviceOptions: [
        {
          code: "PACKING",
          moduleSlug: "SPECIAL",
          pricingType: "FLAT",
          defaultPriceCents: 1800,
          defaultLaborMinutes: 45,
          isHeavy: false,
          requiresQuantity: false,
        },
      ],
    },
    { distanceKm: 5, distanceSource: "cache" },
  );

  assert.ok(withPacking.breakdown.totalCents > base.breakdown.totalCents);
  assert.ok(withPacking.breakdown.addonsCents >= 1800);
  assert.ok(withPacking.lineItems.length > 0);
  assert.ok(withPacking.lineItems.some((line) => line.code === "ADDONS"));
});
