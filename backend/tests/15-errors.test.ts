// Error handler behavior for requests the JSON body parser rejects. These
// bypass HttpClient because they need a raw, deliberately broken body.
import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL;
if (!base) throw new Error("TEST_BASE_URL is not set; run via npm run test:api");

/**
 * Posts raw JSON text without serializing it first.
 * @param path - API path relative to the test server.
 * @param body - Raw request text, including deliberately invalid JSON.
 * @returns A promise with the HTTP status and parsed JSON response.
 */
async function postRaw(path: string, body: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  return { status: res.status, body: await res.json() };
}

// malformed JSON answers 400 with the JSON error shape, not a 500
{
  const res = await postRaw("/api/auth/login", "{ nope : ");
  assert.equal(res.status, 400);
  const body = res.body as { error: string };
  assert.equal(typeof body.error, "string");
  assert.notEqual(body.error, "Internal server error");
}

// a body over the 100kb json limit answers 413. The parser runs before the
// session middleware, so no login is needed to reach it.
{
  const oversized = JSON.stringify({ title: "x".repeat(200_000) });
  const res = await postRaw("/api/challenges", oversized);
  assert.equal(res.status, 413);
  const body = res.body as { error: string };
  assert.equal(typeof body.error, "string");
}
