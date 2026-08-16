import { test, expect } from "@playwright/test";

// The tutorial and its tester are public, so none of this needs an account
// and none of it spends the auth rate-limit budget the helpers pace.

test("the tutorial is reachable from the nav and lists its sections", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Learn regex" })
    .click();
  await expect(page).toHaveTitle("Learn regex - RegexRiddle");
  await expect(page.getByRole("heading", { name: "Learn regex" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Character classes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What the engine refuses" }),
  ).toBeVisible();
});

test("the tester scores a pattern on the server", async ({ page }) => {
  await page.goto("/tutorial");
  await page.locator("#tester-pattern").fill("colou?r");
  await page.locator("#tester-subject").fill("colour");
  await expect(page.locator("#tester-result")).toContainText(
    "matches this string.",
  );

  // Full-string matching, the same rule attempts are scored under: the
  // pattern describes a part of this string and so does not match it.
  await page.locator("#tester-subject").fill("colours");
  await expect(page.locator("#tester-result")).toContainText(
    "does not match this string.",
  );
});

test("the tester reports a pattern the engine refuses", async ({ page }) => {
  await page.goto("/tutorial");
  await page.locator("#tester-pattern").fill("(a)\\1");
  await page.locator("#tester-subject").fill("aa");
  await expect(page.locator("#tester-result")).toContainText(
    "invalid or unsupported pattern",
  );
});

test("an example loads itself into the tester and is scored", async ({
  page,
}) => {
  await page.goto("/tutorial");
  await page.getByRole("button", { name: "Try it" }).first().click();
  await expect(page.locator("#tester-pattern")).toHaveValue("cat");
  await expect(page.locator("#tester-subject")).toHaveValue("cat");
  await expect(page.locator("#tester-result")).toContainText(
    "matches this string.",
  );
});
