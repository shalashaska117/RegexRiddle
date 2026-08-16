// Leaderboard: two solvers with different attempt patterns on challenges
// created by a third user, exact order and avgAttempts values.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { HttpClient } from "./http.js";
import { prisma } from "../src/db.js";

const author = new HttpClient();
const solverA = new HttpClient();
const solverB = new HttpClient();
const anonymous = new HttpClient();

// unique per run so reruns stay green against the same database
const unique = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
const password = "A sufficiently long password!";
const usernameA = `la_${unique}`;
const usernameB = `lb_${unique}`;
const usernameAuthor = `lc_${unique}`;

// The leaderboard is global and capped at 50 rows, so attempts left behind
// by earlier runs of this file could push this run's users out of the
// response. Only this file creates la_/lb_ usernames; dropping their old
// attempts keeps the assertions deterministic without touching other data.
await prisma.attempt.deleteMany({
  where: {
    OR: [
      { user: { username: { startsWith: "la_" } } },
      { user: { username: { startsWith: "lb_" } } },
    ],
  },
});

async function registerAndLogin(client: HttpClient, username: string): Promise<void> {
  const register = await client.post("/api/auth/register", { username, password });
  assert.equal(register.status, 201);
  const login = await client.post("/api/auth/login", { username, password });
  assert.equal(login.status, 200);
}

await registerAndLogin(author, usernameAuthor);
await registerAndLogin(solverA, usernameA);
await registerAndLogin(solverB, usernameB);

// three identical challenges; what differs is how many attempts each solver
// needs on them
const challengeIds: number[] = [];
for (let i = 0; i < 3; i++) {
  const res = await author.post("/api/challenges", {
    title: `Leaderboard ${i} ${unique}`,
    regex: "[ab]+",
    examplePositive: "ab",
    exampleNegative: "x",
    controlsPositive: ["a", "ab"],
    controlsNegative: ["", "x"],
  });
  assert.equal(res.status, 201);
  challengeIds.push((res.body as { id: number }).id);
}

interface Row {
  rank: number;
  user: { id: number; username: string; avatarUrl: string | null };
  solvedCount: number;
  avgAttempts: number;
}

async function fetchRows(): Promise<Row[]> {
  const res = await solverA.get("/api/leaderboard");
  assert.equal(res.status, 200);
  const rows = res.body as Row[];
  assert.ok(Array.isArray(rows));
  return rows;
}

async function attempt(client: HttpClient, challengeId: number, regex: string, solved: boolean): Promise<void> {
  const res = await client.post(`/api/challenges/${challengeId}/attempts`, { regex });
  assert.equal(res.status, 201);
  assert.equal((res.body as { solved: boolean }).solved, solved);
}

// unauthenticated requests get 401
{
  assert.equal((await anonymous.get("/api/leaderboard")).status, 401);
}

// failed attempts alone do not put a user on the board: solver B misses
// twice on the first challenge and must not appear yet
{
  await attempt(solverB, challengeIds[0]!, "a+", false);
  await attempt(solverB, challengeIds[0]!, "b+", false);
  const rows = await fetchRows();
  assert.ok(!rows.some((r) => r.user.username === usernameB), "user with no solve is on the board");
}

// solver A solves all three on the first try: solvedCount 3, avgAttempts 1.
// Solver B closes out challenge 0 on the third attempt and the other two on
// the first: (3 + 1 + 1) / 3 rounds to 1.67.
{
  for (const id of challengeIds) {
    await attempt(solverA, id, "[ab]+", true);
  }
  await attempt(solverB, challengeIds[0]!, "[ab]+", true);
  await attempt(solverB, challengeIds[1]!, "[ab]+", true);
  await attempt(solverB, challengeIds[2]!, "[ab]+", true);
}

{
  const rows = await fetchRows();
  assert.ok(rows.length <= 50);

  // every row has the documented shape and rank is the 1-based position
  rows.forEach((row, index) => {
    assert.deepEqual(Object.keys(row).sort(), ["avgAttempts", "rank", "solvedCount", "user"]);
    assert.deepEqual(Object.keys(row.user).sort(), ["avatarUrl", "id", "username"]);
    assert.equal(row.rank, index + 1);
  });

  // the whole response respects the ordering rule, not just our two rows
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]!;
    const curr = rows[i]!;
    const ordered =
      prev.solvedCount > curr.solvedCount ||
      (prev.solvedCount === curr.solvedCount &&
        (prev.avgAttempts < curr.avgAttempts ||
          (prev.avgAttempts === curr.avgAttempts && prev.user.username < curr.user.username)));
    assert.ok(ordered, `rows ${i - 1} and ${i} are out of order`);
  }

  const indexA = rows.findIndex((r) => r.user.username === usernameA);
  const indexB = rows.findIndex((r) => r.user.username === usernameB);
  assert.ok(indexA >= 0, "solver A is missing from the board");
  assert.ok(indexB >= 0, "solver B is missing from the board");
  // same solvedCount, so the lower average ranks first
  assert.ok(indexA < indexB, "solver A must rank above solver B");

  const rowA = rows[indexA]!;
  assert.equal(rowA.solvedCount, 3);
  assert.equal(rowA.avgAttempts, 1);
  assert.equal(rowA.user.avatarUrl, null);

  const rowB = rows[indexB]!;
  assert.equal(rowB.solvedCount, 3);
  assert.equal(rowB.avgAttempts, 1.67);

  // the author never solved anything and must not appear
  assert.ok(!rows.some((r) => r.user.username === usernameAuthor), "author is on the board without a solve");
}
