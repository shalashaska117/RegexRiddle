import { test, expect } from "@playwright/test";

/**
 * Check that landing page loads.
 * @param fixtures - Playwright fixtures for this test.
 * @param fixtures.page - Isolated browser page used for the actions and checks.
 * @returns A promise with no value; rejects if a check fails.
 */
test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/RegexRiddle/);
});

/**
 * Check that how-to-play page is reachable from the landing page.
 * @param fixtures - Playwright fixtures for this test.
 * @param fixtures.page - Isolated browser page used for the actions and checks.
 * @returns A promise with no value; rejects if a check fails.
 */
test("how-to-play page is reachable from the landing page", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "How to play" })
    .click();
  await expect(page.getByRole("heading", { name: "How to play" })).toBeVisible();
});
