// Challenge creation, list and detail. Covers the validation battery and
// checks that the secret regex and the control values never reach a
// response body.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { HttpClient } from "./http.js";

const client = new HttpClient();
const anonymous = new HttpClient();

// unique per run so reruns stay green against the same database
const unique = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
const username = `c_${unique}`;
const password = "A sufficiently long password!";

// The secret side of the test challenge. The control values are chosen so
// that none of them is a substring of the public fields, which lets the
// leak checks below use plain substring search.
const secretRegex = `rr_${unique}_[0-9]+`;
const controlsPositive = [`rr_${unique}_1`, `rr_${unique}_23456`];
const controlsNegative = [`zz_${unique}`, `rr_${unique}_x9`];

const validBody = {
  title: `Challenge ${unique}`,
  regex: secretRegex,
  examplePositive: `rr_${unique}_2026`,
  exampleNegative: `rr_${unique}_x`,
  controlsPositive,
  controlsNegative,
};

// register and log in
let userId: number;
{
  const res = await client.post("/api/auth/register", { username, password });
  assert.equal(res.status, 201);
  userId = (res.body as { id: number }).id;
  const login = await client.post("/api/auth/login", { username, password });
  assert.equal(login.status, 200);
}

// unauthenticated requests get 401
{
  assert.equal((await anonymous.post("/api/challenges", validBody)).status, 401);
  assert.equal((await anonymous.get("/api/challenges")).status, 401);
  assert.equal((await anonymous.get("/api/challenges/1")).status, 401);
}

// create a valid challenge; the response carries the id and nothing else
let challengeId: number;
{
  const res = await client.post("/api/challenges", validBody);
  assert.equal(res.status, 201);
  const body = res.body as { id: number };
  assert.equal(typeof body.id, "number");
  assert.deepEqual(Object.keys(body), ["id"]);
  challengeId = body.id;
}

function errorsOf(res: { status: number; body: unknown }): Record<string, string> {
  assert.equal(res.status, 422, `expected 422, got ${res.status}: ${JSON.stringify(res.body)}`);
  const body = res.body as { error: string; errors: Record<string, string> };
  assert.equal(body.error, "Validation failed");
  return body.errors;
}

// positive example that does not match the regex
{
  const res = await client.post("/api/challenges", {
    ...validBody,
    examplePositive: `rr_${unique}_x2`,
  });
  const errors = errorsOf(res);
  assert.equal(typeof errors["examplePositive"], "string");
}

// negative example that matches the regex
{
  const res = await client.post("/api/challenges", {
    ...validBody,
    exampleNegative: `rr_${unique}_99`,
  });
  const errors = errorsOf(res);
  assert.equal(typeof errors["exampleNegative"], "string");
}

// non-matching positive control, reported with its index
{
  const res = await client.post("/api/challenges", {
    ...validBody,
    controlsPositive: [`rr_${unique}_1`, `broken_${unique}`],
  });
  const errors = errorsOf(res);
  const message = errors["controlsPositive.1"] ?? "";
  assert.ok(message.includes("index 1"), `unexpected message: ${message}`);
}

// a control value used in both arrays is rejected as a duplicate
{
  const res = await client.post("/api/challenges", {
    ...validBody,
    controlsNegative: [`zz_${unique}`, `rr_${unique}_1`],
  });
  const errors = errorsOf(res);
  const message = errors["controlsNegative.1"] ?? "";
  assert.ok(message.includes("duplicate"), `unexpected message: ${message}`);
}

// regex the engine rejects: a syntax error, an unsupported backreference,
// and an unmatched ")" that would escape the full-match anchoring
{
  const syntax = errorsOf(await client.post("/api/challenges", { ...validBody, regex: "(a" }));
  assert.equal(typeof syntax["regex"], "string");
  const backref = errorsOf(await client.post("/api/challenges", { ...validBody, regex: "(a)\\1" }));
  assert.equal(typeof backref["regex"], "string");
  const injection = errorsOf(await client.post("/api/challenges", { ...validBody, regex: "a)|(b" }));
  assert.equal(typeof injection["regex"], "string");
}

// more than 10 controls in one array
{
  const res = await client.post("/api/challenges", {
    ...validBody,
    controlsPositive: Array.from({ length: 11 }, (_, i) => `rr_${unique}_90${i}`),
  });
  const errors = errorsOf(res);
  assert.equal(typeof errors["controlsPositive"], "string");
}

// unknown body field
{
  const res = await client.post("/api/challenges", { ...validBody, secretHint: "nope" });
  assert.equal(res.status, 422);
}

// list: newest first, with the caller's solve state and zeroed counters
{
  const res = await client.get("/api/challenges");
  assert.equal(res.status, 200);
  const list = res.body as Array<{
    id: number;
    title: string;
    author: { id: number; username: string };
    createdAt: string;
    solvedByMe: boolean;
    myAttempts: number;
    solvedCount: number;
  }>;
  assert.ok(Array.isArray(list));
  const entry = list.find((c) => c.id === challengeId);
  assert.ok(entry, "created challenge missing from the list");
  assert.equal(entry.title, validBody.title);
  assert.deepEqual(entry.author, { id: userId, username });
  assert.equal(typeof entry.createdAt, "string");
  assert.equal(entry.solvedByMe, false);
  assert.equal(entry.myAttempts, 0);
  assert.equal(entry.solvedCount, 0);
  assert.deepEqual(Object.keys(entry).sort(), [
    "author",
    "createdAt",
    "id",
    "myAttempts",
    "solvedByMe",
    "solvedCount",
    "title",
  ]);
  // the challenge created above is the most recent one in the database
  assert.equal(list[0]?.id, challengeId);
  const text = JSON.stringify(res.body);
  assert.ok(!text.includes(secretRegex), "secret regex leaked into the list");
  for (const value of [...controlsPositive, ...controlsNegative]) {
    assert.ok(!text.includes(value), "control value leaked into the list");
  }
}

// detail: public fields plus control counts, never the values
{
  const res = await client.get(`/api/challenges/${challengeId}`);
  assert.equal(res.status, 200);
  const body = res.body as {
    id: number;
    title: string;
    author: { id: number; username: string };
    createdAt: string;
    examplePositive: string;
    exampleNegative: string;
    controlCounts: { positive: number; negative: number };
    solvedByMe: boolean;
    myAttempts: unknown[];
  };
  assert.equal(body.id, challengeId);
  assert.equal(body.title, validBody.title);
  assert.deepEqual(body.author, { id: userId, username });
  assert.equal(body.examplePositive, validBody.examplePositive);
  assert.equal(body.exampleNegative, validBody.exampleNegative);
  assert.deepEqual(body.controlCounts, { positive: 2, negative: 2 });
  assert.equal(body.solvedByMe, false);
  assert.deepEqual(body.myAttempts, []);
  assert.deepEqual(Object.keys(body).sort(), [
    "author",
    "controlCounts",
    "createdAt",
    "exampleNegative",
    "examplePositive",
    "id",
    "myAttempts",
    "solvedByMe",
    "title",
  ]);
  const text = JSON.stringify(res.body);
  assert.ok(!text.includes(secretRegex), "secret regex leaked into the detail");
  for (const value of [...controlsPositive, ...controlsNegative]) {
    assert.ok(!text.includes(value), "control value leaked into the detail");
  }
}

// absent id answers 404, malformed id fails validation
{
  assert.equal((await client.get("/api/challenges/999999999")).status, 404);
  assert.equal((await client.get("/api/challenges/not-a-number")).status, 422);
}
