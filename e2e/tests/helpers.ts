import { test } from "@playwright/test";
import type { Page } from "@playwright/test";

export interface ChallengeData {
  title: string;
  regex: string;
  examplePositive: string;
  exampleNegative: string;
  controlsPositive: string[];
  controlsNegative: string[];
}

let counter = 0;

// The random tail keeps names unique across concurrent Playwright
// processes, which share one database when SKIP_DB_RESET is set.
/**
 * Build a test name from a prefix, timestamp, counter and random suffix.
 * @param prefix - Readable label placed at the start of the name.
 * @returns A string used for test usernames or challenge titles.
 */
export function uniqueName(prefix: string): string {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${Date.now().toString(36)}${counter}${random}`;
}

type AuthRoute = "register" | "login";

// The backend allows 10 requests per route per fixed 60s window per ip
// (docs/api.md). Registering through the UI also posts /login, so a fast
// suite exceeds the login budget. The ledger below spaces this process's
// auth posts to at most 9 per sliding 70s window, which keeps every fixed
// 60s server window under 10 with margin for the delay between the pace
// call and the actual request.
const AUTH_WINDOW_MS = 70_000;
const AUTH_MAX = 9;
const authHits: Record<AuthRoute, number[]> = { register: [], login: [] };

let restartChecked = false;

// A worker with index > 0 exists because an earlier worker died mid-run;
// the server may still hold a nearly spent window this process never saw,
// so it sits out one full window before its first auth post.
/**
 * Wait once after a worker restart so earlier auth requests can expire.
 * Parameters: none.
 * @returns A promise with no value, resolved when this worker may send auth requests.
 */
async function waitOutForeignWindow(): Promise<void> {
  if (restartChecked) return;
  restartChecked = true;
  if (test.info().workerIndex > 0) {
    await new Promise(
      /**
       * Schedule the end of the auth-window wait.
       * @param resolve - Promise callback called when the timer ends.
       * @returns The timer handle, ignored by the promise.
       */
      (resolve) => setTimeout(resolve, AUTH_WINDOW_MS));
  }
}

// Call before any action that posts to /api/auth/register or /api/auth/login.
/**
 * Wait for room in the auth budget and record the next request.
 * @param route - Auth endpoint whose request budget is used: login or register.
 * @returns A promise with no value, resolved when the request may be sent.
 */
export async function paceAuth(route: AuthRoute): Promise<void> {
  await waitOutForeignWindow();
  const hits = authHits[route];
  const now = Date.now();
  while (hits.length > 0 && now - hits[0] >= AUTH_WINDOW_MS) hits.shift();
  if (hits.length >= AUTH_MAX) {
    const waitMs = hits[0] + AUTH_WINDOW_MS - Date.now();
    if (waitMs > 0) await new Promise(
      /**
       * Schedule the remaining wait for the next auth request.
       * @param resolve - Promise callback called when waitMs has elapsed.
       * @returns The timer handle, ignored by the promise.
       */
      (resolve) => setTimeout(resolve, waitMs));
    const after = Date.now();
    while (hits.length > 0 && after - hits[0] >= AUTH_WINDOW_MS) hits.shift();
  }
  hits.push(Date.now());
}

/**
 * Register a user through the form and wait for the challenge list.
 * @param page - Browser page used for registration.
 * @param username - New username to enter.
 * @param password - Password entered in both password fields.
 * @returns A promise with no value; the page is signed in when it resolves.
 */
export async function registerUser(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  // The register store action follows up with a login, so both budgets are
  // spent.
  await paceAuth("register");
  await paceAuth("login");
  await page.goto("/register");
  await page.locator("#register-username").fill(username);
  const passwordInputs = page.locator('input[type="password"]');
  await passwordInputs.nth(0).fill(password);
  await passwordInputs.nth(1).fill(password);
  await page.getByRole("button", { name: "Register" }).click();
  await page.waitForURL("/challenges");
}

/**
 * Log in through the form and wait for the challenge list.
 * @param page - Browser page used for login.
 * @param username - Existing username to enter.
 * @param password - Password for that account.
 * @returns A promise with no value, resolved after successful login.
 */
export async function loginUser(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  await paceAuth("login");
  await page.goto("/login");
  await page.locator("#login-username").fill(username);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("/challenges");
}

/**
 * Fill one group of control strings, adding rows as needed.
 * @param page - Browser page with the creation form.
 * @param groupName - Accessible name of the positive or negative control group.
 * @param rowName - Label prefix used to find each numbered input.
 * @param values - Control strings to enter in order.
 * @returns A promise with no value, resolved after all rows are filled.
 */
async function fillControls(
  page: Page,
  groupName: string,
  rowName: string,
  values: string[],
): Promise<void> {
  const group = page.getByRole("group", { name: groupName });
  for (let i = 0;i < values.length;i++) {
    // The form starts with one empty row per group.
    if (i > 0) await group.getByRole("button", { name: "Add string" }).click();
    await group.getByRole("textbox", { name: `${rowName} ${i + 1}` }).fill(values[i]);
  }
}

// Drives the /challenges/new form (caller must be logged in) and returns
// the new challenge's id from the detail URL it lands on.
/**
 * Create a challenge through the form as the signed-in user.
 * @param page - Browser page with the author session.
 * @param data - Challenge fields sent by the form.
 * @param data.title - Public challenge title.
 * @param data.regex - Secret pattern defining the challenge.
 * @param data.examplePositive - Public example that matches the pattern.
 * @param data.exampleNegative - Public example that does not match.
 * @param data.controlsPositive - Secret strings the pattern must match.
 * @param data.controlsNegative - Secret strings the pattern must reject.
 * @returns A promise resolving to the new challenge ID from the detail URL.
 */
export async function createChallenge(
  page: Page,
  data: ChallengeData,
): Promise<number> {
  await page.goto("/challenges/new");
  await page.locator("#cc-title").fill(data.title);
  await page.locator("#cc-regex").fill(data.regex);
  await page.locator("#cc-example-positive").fill(data.examplePositive);
  await page.locator("#cc-example-negative").fill(data.exampleNegative);
  await fillControls(page, "Positive controls", "Positive control", data.controlsPositive);
  await fillControls(page, "Negative controls", "Negative control", data.controlsNegative);
  await page.getByRole("button", { name: "Create challenge" }).click();
  await page.waitForURL(/\/challenges\/\d+$/);
  const match = /\/challenges\/(\d+)$/.exec(page.url());
  if (match === null) throw new Error(`Unexpected URL after create: ${page.url()}`);
  return Number(match[1]);
}
