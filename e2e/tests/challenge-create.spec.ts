import { test, expect, type Page } from "@playwright/test";
import { createChallenge, registerUser, uniqueName } from "./helpers";

const PASSWORD = "Secret-pass-1";

async function fillBaseFields(
  page: Page,
  fields: {
    title: string;
    regex: string;
    examplePositive: string;
    exampleNegative: string;
  },
): Promise<void> {
  await page.goto("/challenges/new");
  await page.locator("#cc-title").fill(fields.title);
  await page.locator("#cc-regex").fill(fields.regex);
  await page.locator("#cc-example-positive").fill(fields.examplePositive);
  await page.locator("#cc-example-negative").fill(fields.exampleNegative);
}

// The client-side validator only rejects empty and oversized fields, so the
// values in the two failure tests reach the server and the inline errors
// asserted below can only come from its 422 response.
async function submitExpecting422(page: Page): Promise<void> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().endsWith("/api/challenges") && res.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Create challenge" }).click(),
  ]);
  expect(response.status()).toBe(422);
}

test("a regex that does not compile shows an inline 422 error", async ({ page }) => {
  await registerUser(page, uniqueName("dotstar"), PASSWORD);
  await fillBaseFields(page, {
    title: uniqueName("broken paren"),
    regex: "a(",
    examplePositive: "aa",
    exampleNegative: "b",
  });
  await page.getByRole("textbox", { name: "Positive control 1" }).fill("aa");
  await page.getByRole("textbox", { name: "Negative control 1" }).fill("b");
  await submitExpecting422(page);

  const regexField = page.locator(".field", { has: page.locator("#cc-regex") });
  await expect(regexField.locator(".error-text")).toBeVisible();
  await expect(page).toHaveURL("/challenges/new");
});

test("a control that does not match the secret regex errors on its own row", async ({
  page,
}) => {
  await registerUser(page, uniqueName("backref_9"), PASSWORD);
  await fillBaseFields(page, {
    title: uniqueName("hex color"),
    regex: "#[0-9a-f]{6}",
    examplePositive: "#1abc9c",
    exampleNegative: "blue",
  });
  const positives = page.getByRole("group", { name: "Positive controls" });
  await positives.getByRole("textbox", { name: "Positive control 1" }).fill("#ffffff");
  await positives.getByRole("button", { name: "Add string" }).click();
  await positives
    .getByRole("textbox", { name: "Positive control 2" })
    .fill("not-a-color");
  await page.getByRole("textbox", { name: "Negative control 1" }).fill("1abc9c");
  await submitExpecting422(page);

  const failingRow = positives.locator(".row-block", {
    has: page.getByRole("textbox", { name: "Positive control 2" }),
  });
  await expect(failingRow.locator(".error-text")).toBeVisible();
  await expect(failingRow.locator(".error-text")).toContainText("index 1");
  const passingRow = positives.locator(".row-block", {
    has: page.getByRole("textbox", { name: "Positive control 1" }),
  });
  await expect(passingRow.locator(".error-text")).toHaveCount(0);
  await expect(page).toHaveURL("/challenges/new");
});

test("a valid creation lands on the detail page with examples and control counts", async ({
  page,
}) => {
  await registerUser(page, uniqueName("greedy_star"), PASSWORD);
  const title = uniqueName("hex color");
  await createChallenge(page, {
    title,
    regex: "#[0-9a-f]{6}",
    examplePositive: "#1abc9c",
    exampleNegative: "blue",
    controlsPositive: ["#ffffff", "#000000"],
    controlsNegative: ["1abc9c", "#fff"],
  });

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const examples = page.locator(".example-list");
  const positiveRow = examples.locator("li", {
    has: page.getByText("matches", { exact: true }),
  });
  await expect(positiveRow.locator(".example-string")).toHaveText("#1abc9c");
  const negativeRow = examples.locator("li", {
    has: page.getByText("does not match", { exact: true }),
  });
  await expect(negativeRow.locator(".example-string")).toHaveText("blue");
  await expect(
    page.getByText("scored against 2 positive and 2 negative secret strings"),
  ).toBeVisible();
});
