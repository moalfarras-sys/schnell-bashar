import { expect, test } from "@playwright/test";

function buildResponse(volumeM3: number) {
  const gross = volumeM3 * 1000;
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
      subtotalCents: gross,
      totalCents: gross,
    },
  };
}

test("Volumenschätzung aktualisiert Live-Kalkulation in /booking", async ({ page }) => {
  await page.route("**/api/price/calc", async (route) => {
    const payload = route.request().postDataJSON() as { volumeM3?: number };
    const volume = Number(payload?.volumeM3 ?? 24);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildResponse(volume)),
    });
  });

  await page.goto("/booking");
  await page.getByRole("button", { name: "Weiter" }).click();

  const inputs = page.getByPlaceholder("Straße, Hausnummer, PLZ, Ort");
  await inputs.nth(0).fill("Musterstraße 1, 10115 Berlin");
  await inputs.nth(1).fill("Hauptstraße 2, 12043 Berlin");

  const liveCard = page.getByText("Live-Kalkulation").locator("xpath=ancestor::aside[1]");
  await expect(liveCard.getByText("240,00 €").first()).toBeVisible();

  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByRole("heading", { name: "3. Volumenschätzung" })).toBeVisible();
  await page.getByRole("button", { name: "3 Zimmer" }).click();

  await expect(liveCard.getByText("380,00 €").first()).toBeVisible();
});
