import { test, expect } from "@playwright/test";

/**
 * Check that editing a pending attempt keeps the submitted pattern in history.
 * @param fixtures - Playwright fixtures for this test.
 * @param fixtures.page - Isolated browser page used for the actions and checks.
 * @returns A promise with no value; rejects if a check fails.
 */
test("editing a pending attempt keeps the submitted pattern in history", async ({ page }) => {
  await page.route("**/api/auth/me",
    /**
     * Reply with a signed-in solver without contacting the backend.
     * @param route - Intercepted profile request to answer.
     * @returns A promise with no value, resolved after sending the fake profile.
     */
    (route) => route.fulfill({
      json: {
        id: 2,
        username: "solver",
        avatarUrl: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    }));
  await page.route("**/api/challenges/42",
    /**
     * Reply with an unsolved challenge and empty attempt history.
     * @param route - Intercepted challenge request to answer.
     * @returns A promise with no value, resolved after sending the fake challenge.
     */
    (route) => route.fulfill({
      json: {
        id: 42,
        title: "Pending attempt",
        author: { id: 1, username: "author" },
        createdAt: "2026-01-01T00:00:00.000Z",
        examplePositive: "a",
        exampleNegative: "b",
        controlCounts: { positive: 2, negative: 2 },
        solvedByMe: false,
        myAttempts: [],
      },
    }));

  let releaseResponse!: () => void;
  const responseReady = new Promise<void>(
    /**
     * Save the callback that releases the delayed attempt response.
     * @param resolve - Callback used by the test to release the response.
     * @returns Nothing; stores resolve in releaseResponse.
     */
    (resolve) => {
      releaseResponse = resolve;
    });
  await page.route("**/api/challenges/42/attempts",
    /**
     * Hold the attempt response until the test has changed the input.
     * @param route - Intercepted attempt request to answer.
     * @returns A promise with no value, resolved after sending the fixed score.
     */
    async (route) => {
      await responseReady;
      await route.fulfill({
        json: {
          positivesMatched: 1,
          totalPositives: 2,
          negativesMatched: 2,
          totalNegatives: 2,
          solved: false,
          attemptNumber: 1,
        },
      });
    });

  try {
    await page.goto("/challenges/42");
    const pattern = page.locator("#pattern-input");
    await pattern.fill("^a$");
    const sentRequest = page.waitForRequest(
      /**
       * Identify the submitted attempt request before inspecting its body.
       * @param request - Browser request to inspect.
       * @returns True for POST /api/challenges/42/attempts.
       */
      (request) =>
        new URL(request.url()).pathname === "/api/challenges/42/attempts" &&
        request.method() === "POST",
    );
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    expect((await sentRequest).postDataJSON()).toEqual({ regex: "^a$" });

    await pattern.fill("^b$");
    releaseResponse();

    await expect(page.locator(".attempt-pattern")).toHaveText("/^a$/");
    await expect(page.locator(".attempt-row")).toContainText("positives 1/2");
    await expect(pattern).toHaveValue("^b$");
  } finally {
    releaseResponse();
  }
});
