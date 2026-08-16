import { test, expect, type Browser, type Page } from "@playwright/test";
import { createChallenge, registerUser, uniqueName } from "./helpers";

const PASSWORD = "Secret-pass-1";

// The live backend throttles registrations and attempts per ip. The helpers
// pace auth posts under the budget, but the waits they insert need room
// beyond the default 30s.
test.setTimeout(300_000);

const RIDDLE = {
  regex: "#[0-9a-f]{6}",
  examplePositive: "#1abc9c",
  exampleNegative: "blue",
  controlsPositive: ["#ffffff", "#1abc9c"],
  controlsNegative: ["1abc9c", "#fff"],
};

// Scoring anchors the pattern to the whole string, so against the controls
// above this pattern matches one positive (#ffffff) and fails to reject one
// negative (#fff): the score must read 1/2 and 1/2.
const PARTIAL_PATTERN = "#[a-f]{3,6}";

// Registers a fresh author in an isolated context and creates the riddle,
// so the author's session never leaks into the solver's page.
async function createRiddle(browser: Browser, title: string): Promise<number> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await registerUser(page, uniqueName("dotstar"), PASSWORD);
  const id = await createChallenge(page, { title, ...RIDDLE });
  await context.close();
  return id;
}

async function openAsNewSolver(page: Page, challengeId: number): Promise<void> {
  await registerUser(page, uniqueName("greedy_star"), PASSWORD);
  await page.goto(`/challenges/${challengeId}`);
}

// Submissions share one 60-per-minute budget per ip, so a 429 is retried
// after the window resets.
async function submitPattern(page: Page, pattern: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    await page.locator("#pattern-input").fill(pattern);
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          /\/api\/challenges\/\d+\/attempts$/.test(res.url()) &&
          res.request().method() === "POST",
      ),
      page.getByRole("button", { name: "Submit" }).click(),
    ]);
    if (response.status() !== 429 || attempt === 3) return;
    await page.waitForTimeout(61_000);
  }
}

test("a partial attempt reports the right positives and negatives counts", async ({
  page,
  browser,
}) => {
  const id = await createRiddle(browser, uniqueName("partial counts"));
  await openAsNewSolver(page, id);

  await submitPattern(page, PARTIAL_PATTERN);

  const score = page.locator(".attempt-score");
  await expect(score).toContainText("positives 1/2");
  await expect(score).toContainText("negatives 1/2");
  await expect(score).toContainText("not solved");

  const rows = page.locator(".attempt-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("positives 1/2");
  await expect(rows.first()).toContainText("negatives 1/2");
});

test("an engine-rejected pattern shows the inline error and adds no history row", async ({
  page,
  browser,
}) => {
  const id = await createRiddle(browser, uniqueName("engine reject"));
  await openAsNewSolver(page, id);

  await submitPattern(page, PARTIAL_PATTERN);
  await expect(page.locator(".attempt-row")).toHaveCount(1);

  await submitPattern(page, "(");
  await expect(page.locator("#pattern-error")).toBeVisible();
  await expect(page.locator("#pattern-error")).toContainText(
    "The engine rejected this pattern",
  );
  await expect(page.locator(".attempt-row")).toHaveCount(1);

  // After a reload the history comes from the server, so a stored invalid
  // attempt would surface here as a second row.
  await page.reload();
  const rows = page.locator(".attempt-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(`/${PARTIAL_PATTERN}/`);
});

test("solving flips to the solved banner and the history keeps every attempt", async ({
  page,
  browser,
}) => {
  const id = await createRiddle(browser, uniqueName("solved banner"));
  await openAsNewSolver(page, id);

  await submitPattern(page, PARTIAL_PATTERN);
  await expect(page.locator(".attempt-score")).toContainText("not solved");

  await submitPattern(page, RIDDLE.regex);
  await expect(page.getByText("Solved in 2 attempts.")).toBeVisible();
  await expect(page.locator("#pattern-input")).toHaveCount(0);

  const rows = page.locator(".attempt-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText(`/${PARTIAL_PATTERN}/`);
  await expect(rows.nth(0)).not.toContainText("solving attempt");
  await expect(rows.nth(1)).toContainText(`/${RIDDLE.regex}/`);
  await expect(rows.nth(1)).toContainText("solving attempt");
});

test("the author opening their own riddle sees the notice and no form", async ({
  page,
  browser,
}) => {
  const authorContext = await browser.newContext();
  const authorPage = await authorContext.newPage();
  await registerUser(authorPage, uniqueName("backref_9"), PASSWORD);
  const id = await createChallenge(authorPage, {
    title: uniqueName("author notice"),
    ...RIDDLE,
  });

  await expect(
    authorPage.getByText("This is your riddle. Authors cannot attempt it."),
  ).toBeVisible();
  await expect(authorPage.locator("#pattern-input")).toHaveCount(0);
  await expect(authorPage.getByRole("button", { name: "Submit" })).toHaveCount(0);

  // The same riddle offers the form to a non-author, so the missing form
  // above is the author check and not a rendering failure.
  await openAsNewSolver(page, id);
  await expect(page.locator("#pattern-input")).toBeVisible();
  await expect(page.getByText("Authors cannot attempt it")).toHaveCount(0);

  await authorContext.close();
});
