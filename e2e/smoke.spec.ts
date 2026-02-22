import { test, expect } from "@playwright/test";

test.describe("Smoke tests - UI/UX fixes", () => {
  test("Header: Anfrage verfolgen is visible and clickable", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: "Anfrage verfolgen" }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/anfrage");
    await link.click();
    await expect(page).toHaveURL(/\/anfrage/);
  });

  test("Preise: Package cards are clickable and scroll to calculator", async ({ page }) => {
    await page.goto("/preise");
    const economyCard = page.getByRole("link", { name: /Günstig/i }).first();
    await expect(economyCard).toBeVisible();
    await economyCard.click();
    await expect(page).toHaveURL(/\/preise/);
    await expect(page.locator("#price-calculator")).toBeInViewport();
  });

  test("Preise: Service type Entsorgung responds to click", async ({ page }) => {
    await page.goto("/preise");
    await page.locator("#price-calculator").scrollIntoViewIfNeeded();
    const entsorgung = page.getByText("Entsorgung / Sperrmüll").first();
    await expect(entsorgung).toBeVisible();
    await entsorgung.click();
    await expect(page.getByText("Entsorgung / Sperrmüll").first()).toBeVisible();
  });

  test("Preise: Priority Express responds to click", async ({ page }) => {
    await page.goto("/preise");
    await page.locator("#price-calculator").scrollIntoViewIfNeeded();
    const express = page.getByText("Express", { exact: true }).first();
    await expect(express).toBeVisible();
    await express.click();
  });

  test("Preise: Room card 3 Zimmer responds to click", async ({ page }) => {
    await page.goto("/preise");
    const dreiZimmer = page.getByRole("button", { name: /3 Zimmer/ });
    await expect(dreiZimmer).toBeVisible();
    await dreiZimmer.click();
    await expect(page.getByText("Geschätztes Volumen").getByText("42 m³")).toBeVisible();
  });

  test("Footer: Preise & Pakete link works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Preise & Pakete" }).first().click();
    await expect(page).toHaveURL("/preise");
  });

  test("Footer: Paketvergleich link works", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    const link = footer.getByRole("link", { name: "Paketvergleich" });
    await expect(link).toHaveAttribute("href", "/vergleich");
  });

  test("Numbers show Western digits (0-9) not Arabic", async ({ page }) => {
    await page.goto("/preise");
    await page.locator("#price-calculator").scrollIntoViewIfNeeded();
    const text = await page.locator("#price-calculator").textContent();
    expect(text).toMatch(/\d/);
    expect(text).not.toMatch(/[٠-٩]/);
  });

  test("Floating: WhatsApp and FAQ buttons visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "WhatsApp öffnen" })).toBeVisible();
    await expect(page.getByRole("button", { name: /FAQ Chat/ })).toBeVisible();
  });

  test("Booking flow: Termin page loads with date picker and confirm button", async ({ page }) => {
    await page.goto("/preise");
    await page.locator("#price-calculator").scrollIntoViewIfNeeded();
    await page.getByLabel(/Von \(PLZ \+ Straße\)/).fill("12043 Berlin, Anzengruber Straße 9");
    await page.getByLabel(/Nach \(PLZ \+ Straße\)/).fill("10115 Berlin, Alexanderplatz 1");
    await page.locator("#price-calculator").getByRole("button", { name: /Termin auswählen/ }).click();
    await expect(page).toHaveURL("/buchung/termin");
    await expect(page.getByRole("heading", { name: "Termin & Kalender" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Datum wählen")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Buchung bestätigen")).toBeVisible();
    await expect(page.getByPlaceholder("Max Mustermann")).toBeVisible();
  });
});
