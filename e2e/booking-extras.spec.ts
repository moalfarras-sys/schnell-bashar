import { expect, test } from "@playwright/test";

function buildResponse(volumeM3: number, withPacking: boolean) {
  const base = volumeM3 * 1000;
  const addons = withPacking ? 2500 : 0;
  const gross = base + addons;
  return {
    serviceCart: [{ kind: "UMZUG", qty: 1 }],
    servicesBreakdown: [],
    packages: [
      {
        tier: "STANDARD",
        minCents: gross - 3000,
        maxCents: gross + 3000,
        netCents: Math.round(gross / 1.19),
        vatCents: gross - Math.round(gross / 1.19),
        grossCents: gross,
      },
    ],
    totals: {
      tier: "STANDARD",
      minCents: gross - 3000,
      maxCents: gross + 3000,
      netCents: Math.round(gross / 1.19),
      vatCents: gross - Math.round(gross / 1.19),
      grossCents: gross,
    },
    breakdown: {
      laborHours: Math.max(1, volumeM3 / 10),
      distanceKm: 12,
      distanceSource: "ors",
      driveChargeCents: 2500,
      subtotalCents: base,
      serviceOptionsCents: 0,
      addonsCents: addons,
      discountCents: 0,
      totalCents: gross,
    },
  };
}

test("Packservice aktualisiert Live-Kalkulation in /booking", async ({ page }) => {
  await page.route("**/api/price/calc", async (route) => {
    const payload = route.request().postDataJSON() as { volumeM3?: number; addons?: string[] };
    const volume = Number(payload?.volumeM3 ?? 24);
    const withPacking = Array.isArray(payload?.addons) && payload.addons.includes("PACKING");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildResponse(volume, withPacking)),
    });
  });

  await page.goto("/booking");
  await page.getByRole("button", { name: "Weiter" }).click();

  const inputs = page.getByPlaceholder("Straße, Hausnummer, PLZ, Ort");
  await inputs.nth(0).fill("Musterstraße 1, 10115 Berlin");
  await inputs.nth(1).fill("Hauptstraße 2, 12043 Berlin");
  await page.getByRole("button", { name: "Volumen" }).click();
  await page.getByRole("button", { name: "Extras" }).click();

  const liveCard = page.getByText("Live-Kalkulation").locator("xpath=ancestor::aside[1]");
  await expect(liveCard.getByText("240,00 €").first()).toBeVisible();

  await page.getByText("Packservice", { exact: true }).click();
  await expect(liveCard.getByText("265,00 €").first()).toBeVisible();

  await page.getByText("Packservice", { exact: true }).click();
  await expect(liveCard.getByText("240,00 €").first()).toBeVisible();
});

