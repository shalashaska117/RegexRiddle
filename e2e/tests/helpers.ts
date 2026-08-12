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
async function waitOutForeignWindow(): Promise<void> {
  if (restartChecked) return;
  restartChecked = true;
  if (test.info().workerIndex > 0) {
    await new Promise((resolve) => setTimeout(resolve, AUTH_WINDOW_MS));
  }
}

// Call before any action that posts to /api/auth/register or /api/auth/login.
export async function paceAuth(route: AuthRoute): Promise<void> {
  await waitOutForeignWindow();
  const hits = authHits[route];
  const now = Date.now();
  while (hits.length > 0 && now - hits[0] >= AUTH_WINDOW_MS) hits.shift();
  if (hits.length >= AUTH_MAX) {
    const waitMs = hits[0] + AUTH_WINDOW_MS - Date.now();
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    const after = Date.now();
    while (hits.length > 0 && after - hits[0] >= AUTH_WINDOW_MS) hits.shift();
  }
  hits.push(Date.now());
}

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

async function fillControls(
  page: Page,
  groupName: string,
  rowName: string,
  values: string[],
): Promise<void> {
  const group = page.getByRole("group", { name: groupName });
  for (let i = 0; i < values.length; i++) {
    // The form starts with one empty row per group.
    if (i > 0) await group.getByRole("button", { name: "Add string" }).click();
    await group.getByRole("textbox", { name: `${rowName} ${i + 1}` }).fill(values[i]);
  }
}

// Drives the /challenges/new form (caller must be logged in) and returns
// the new challenge's id from the detail URL it lands on.
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
