import { expect, test } from "@playwright/test";

test.describe("Quote handoff", () => {
  test("übernimmt Angebot via quoteId in /booking", async ({ page }) => {
    await page.route("**/api/quotes/q_test_handoff_123", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            snapshot: {
              quoteId: "q_test_handoff_123",
              draft: {
                serviceContext: "MOVING",
                packageSpeed: "STANDARD",
                volumeM3: 22,
                floors: 1,
                hasElevator: false,
                needNoParkingZone: false,
                fromAddress: {
                  displayName: "Musterstraße 12, 12099 Berlin",
                  postalCode: "12099",
                  city: "Berlin",
                },
                toAddress: {
                  displayName: "Hauptstraße 7, 10115 Berlin",
                  postalCode: "10115",
                  city: "Berlin",
                },
                selectedServiceOptions: [],
                extras: {
                  packing: false,
                  stairs: false,
                  express: false,
                  noParkingZone: false,
                  disposalBags: false,
                },
              },
            },
          }),
        });
        return;
      }

      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
        return;
      }

      await route.continue();
    });

    await page.route("**/api/price/calc", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totals: {
            tier: "STANDARD",
            minCents: 22000,
            maxCents: 29000,
            netCents: 24000,
            vatCents: 4560,
            grossCents: 28560,
          },
          breakdown: {
            distanceKm: 13,
            distanceSource: "ors",
            laborHours: 3,
          },
          servicesBreakdown: [],
          serviceCart: [{ kind: "UMZUG", qty: 1 }],
          packages: [
            {
              tier: "STANDARD",
              minCents: 22000,
              maxCents: 29000,
              netCents: 24000,
              vatCents: 4560,
              grossCents: 28560,
            },
          ],
          priceNet: 240,
          vat: 45.6,
          priceGross: 285.6,
        }),
      });
    });

    await page.goto("/booking?quoteId=q_test_handoff_123");

    await expect(page.getByText("Angebot übernommen")).toBeVisible();
    await expect(page.getByRole("link", { name: "Zurück zum Preisrechner" })).toHaveAttribute(
      "href",
      "/preise?quoteId=q_test_handoff_123",
    );

    await page.getByRole("button", { name: "Weiter" }).click();
    await expect(page.locator('input[value="Musterstraße 12, 12099 Berlin"]')).toBeVisible();
    await expect(page.locator('input[value="Hauptstraße 7, 10115 Berlin"]')).toBeVisible();
  });
});
