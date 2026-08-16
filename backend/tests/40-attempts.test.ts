// Attempt submission and scoring. User A authors a challenge with known
// controls, user B attempts it: partial scores, a solve with a regex written
// differently from the secret, and the 401/403/404/409/422 rejections.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { HttpClient } from "./http.js";

const author = new HttpClient();
const solver = new HttpClient();
const anonymous = new HttpClient();

// unique per run so reruns stay green against the same database
const unique = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
const password = "A sufficiently long password!";

async function registerAndLogin(client: HttpClient, username: string): Promise<void> {
  const register = await client.post("/api/auth/register", { username, password });
  assert.equal(register.status, 201);
  const login = await client.post("/api/auth/login", { username, password });
  assert.equal(login.status, 200);
}

await registerAndLogin(author, `aa_${unique}`);
await registerAndLogin(solver, `ab_${unique}`);

// the challenge under test: secret [ab]+ with fully known controls
let challengeId: number;
{
  const res = await author.post("/api/challenges", {
    title: `Attempts ${unique}`,
    regex: "[ab]+",
    examplePositive: "aab",
    exampleNegative: "ab7",
    controlsPositive: ["a", "ab", "bb"],
    controlsNegative: ["", "abc", "x"],
  });
  assert.equal(res.status, 201);
  challengeId = (res.body as { id: number }).id;
}

const attemptsPath = `/api/challenges/${challengeId}/attempts`;

// unauthenticated requests get 401
{
  assert.equal((await anonymous.post(attemptsPath, { regex: "a+" })).status, 401);
  assert.equal((await anonymous.get(attemptsPath)).status, 401);
}

// unknown challenge answers 404 on both endpoints
{
  assert.equal((await solver.post("/api/challenges/999999999/attempts", { regex: "a+" })).status, 404);
  assert.equal((await solver.get("/api/challenges/999999999/attempts")).status, 404);
}

// shape failures: unknown body field, missing regex
{
  assert.equal((await solver.post(attemptsPath, { regex: "a+", hint: true })).status, 422);
  assert.equal((await solver.post(attemptsPath, {})).status, 422);
}

// partial solution: a+ matches only the positive "a" and none of the
// negatives, so all three negatives count as handled
{
  const res = await solver.post(attemptsPath, { regex: "a+" });
  assert.equal(res.status, 201);
  assert.deepEqual(res.body, {
    positivesMatched: 1,
    totalPositives: 3,
    negativesMatched: 3,
    totalNegatives: 3,
    solved: false,
    attemptNumber: 1,
  });
}

// another partial: [abc]+ matches every positive but also the negative "abc"
{
  const res = await solver.post(attemptsPath, { regex: "[abc]+" });
  assert.equal(res.status, 201);
  assert.deepEqual(res.body, {
    positivesMatched: 3,
    totalPositives: 3,
    negativesMatched: 2,
    totalNegatives: 3,
    solved: false,
    attemptNumber: 2,
  });
}

// a regex the engine rejects answers 422 and leaves no row
{
  const res = await solver.post(attemptsPath, { regex: "(a" });
  assert.equal(res.status, 422);
  const body = res.body as { error: string; errors: Record<string, string> };
  assert.equal(body.error, "Validation failed");
  assert.equal(typeof body.errors["regex"], "string");
}

// ")|(" would escape the full-match anchoring and score as a solve; it
// must be rejected like any other invalid pattern, leaving no row
{
  const res = await solver.post(attemptsPath, { regex: ")|(" });
  assert.equal(res.status, 422);
  const body = res.body as { errors: Record<string, string> };
  assert.equal(typeof body.errors["regex"], "string");
}

// (a|b)+ agrees with the secret [ab]+ on every control, so it solves the
// challenge even though the source differs
{
  const res = await solver.post(attemptsPath, { regex: "(a|b)+" });
  assert.equal(res.status, 201);
  assert.deepEqual(res.body, {
    positivesMatched: 3,
    totalPositives: 3,
    negativesMatched: 3,
    totalNegatives: 3,
    solved: true,
    attemptNumber: 3,
  });
}

// once solved, further attempts answer 409
{
  const res = await solver.post(attemptsPath, { regex: "[ab]+" });
  assert.equal(res.status, 409);
  assert.equal(typeof (res.body as { error: string }).error, "string");
}

// the author gets 403 on their own challenge
{
  const res = await author.post(attemptsPath, { regex: "[ab]+" });
  assert.equal(res.status, 403);
  assert.equal(typeof (res.body as { error: string }).error, "string");
}

// attempt list: the three recorded attempts, oldest first; the rejected
// submissions (invalid regex, after-solved) left no rows
{
  const res = await solver.get(attemptsPath);
  assert.equal(res.status, 200);
  const list = res.body as Array<{
    proposedRegex: string;
    positivesMatched: number;
    negativesMatched: number;
    solved: boolean;
    createdAt: string;
  }>;
  assert.equal(list.length, 3);
  assert.deepEqual(list.map((a) => a.proposedRegex), ["a+", "[abc]+", "(a|b)+"]);
  assert.deepEqual(list.map((a) => a.solved), [false, false, true]);
  for (const attempt of list) {
    assert.deepEqual(Object.keys(attempt).sort(), [
      "createdAt",
      "negativesMatched",
      "positivesMatched",
      "proposedRegex",
      "solved",
    ]);
  }
}

// the author never attempted, so their list is empty
{
  const res = await author.get(attemptsPath);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
}

// the challenge detail reflects the solve
{
  const res = await solver.get(`/api/challenges/${challengeId}`);
  assert.equal(res.status, 200);
  const body = res.body as { solvedByMe: boolean; myAttempts: unknown[] };
  assert.equal(body.solvedByMe, true);
  assert.equal(body.myAttempts.length, 3);
}
