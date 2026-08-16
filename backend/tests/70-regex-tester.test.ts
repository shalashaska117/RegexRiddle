// The public regex tester behind the tutorial page. It must agree with the
// engine that scores attempts, in particular on full-string matching, and it
// must stay reachable without a session.
import assert from "node:assert/strict";
import { HttpClient } from "./http.js";

const anonymous = new HttpClient();

async function testPattern(pattern: string, subject: string) {
  return anonymous.post("/api/regex/test", { pattern, subject });
}

// no session required
{
  const res = await testPattern("colou?r", "colour");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { matches: true });
}

// full-string semantics, the same rule attempts are scored under: "b" is a
// substring of "abc" but not a match
{
  assert.deepEqual((await testPattern("b", "abc")).body, { matches: false });
  assert.deepEqual((await testPattern(".+", "abc")).body, { matches: true });
  assert.deepEqual((await testPattern("[0-9]{3}", "12")).body, { matches: false });
  assert.deepEqual((await testPattern("[0-9]{3}", "123")).body, { matches: true });
}

// the empty subject is a legitimate test, not a missing field
{
  const res = await testPattern("a*", "");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { matches: true });
}

// syntax RE2 rejects answers 422 under "pattern", with a message the caller
// can act on
{
  const res = await testPattern("(a)\\1", "aa");
  assert.equal(res.status, 422);
  const body = res.body as { error: string; errors: Record<string, string> };
  assert.equal(body.error, "Validation failed");
  assert.ok(body.errors["pattern"].length > 0);

  assert.equal((await testPattern("(?=a)", "a")).status, 422);
  // an unmatched ")" would escape the anchoring wrapper, so it is refused
  assert.equal((await testPattern("a)|(b", "a")).status, 422);
}

// a pattern that pins a backtracking engine stays fast here
{
  const started = performance.now();
  const res = await testPattern("(a+)+", "a".repeat(199) + "b");
  const elapsed = performance.now() - started;
  assert.deepEqual(res.body, { matches: false });
  assert.ok(elapsed < 1000, `(a+)+ on 200 chars took ${elapsed}ms`);
}

// shape rejections: empty pattern, oversized pattern and subject, stray field
{
  assert.equal((await testPattern("", "a")).status, 422);
  assert.equal((await testPattern("a".repeat(501), "a")).status, 422);
  assert.equal((await testPattern("a", "a".repeat(1001))).status, 422);
  assert.equal((await anonymous.post("/api/regex/test", { pattern: "a" })).status, 422);
  const stray = await anonymous.post("/api/regex/test", {
    pattern: "a",
    subject: "a",
    flags: "i",
  });
  assert.equal(stray.status, 422);
}
