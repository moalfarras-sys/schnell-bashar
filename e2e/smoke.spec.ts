import { expect, test } from "@playwright/test";

test.describe("Booking smoke", () => {
  test("shows booking page with integrated shell", async ({ page }) => {
    await page.goto("/booking");
    await expect(page.getByRole("heading", { name: "Jetzt buchen" })).toBeVisible();
    await expect(page.getByText("Live-Kalkulation", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Weiter" })).toBeVisible();
  });

  test("blocks address step when mandatory fields are missing", async ({ page }) => {
    await page.goto("/booking?context=MOVING");

    await page.getByRole("button", { name: "Weiter" }).click();
    await expect(page.getByRole("heading", { name: "2. Adressen" })).toBeVisible();

    await page.getByRole("button", { name: "Weiter" }).click();
    await expect(page.getByText("Bitte geben Sie Start- und Zieladresse vollständig an.")).toBeVisible();
  });

  test("shows validation banner in contact step when required data is missing", async ({ page }) => {
    await page.goto("/booking");

    await page.getByRole("button", { name: /5 Kontakt/ }).click();
    await expect(page.getByRole("heading", { name: "5. Kontakt & Termin" })).toBeVisible();
    await expect(page.getByText("Bitte prüfen Sie die markierten Angaben.")).toBeVisible();

    await expect(page.getByRole("button", { name: "Anfrage senden" })).toBeDisabled();
    await expect(page.locator("input[aria-invalid='true']").first()).toBeVisible();
  });

  test("mobile viewport keeps action buttons visible", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();

    await page.goto("/booking");
    await expect(page.getByRole("button", { name: "Weiter" }).last()).toBeVisible();
    await expect(page.getByRole("button", { name: "Zurück" }).last()).toBeVisible();

    await context.close();
  });
});
