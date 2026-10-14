import { test, expect, type Page } from "@playwright/test";

const USER = {
  id: 1,
  username: "session_player",
  avatarUrl: null,
  createdAt: "2026-01-01T12:00:00.000Z",
};
const PASSWORD = "Session-password-1";
const AUTH_REQUIRED = {
  error: "Authentication required",
  code: "AUTHENTICATION_REQUIRED",
};

// Each page owns its fake session, so these tests never touch the database.
/**
 * Replace API calls with a fake session owned by this page.
 * @param page - Browser page whose API requests are intercepted.
 * @returns A promise resolving to a callback that expires the fake session.
 */
async function mockSession(page: Page): Promise<() => void> {
  let signedIn = true;
  await page.route(
    /**
     * Match API requests without intercepting Vite source modules.
     * @param url - Requested URL to inspect.
     * @returns True when the path starts with /api/.
     */
    (url) => url.pathname.startsWith("/api/"),
    /**
     * Answer API requests using the fake login and session state.
     * @param route - Intercepted request to inspect and answer.
     * @returns A promise with no value, resolved after sending the mock response.
     */
    async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const method = request.method();

      if (pathname === "/api/auth/login" && method === "POST") {
        const body = request.postDataJSON();
        if (body.username === USER.username && body.password === PASSWORD) {
          signedIn = true;
          await route.fulfill({ json: { id: USER.id, username: USER.username } });
        } else {
          await route.fulfill({
            status: 401,
            json: { error: "Invalid username or password" },
          });
        }
        return;
      }

      if (!signedIn) {
        await route.fulfill({ status: 401, json: AUTH_REQUIRED });
        return;
      }
      if (pathname === "/api/auth/me" && method === "GET") {
        await route.fulfill({ json: USER });
        return;
      }
      if (pathname === "/api/challenges" && method === "GET") {
        await route.fulfill({ json: [] });
        return;
      }
      if (pathname === "/api/users/me" && method === "PATCH") {
        await route.fulfill({
          status: 401,
          json: { error: "Current password is incorrect" },
        });
        return;
      }
      await route.fulfill({ status: 404, json: { error: "Unexpected mock request" } });
    });
  /**
   * Expire the fake session for later requests.
   * Parameters: none.
   * @returns Nothing; sets signedIn to false.
   */
  return () => {
    signedIn = false;
  };
}

/**
 * Find the main navigation area.
 * @param page - Browser page to search.
 * @returns The navigation locator used for header assertions.
 */
function mainNavigation(page: Page) {
  return page.getByRole("navigation", { name: "Main" });
}

/**
 * Check the login destination and confirm that the user header is cleared.
 * @param page - Browser page after the session expires.
 * @param redirect - Page path expected in the login redirect query.
 * @returns A promise with no value; rejects if the URL or header is wrong.
 */
async function expectLogin(page: Page, redirect: string): Promise<void> {
  await expect(page).toHaveURL(
    /**
     * Check that the login URL retains the requested destination.
     * @param url - Current page URL checked by Playwright.
     * @returns True when the login path and redirect query both match.
     */
    (url) =>
      url.pathname === "/login" && url.searchParams.get("redirect") === redirect,
  );
  await expect(mainNavigation(page).getByRole("link", { name: USER.username })).toHaveCount(0);
  await expect(mainNavigation(page).getByRole("button", { name: "Log out" })).toHaveCount(0);
}

/**
 * Submit a password change with a wrong current password.
 * @param page - Browser page showing the profile form.
 * @returns A promise with no value, resolved after submitting the form.
 */
async function submitPasswordChange(page: Page): Promise<void> {
  await page.locator("#current-password").fill("Wrong-password-1");
  await page.locator("#new-password").fill("Changed-password-2");
  await page.locator("#confirm-password").fill("Changed-password-2");
  await page.getByRole("button", { name: "Change password" }).click();
}

/**
 * Check that an expired session clears the header and returns to the requested page after login.
 * @param fixtures - Playwright fixtures for this test.
 * @param fixtures.page - Isolated browser page used for the actions and checks.
 * @returns A promise with no value; rejects if a check fails.
 */
test("an expired session clears the header and returns to the requested page after login", async ({
  page,
}) => {
  const expireSession = await mockSession(page);
  await page.goto("/profile");
  await expect(mainNavigation(page).getByRole("link", { name: USER.username })).toBeVisible();

  expireSession();
  await mainNavigation(page).getByRole("link", { name: "Challenges", exact: true }).click();
  await expectLogin(page, "/challenges");

  await page.locator("#login-username").fill(USER.username);
  await page.locator("#login-password").fill("Wrong-password-1");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Wrong username or password.");
  await expectLogin(page, "/challenges");

  await page.locator("#login-password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL("/challenges");
  await expect(page.getByText("No riddles exist yet.")).toBeVisible();
  await expect(mainNavigation(page).getByRole("link", { name: USER.username })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL("/challenges");
  await expect(mainNavigation(page).getByRole("button", { name: "Log out" })).toBeVisible();
});

/**
 * Check that session expiry during a password change redirects to login.
 * @param fixtures - Playwright fixtures for this test.
 * @param fixtures.page - Isolated browser page used for the actions and checks.
 * @returns A promise with no value; rejects if a check fails.
 */
test("session expiry during a password change redirects to login", async ({ page }) => {
  const expireSession = await mockSession(page);
  await page.goto("/profile");
  await expect(mainNavigation(page).getByRole("link", { name: USER.username })).toBeVisible();

  expireSession();
  await submitPasswordChange(page);
  await expectLogin(page, "/profile");
  await expect(page.getByText("The current password is wrong.")).toHaveCount(0);
});

/**
 * Check that a wrong current password keeps the user signed in on the profile.
 * @param fixtures - Playwright fixtures for this test.
 * @param fixtures.page - Isolated browser page used for the actions and checks.
 * @returns A promise with no value; rejects if a check fails.
 */
test("a wrong current password keeps the user signed in on the profile", async ({ page }) => {
  await mockSession(page);
  await page.goto("/profile");
  await submitPasswordChange(page);

  await expect(page.getByText("The current password is wrong.")).toBeVisible();
  await expect(page).toHaveURL("/profile");
  await expect(mainNavigation(page).getByRole("link", { name: USER.username })).toBeVisible();
  await expect(mainNavigation(page).getByRole("button", { name: "Log out" })).toBeVisible();
});
