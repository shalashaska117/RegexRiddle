import { test, expect } from "@playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/RegexRiddle/);
});

test("how-to-play page is reachable from the landing page", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "How to play" })
    .click();
  await expect(page.getByRole("heading", { name: "How to play" })).toBeVisible();
});
