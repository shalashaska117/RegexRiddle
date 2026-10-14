import { test, expect, type Page } from "@playwright/test";
import { createChallenge, loginUser, registerUser, uniqueName } from "./helpers";

const PASSWORD = "Quantifier-pw-1";

// Smallest valid PNG (1x1 transparent), enough for the upload's image checks.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * Log out through the header and wait for the landing page.
 * @param page - Browser page with the current session.
 * @returns A promise with no value, resolved after navigation.
 */
async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL("/");
}

/**
 * Find the signed-in user link in the main navigation.
 * @param page - Browser page to search.
 * @param username - Exact username shown in the header.
 * @returns The profile-link locator used in assertions.
 */
function navUserLink(page: Page, username: string) {
  return page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: username, exact: true });
}

/**
 * Open the profile and submit a password change.
 * @param page - Browser page with the signed-in user.
 * @param current - Password to send as the current password.
 * @param next - New password entered in the new-password and confirmation fields.
 * @returns A promise with no value, resolved after submitting the form.
 */
async function submitPasswordChange(
  page: Page,
  current: string,
  next: string,
): Promise<void> {
  await page.goto("/profile");
  await page.locator("#current-password").fill(current);
  await page.locator("#new-password").fill(next);
  await page.locator("#confirm-password").fill(next);
  await page.getByRole("button", { name: "Change password" }).click();
}

/**
 * Check that changing the password with a wrong current password shows the inline error.
 * @param fixtures - Playwright fixtures for this test.
 * @param fixtures.page - Isolated browser page used for the actions and checks.
 * @returns A promise with no value; rejects if a check fails.
 */
test("changing the password with a wrong current password shows the inline error", async ({
  page,
}) => {
  await registerUser(page, uniqueName("dotstar"), PASSWORD);
  await submitPasswordChange(page, "Not-the-password-1", "Wanted-pass-22");
  await expect(page.getByText("The current password is wrong.")).toBeVisible();
  await expect(page).toHaveURL("/profile");
});

/**
 * Check that a successful password change allows re-login with the new password.
 * @param fixtures - Playwright fixtures for this test.
 * @param fixtures.page - Isolated browser page used for the actions and checks.
 * @returns A promise with no value; rejects if a check fails.
 */
test("a successful password change allows re-login with the new password", async ({
  page,
}) => {
  const username = uniqueName("backref_9");
  const newPassword = "Rotated-pass-22";
  await registerUser(page, username, PASSWORD);
  await submitPasswordChange(page, PASSWORD, newPassword);
  await expect(page.getByText("Password changed.")).toBeVisible();
  await logout(page);
  // loginUser waits for /challenges, so reaching it proves the new password.
  await loginUser(page, username, newPassword);
  await expect(navUserLink(page, username)).toBeVisible();
});

/**
 * Check that uploading a png avatar makes the header avatar image appear.
 * @param fixtures - Playwright fixtures for this test.
 * @param fixtures.page - Isolated browser page used for the actions and checks.
 * @returns A promise with no value; rejects if a check fails.
 */
test("uploading a png avatar makes the header avatar image appear", async ({
  page,
}) => {
  await registerUser(page, uniqueName("greedy_star"), PASSWORD);
  await page.goto("/profile");
  // A fresh user has the letter placeholder, so the img can only come from
  // the upload below.
  await expect(page.locator("header img.avatar")).toHaveCount(0);
  await page.locator("#avatar-file").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: PNG_1X1,
  });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("Avatar updated.")).toBeVisible();
  await expect(page.locator("header img.avatar")).toBeVisible();
});

/**
 * Check that two solvers of the same riddle appear on the leaderboard in efficiency order.
 * @param fixtures - Playwright fixtures for this test.
 * @param fixtures.page - Isolated browser page used for the actions and checks.
 * @returns A promise with no value; rejects if a check fails.
 */
test("two solvers of the same riddle appear on the leaderboard in efficiency order", async ({
  page,
}) => {
  const author = uniqueName("lazy_plus");
  const fastSolver = uniqueName("anchor_start");
  const slowSolver = uniqueName("kleene_two");
  const regex = "#[0-9a-f]{6}";

  await registerUser(page, author, PASSWORD);
  const challengeId = await createChallenge(page, {
    title: uniqueName("hex color"),
    regex,
    examplePositive: "#1abc9c",
    exampleNegative: "blue",
    controlsPositive: ["#ffffff", "#000000"],
    controlsNegative: ["1abc9c", "#fff"],
  });
  await logout(page);

  await registerUser(page, fastSolver, PASSWORD);
  await page.goto(`/challenges/${challengeId}`);
  await page.locator("#pattern-input").fill(regex);
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Solved in 1 attempt.")).toBeVisible();
  await logout(page);

  await registerUser(page, slowSolver, PASSWORD);
  await page.goto(`/challenges/${challengeId}`);
  await page.locator("#pattern-input").fill("#[0-9a-f]{3}");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("not solved")).toBeVisible();
  await page.locator("#pattern-input").fill(regex);
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Solved in 2 attempts.")).toBeVisible();

  await page.goto("/leaderboard");
  const fastRow = page.getByRole("row", { name: new RegExp(fastSolver) });
  const slowRow = page.getByRole("row", { name: new RegExp(slowSolver) });
  await expect(fastRow).toBeVisible();
  await expect(slowRow).toBeVisible();
  // Both users solved exactly one riddle, so the tie between them breaks on
  // average attempts: 1.00 for the fast solver, 2.00 for the slow one.
  await expect(fastRow).toContainText("1.00");
  await expect(slowRow).toContainText("2.00");
  // The database is shared, so rows from other tests may sit anywhere around
  // these two; only their relative order is this test's to assert.
  const rowTexts = await page.locator("tbody tr").allTextContents();
  const fastIndex = rowTexts.findIndex(
    /**
     * Find the leaderboard row for the faster solver.
     * @param text - Text of one leaderboard row.
     * @returns True when the row contains fastSolver.
     */
    (text) => text.includes(fastSolver));
  const slowIndex = rowTexts.findIndex(
    /**
     * Find the leaderboard row for the slower solver.
     * @param text - Text of one leaderboard row.
     * @returns True when the row contains slowSolver.
     */
    (text) => text.includes(slowSolver));
  expect(fastIndex).toBeGreaterThanOrEqual(0);
  expect(slowIndex).toBeGreaterThanOrEqual(0);
  expect(fastIndex).toBeLessThan(slowIndex);
});
