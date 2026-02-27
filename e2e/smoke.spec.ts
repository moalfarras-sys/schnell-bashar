import { test, expect } from "@playwright/test";

const storageKey = "ssu_wizard_v2_default";

const startAddress = {
  displayName: "Anzengruber Straße 9, 12043 Berlin",
  postalCode: "12043",
  city: "Berlin",
  lat: 52.482,
  lon: 13.435,
};

const destinationAddress = {
  displayName: "Alexanderplatz 1, 10178 Berlin",
  postalCode: "10178",
  city: "Berlin",
  lat: 52.521,
  lon: 13.413,
};

async function seedWizardAddresses(page: import("@playwright/test").Page) {
  await page.addInitScript(
    ({ key, from, to }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          serviceType: "MOVING",
          packageTier: "PLUS",
          offerCode: "",
          addons: [],
          startAddress: from,
          destinationAddress: to,
          pickupAddress: undefined,
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
          accessPickup: {
            propertyType: "apartment",
            floor: 0,
            elevator: "none",
            stairs: "none",
            parking: "easy",
            needNoParkingZone: false,
            carryDistanceM: 0,
          },
          samePickupAsStart: true,
          itemsMove: {},
          itemsDisposal: {},
          selectedServiceOptions: {},
          disposalCategories: [],
          disposalExtraM3: 0,
          forbiddenConfirmed: true,
          speed: "STANDARD",
          preferredTimeWindow: "FLEXIBLE",
          customerName: "",
          customerPhone: "",
          customerEmail: "",
          contactPreference: "PHONE",
          note: "",
        }),
      );
    },
    { key: storageKey, from: startAddress, to: destinationAddress },
  );
}

test.describe("Booking wizard smoke", () => {
  test("shows step-1 validation when required addresses are missing", async ({ page }) => {
    await page.goto("/booking");
    await page.getByRole("button", { name: "Weiter" }).click();
    await expect(page.getByText("Bitte prüfen Sie die markierten Angaben:")).toBeVisible();
  });

  test("details step includes package and offer code controls", async ({ page }) => {
    await seedWizardAddresses(page);
    await page.goto("/booking");

    await page.getByRole("button", { name: "Weiter" }).click();
    await expect(page.getByText("Paket wählen")).toBeVisible();

    await page.getByRole("button", { name: "Premium" }).click();
    await expect(page.locator("aside").getByText("Premium")).toBeVisible();

    await page.getByPlaceholder("Code eingeben").fill("INVALIDCODE");
    await expect(page.getByText("Code ist aktuell ungültig oder nicht auf diese Buchung anwendbar.")).toBeVisible();
  });

  test("finish step blocks submission and highlights invalid contact fields", async ({ page }) => {
    await seedWizardAddresses(page);
    await page.goto("/booking");

    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByRole("button", { name: "Weiter" }).click();

    await page.getByRole("button", { name: "Anfrage senden" }).click();

    await expect(page.getByText("Bitte prüfen Sie die markierten Angaben:")).toBeVisible();
    await expect(page.locator("input[aria-invalid='true']").first()).toBeVisible();
  });

  test("mobile layout keeps sticky bottom actions visible", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto("/booking");

    await expect(page.getByRole("button", { name: "Weiter" }).last()).toBeVisible();
    await expect(page.getByRole("button", { name: "Zurück" }).last()).toBeVisible();

    await context.close();
  });
});

