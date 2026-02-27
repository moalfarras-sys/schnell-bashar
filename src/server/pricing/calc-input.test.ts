import assert from "node:assert/strict";
import test from "node:test";

import { calcInputSchema, mapCalcInputToQuoteDraft } from "@/server/pricing/calc-input";

test("mapCalcInputToQuoteDraft maps addons/extras into quote draft", () => {
  const parsed = calcInputSchema.parse({
    serviceType: "UMZUG",
    serviceCart: [{ kind: "UMZUG" }],
    speed: "STANDARD",
    volumeM3: 24,
    floors: 0,
    hasElevator: false,
    needNoParkingZone: true,
    addons: ["PACKING", "BASEMENT_ATTIC_CLEARING"],
    fromAddressObject: { displayName: "A, 12043 Berlin", postalCode: "12043", city: "Berlin" },
    toAddressObject: { displayName: "B, 10115 Berlin", postalCode: "10115", city: "Berlin" },
    selectedServiceOptions: [],
  });
  const draft = mapCalcInputToQuoteDraft(parsed);

  assert.equal(draft.extras.packing, true);
  assert.equal(draft.extras.disposalBags, true);
  assert.equal(draft.extras.noParkingZone, true);
  assert.equal(draft.serviceContext, "MOVING");
});

test("mapCalcInputToQuoteDraft keeps explicit extras and floor/elevator fields", () => {
  const parsed = calcInputSchema.parse({
    serviceType: "MONTAGE",
    serviceCart: [{ kind: "MONTAGE" }],
    speed: "EXPRESS",
    volumeM3: 12,
    floors: 5,
    hasElevator: true,
    needNoParkingZone: false,
    extras: { packing: false, stairs: false, express: true, noParkingZone: false, disposalBags: false },
    toAddressObject: { displayName: "C, 12043 Berlin", postalCode: "12043", city: "Berlin" },
    selectedServiceOptions: [{ code: "MONTAGE_KUECHE", qty: 1 }],
  });
  const draft = mapCalcInputToQuoteDraft(parsed);

  assert.equal(draft.floors, 5);
  assert.equal(draft.hasElevator, true);
  assert.equal(draft.extras.express, true);
  assert.equal(draft.extras.stairs, false);
  assert.equal(draft.selectedServiceOptions.length, 1);
});

