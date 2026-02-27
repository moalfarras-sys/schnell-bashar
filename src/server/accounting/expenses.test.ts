import assert from "node:assert/strict";
import test from "node:test";

import { computeVatAndGross, quarterRange, resolveMonthRange, toCentsFromEuro } from "@/server/accounting/expenses";

test("computeVatAndGross calculates vat and gross in cents", () => {
  const net = toCentsFromEuro(100);
  const result = computeVatAndGross(net, 19);
  assert.equal(result.vatCents, 1900);
  assert.equal(result.grossCents, 11900);
});

test("resolveMonthRange parses valid month and returns UTC boundaries", () => {
  const range = resolveMonthRange("2026-02");
  assert.ok(range);
  assert.equal(range?.start.toISOString(), "2026-02-01T00:00:00.000Z");
  assert.equal(range?.end.toISOString(), "2026-03-01T00:00:00.000Z");
});

test("quarterRange returns correct start and end for Q3", () => {
  const q3 = quarterRange(2026, 3);
  assert.equal(q3.start.toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(q3.end.toISOString(), "2026-10-01T00:00:00.000Z");
});

