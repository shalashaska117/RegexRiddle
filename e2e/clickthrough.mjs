// Manual click-through driver, not part of the test suite. Run from e2e/:
//   node clickthrough.mjs
// Walks every flow against the live stack and saves screenshots.
import { chromium, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5173";
const SHOTS = "shots";
mkdirSync(SHOTS, { recursive: true });

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

// Unique per run, so reruns never collide with earlier users or riddles.
const RUN = Date.now().toString(36);
const AUTHOR = `weaver_${RUN}`;
const SOLVER = `solver_${RUN}`;
const TITLE = `hex color ${RUN}`;

const problems = [];
const consoleErrors = [];

function track(page, tag) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`[${tag}] ${msg.text()} (${msg.location().url})`);
    }
  });
  page.on("pageerror", (err) => consoleErrors.push(`[${tag}] pageerror: ${err.message}`));
  page.on("requestfailed", async (req) => {
    // Chromium logs bodyless fetch responses (the 204 endpoints) as aborted
    // even though they completed, so skip any request that got a response.
    if (await req.response()) return;
    consoleErrors.push(`[${tag}] requestfailed: ${req.method()} ${req.url()} ${req.failure()?.errorText}`);
  });
}

let step = "";
async function run(name, fn) {
  step = name;
  try {
    await fn();
    console.log(`ok    ${name}`);
  } catch (err) {
    problems.push(`${name}: ${err.message.split("\n")[0]}`);
    console.log(`FAIL  ${name}: ${err.message.split("\n")[0]}`);
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
track(page, "desktop");
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` });

async function register(username, password) {
  await page.goto(`${BASE}/register`);
  await page.locator("#register-username").fill(username);
  await page.locator('input[type="password"]').nth(0).fill(password);
  await page.locator('input[type="password"]').nth(1).fill(password);
  await page.getByRole("button", { name: "Register" }).click();
  await page.waitForURL(`${BASE}/challenges`);
}

async function logout() {
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(`${BASE}/`);
}

await run("landing loads with title and caret", async () => {
  await page.goto(BASE);
  await expect(page).toHaveTitle("RegexRiddle");
  await shot("01-landing");
});

await run("skip link appears on first Tab", async () => {
  await page.keyboard.press("Tab");
  const active = await page.evaluate(() => document.activeElement?.textContent);
  if (!/skip to content/i.test(active ?? "")) throw new Error(`focused: ${active}`);
  await shot("02-skip-link");
});

await run("guard redirects /challenges to login", async () => {
  await page.goto(`${BASE}/challenges`);
  await page.waitForURL(/\/login\?redirect=/);
  await expect(page).toHaveTitle("Log in - RegexRiddle");
});

await run("register author and land on challenges", async () => {
  await register(AUTHOR, "secret-pass-1");
  await expect(page).toHaveTitle("Challenges - RegexRiddle");
  await shot("03-challenges-empty");
});

await run("create form rejects a bad regex with an inline 422", async () => {
  await page.getByRole("link", { name: "New challenge" }).click();
  await page.waitForURL(`${BASE}/challenges/new`);
  await page.locator("#cc-title").fill(TITLE);
  await page.locator("#cc-regex").fill("a(");
  await page.locator("#cc-example-positive").fill("#1abc9c");
  await page.locator("#cc-example-negative").fill("blue");
  await page.getByRole("textbox", { name: "Positive control 1" }).fill("#ffffff");
  await page.getByRole("textbox", { name: "Negative control 1" }).fill("1abc9c");
  await page.getByRole("button", { name: "Create challenge" }).click();
  await expect(page.locator(".error-text").first()).toBeVisible();
  await shot("04-create-422");
});

await run("create a valid challenge with extra controls", async () => {
  await page.locator("#cc-regex").fill("#[0-9a-f]{6}");
  const pos = page.getByRole("group", { name: "Positive controls" });
  await pos.getByRole("button", { name: "Add string" }).click();
  await page.getByRole("textbox", { name: "Positive control 2" }).fill("#000000");
  const neg = page.getByRole("group", { name: "Negative controls" });
  await neg.getByRole("button", { name: "Add string" }).click();
  await page.getByRole("textbox", { name: "Negative control 2" }).fill("#fff");
  await page.getByRole("button", { name: "Create challenge" }).click();
  await page.waitForURL(/\/challenges\/\d+$/);
  await expect(page).toHaveTitle(`${TITLE} - RegexRiddle`);
});

await run("author sees the no-attempt notice", async () => {
  await expect(page.getByText("Authors cannot attempt it")).toBeVisible();
  await shot("05-detail-author");
});

await run("second user sees the challenge list", async () => {
  await logout();
  await register(SOLVER, "secret-pass-2");
  await expect(page.getByRole("link", { name: TITLE })).toBeVisible();
  await shot("06-challenges-list");
  await page.getByRole("link", { name: TITLE }).click();
  await page.waitForURL(/\/challenges\/\d+$/);
  await shot("07-detail-solver");
});

await run("failing attempt reports partial counts", async () => {
  await page.locator("#pattern-input").fill("#[0-9a-f]{3}");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("not solved")).toBeVisible();
  await shot("08-attempt-fail");
});

await run("engine-rejected pattern shows inline error", async () => {
  await page.locator("#pattern-input").fill("(");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.locator("#pattern-error")).toBeVisible();
  await shot("09-attempt-invalid");
});

await run("solving attempt flips to the solved banner", async () => {
  await page.locator("#pattern-input").fill("#[0-9a-f]{6}");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Solved in 2 attempts.")).toBeVisible();
  await shot("10-solved");
});

await run("leaderboard ranks the solver", async () => {
  await page.getByRole("link", { name: "Leaderboard" }).click();
  await page.waitForURL(`${BASE}/leaderboard`);
  const row = page.getByRole("row", { name: new RegExp(SOLVER) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("2.00");
  await shot("11-leaderboard");
});

await run("avatar upload updates the header", async () => {
  await page.getByRole("link", { name: new RegExp(SOLVER) }).click();
  await page.waitForURL(`${BASE}/profile`);
  await page.locator("#avatar-file").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  const avatarForm = page.locator("form", { has: page.locator("#avatar-file") });
  await avatarForm.locator('button[type="submit"]').click();
  await expect(page.locator("header img.avatar")).toBeVisible();
  await shot("12-profile-avatar");
});

await run("wrong current password maps inline", async () => {
  await page.locator("#current-password").fill("wrong-pass-1");
  await page.locator("#new-password").fill("secret-pass-3");
  await page.locator("#confirm-password").fill("secret-pass-3");
  const pwForm = page.locator("form", { has: page.locator("#current-password") });
  await pwForm.locator('button[type="submit"]').click();
  await expect(page.getByText(/current password is wrong/i)).toBeVisible();
});

await run("password change succeeds", async () => {
  await page.locator("#current-password").fill("secret-pass-2");
  await page.locator("#new-password").fill("secret-pass-3");
  await page.locator("#confirm-password").fill("secret-pass-3");
  const pwForm = page.locator("form", { has: page.locator("#current-password") });
  await pwForm.locator('button[type="submit"]').click();
  await expect(page.getByText("Password changed.")).toBeVisible();
});

await run("accessibility panel applies and persists", async () => {
  await page.selectOption("#font-select", "opendyslexic");
  await page.selectOption("#scale-select", "130");
  await page.selectOption("#theme-select", "light");
  const state = await page.evaluate(() => ({
    od: document.documentElement.classList.contains("font-od"),
    light: document.documentElement.classList.contains("theme-light"),
    size: document.documentElement.style.fontSize,
  }));
  if (!state.od || !state.light || state.size !== "130%") {
    throw new Error(JSON.stringify(state));
  }
  await shot("13-a11y-od-light-130");
  await page.reload();
  const after = await page.evaluate(() => ({
    od: document.documentElement.classList.contains("font-od"),
    light: document.documentElement.classList.contains("theme-light"),
    size: document.documentElement.style.fontSize,
  }));
  if (!after.od || !after.light || after.size !== "130%") {
    throw new Error(`lost after reload: ${JSON.stringify(after)}`);
  }
  await page.selectOption("#font-select", "atkinson");
  await page.selectOption("#scale-select", "100");
  await page.selectOption("#theme-select", "graphite");
});

await run("unknown URL renders the 404 page", async () => {
  await page.goto(`${BASE}/no/such/page`);
  await expect(page.getByText("Page not found")).toBeVisible();
  await expect(page).toHaveTitle("Page not found - RegexRiddle");
  await shot("14-not-found");
});

const phone = await browser.newContext({ viewport: { width: 375, height: 812 } });
const p = await phone.newPage();
track(p, "phone");

await run("phone: landing has no horizontal overflow", async () => {
  await p.goto(BASE);
  await p.waitForLoadState("networkidle");
  const over = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (over > 1) throw new Error(`overflow by ${over}px`);
  await p.screenshot({ path: `${SHOTS}/15-phone-landing.png` });
});

await run("phone: login, list and detail fit the viewport", async () => {
  await p.goto(`${BASE}/login`);
  await p.getByLabel("Username").fill(SOLVER);
  await p.locator('input[type="password"]').fill("secret-pass-3");
  await p.getByRole("button", { name: "Log in" }).click();
  await p.waitForURL(`${BASE}/challenges`);
  await p.screenshot({ path: `${SHOTS}/16-phone-challenges.png` });
  await p.getByRole("link", { name: TITLE }).click();
  await p.waitForURL(/\/challenges\/\d+$/);
  await p.waitForLoadState("networkidle");
  const over = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (over > 1) throw new Error(`overflow by ${over}px`);
  await p.screenshot({ path: `${SHOTS}/17-phone-detail.png` });
});

await run("phone: create form fits the viewport", async () => {
  await p.goto(`${BASE}/challenges/new`);
  await p.waitForLoadState("networkidle");
  const over = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (over > 1) throw new Error(`overflow by ${over}px`);
  await p.screenshot({ path: `${SHOTS}/18-phone-create.png` });
});

await browser.close();

console.log("\n--- summary ---");
console.log(problems.length === 0 ? "all steps passed" : `${problems.length} step(s) failed`);
for (const f of problems) console.log("  FAIL " + f);
// 401s and 422s are provoked on purpose above: the logged-out bootstrap of
// /api/auth/me and the wrong-password check answer 401; the bad-regex create
// and the engine-rejected attempt answer 422.
const realErrors = consoleErrors.filter(
  (e) => !/favicon|Download the Vue Devtools|status of 401|status of 422/i.test(e),
);
console.log(realErrors.length === 0 ? "no console errors" : "console errors:");
for (const e of realErrors) console.log("  " + e);
process.exit(problems.length === 0 && realErrors.length === 0 ? 0 : 1);
