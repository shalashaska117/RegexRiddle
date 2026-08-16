import { test, expect, type Page } from "@playwright/test";
import { paceAuth, registerUser, uniqueName } from "./helpers";

const PASSWORD = "Anchor-tag-pw-1";

async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL("/");
}

function navUserLink(page: Page, username: string) {
  return page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: username, exact: true });
}

test("register lands on /challenges with the session open", async ({ page }) => {
  const username = uniqueName("dotstar");
  await registerUser(page, username, PASSWORD);
  await expect(page).toHaveTitle("Challenges - RegexRiddle");
  await expect(navUserLink(page, username)).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  // A reload rebuilds auth state from the session cookie alone, so staying
  // on /challenges proves the session is open on the server.
  await page.reload();
  await expect(navUserLink(page, username)).toBeVisible();
  await expect(page).toHaveURL("/challenges");
});

test("registering a taken username shows the inline error", async ({ page }) => {
  const username = uniqueName("backref_9");
  await registerUser(page, username, PASSWORD);
  await logout(page);
  await page.goto("/register");
  await page.locator("#register-username").fill(username);
  await page.locator("#register-password").fill(PASSWORD);
  await page.locator("#register-confirm").fill(PASSWORD);
  await paceAuth("register");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.locator("#register-username-error")).toHaveText(
    "This username is taken.",
  );
  await expect(page).toHaveURL("/register");
});

test("a password that misses a required character class is refused", async ({
  page,
}) => {
  await page.goto("/register");
  await page.locator("#register-username").fill(uniqueName("weak_pw"));
  // Long enough, but no uppercase letter. The page checks this itself, so no
  // request leaves the browser and no auth budget is spent.
  await page.locator("#register-password").fill("lowercase-only-1");
  await page.locator("#register-confirm").fill("lowercase-only-1");
  await expect(
    page.getByRole("listitem").filter({ hasText: "An uppercase letter" }),
  ).toHaveClass(/err/);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.locator("#register-password-error")).toBeVisible();
  await expect(page).toHaveURL("/register");
});

test("login with wrong credentials shows the banner", async ({ page }) => {
  const username = uniqueName("greedy_star");
  await registerUser(page, username, PASSWORD);
  await logout(page);
  await page.goto("/login");
  await page.locator("#login-username").fill(username);
  await page.locator("#login-password").fill("Not-the-password-1");
  await paceAuth("login");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Wrong username or password.");
  await expect(page).toHaveURL("/login");
});

test("the login password can be revealed and hidden again", async ({ page }) => {
  await page.goto("/login");
  const field = page.locator("#login-password");
  await field.fill(PASSWORD);
  await expect(field).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(field).toHaveAttribute("type", "text");
  await expect(field).toHaveValue(PASSWORD);
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(field).toHaveAttribute("type", "password");
});

test("logged-out /challenges redirects to login and the redirect is honored", async ({
  page,
}) => {
  const username = uniqueName("lazy_plus");
  await registerUser(page, username, PASSWORD);
  await logout(page);
  await page.goto("/challenges");
  await page.waitForURL(/\/login\?redirect=/);
  expect(new URL(page.url()).searchParams.get("redirect")).toBe("/challenges");
  // Filled in place instead of via loginUser: the helper navigates to /login
  // and would drop the redirect query this test asserts on.
  await page.locator("#login-username").fill(username);
  await page.locator("#login-password").fill(PASSWORD);
  await paceAuth("login");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("/challenges");
  await expect(navUserLink(page, username)).toBeVisible();
});

test("a logged-in user visiting /login is bounced to /challenges", async ({ page }) => {
  const username = uniqueName("noncapture");
  await registerUser(page, username, PASSWORD);
  await page.goto("/login");
  await page.waitForURL("/challenges");
  await expect(navUserLink(page, username)).toBeVisible();
});
