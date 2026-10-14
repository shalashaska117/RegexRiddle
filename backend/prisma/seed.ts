// Sample data for the live exam demo: six users (password "Demo-password"),
// seven challenges and enough attempt history to fill the leaderboard.
// Every stored score is computed by the same RE2 engine the API uses; a
// hand-written expectation that disagrees with the engine aborts the seed.
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { createMatcher } from "../src/services/regex/engine.js";
import { truncateAll } from "../scripts/reset-db.js";

const prisma = new PrismaClient();

const PASSWORD = "Demo-password";
const HOUR = 60 * 60 * 1000;
const start = Date.now();

/**
 * Places a demo timestamp before the seed start.
 * @param days - Number of days to subtract, including fractions.
 * @returns The earlier date.
 */
function daysAgo(days: number): Date {
  return new Date(start - days * 24 * HOUR);
}

/**
 * Stops the seed with a prefixed error.
 * @param message - Reason the seed cannot continue.
 * @returns Never returns; throws the seed error.
 */
function fail(message: string): never {
  throw new Error(`seed: ${message}`);
}

interface Score {
  positivesMatched: number;
  negativesMatched: number;
  solved: boolean;
}

// Mirrors attemptService: positives count matches, negatives count
// non-matches, solved needs both counts full.
/**
 * Scores a proposed pattern against the demo controls.
 * @param pattern - Regex source to evaluate.
 * @param positives - Control strings the pattern must match.
 * @param negatives - Control strings the pattern must reject.
 * @returns The positive and negative scores and whether every control passed.
 */
function score(pattern: string, positives: string[], negatives: string[]): Score {
  const matcher = createMatcher(pattern);
  if (!matcher.ok) fail(`pattern "${pattern}" rejected by the engine: ${matcher.error}`);
  const positivesMatched = positives.filter(
    /**
     * Selects positive controls accepted by the pattern.
     * @param v - Positive control string.
     * @returns Whether the pattern matches the control.
     */
    (v) => matcher.test(v)
  ).length;
  const negativesMatched = negatives.filter(
    /**
     * Selects negative controls rejected by the pattern.
     * @param v - Negative control string.
     * @returns Whether the pattern rejects the control.
     */
    (v) => !matcher.test(v)
  ).length;
  return {
    positivesMatched,
    negativesMatched,
    solved: positivesMatched === positives.length && negativesMatched === negatives.length,
  };
}

interface UserSpec {
  username: string;
  createdAt: Date;
}

interface ChallengeSpec {
  key: string;
  author: string;
  title: string;
  secretRegex: string;
  examplePositive: string;
  exampleNegative: string;
  controlsPositive: string[];
  controlsNegative: string[];
  createdAt: Date;
}

interface HistorySpec {
  user: string;
  challenge: string;
  firstAt: Date;
  minutesBetween: number;
  // when true the last regex must solve the challenge; every earlier one
  // must fall short, so nobody ever attempts after solving
  solves: boolean;
  regexes: string[];
}

const users: UserSpec[] = [
  { username: "demo", createdAt: daysAgo(14) },
  { username: "dotstar", createdAt: daysAgo(13.9) },
  { username: "backref_9", createdAt: daysAgo(13.8) },
  { username: "greedy_star", createdAt: daysAgo(13.7) },
  { username: "lazy_plus", createdAt: daysAgo(13.6) },
  { username: "kleene_bot", createdAt: daysAgo(13.5) },
];

const challenges: ChallengeSpec[] = [
  {
    key: "hex-color",
    author: "dotstar",
    title: "Hex color code",
    secretRegex: "#[0-9a-fA-F]{6}",
    examplePositive: "#1a2b3c",
    exampleNegative: "#12345",
    controlsPositive: ["#ff8800", "#00FF88", "#A1b2C3", "#000000"],
    controlsNegative: ["#ff880", "ff8800", "#12345g", "#1234567"],
    createdAt: daysAgo(13.2),
  },
  {
    key: "iso-date",
    author: "backref_9",
    title: "ISO date",
    secretRegex: String.raw`\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])`,
    examplePositive: "2026-08-12",
    exampleNegative: "12-08-2026",
    controlsPositive: ["1999-12-31", "2000-01-01", "2026-02-28", "2024-10-05"],
    controlsNegative: ["2026-13-01", "2026-08-32", "26-08-12", "2026/08/12", "2026-8-12"],
    createdAt: daysAgo(12.4),
  },
  {
    key: "time-24h",
    author: "greedy_star",
    title: "24-hour time",
    secretRegex: String.raw`([01]\d|2[0-3]):[0-5]\d`,
    examplePositive: "09:30",
    exampleNegative: "24:00",
    controlsPositive: ["00:00", "13:37", "23:59"],
    controlsNegative: ["25:00", "9:30", "12:60", "07:5"],
    createdAt: daysAgo(11.3),
  },
  {
    key: "semver",
    author: "lazy_plus",
    title: "Semantic version",
    secretRegex: String.raw`(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)`,
    examplePositive: "1.0.0",
    exampleNegative: "v2.1.0",
    controlsPositive: ["0.1.0", "10.2.33", "2.0.15", "123.0.1"],
    controlsNegative: ["01.2.3", "1.0", "1.0.0-beta", "1..0"],
    createdAt: daysAgo(10.2),
  },
  {
    key: "username",
    author: "kleene_bot",
    title: "Lowercase handle",
    secretRegex: "[a-z][a-z0-9_]{2,15}",
    examplePositive: "greedy_star",
    exampleNegative: "9lives",
    controlsPositive: ["dotstar", "a_1", "regex_fan_99", "xyz"],
    controlsNegative: ["ab", "_underscore", "CamelCase", "has-dash", "waytoolongusername_over_sixteen"],
    createdAt: daysAgo(9.1),
  },
  {
    key: "css-unit",
    author: "dotstar",
    title: "CSS size value",
    secretRegex: String.raw`-?\d+(\.\d+)?(px|em|rem|%)`,
    examplePositive: "12px",
    exampleNegative: "12pt",
    controlsPositive: ["100%", "-3.5em", "0.25rem", "42px", "1.5em"],
    controlsNegative: ["12", "px", "12 px", "1.2.3px", ".5em"],
    createdAt: daysAgo(8.3),
  },
  {
    key: "ipv4",
    author: "demo",
    title: "IPv4 address",
    secretRegex: String.raw`((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)`,
    examplePositive: "192.168.0.1",
    exampleNegative: "256.100.1.1",
    controlsPositive: ["8.8.8.8", "255.255.255.255", "10.0.42.7", "172.16.254.3"],
    controlsNegative: ["300.1.2.3", "192.168.00.1", "1.2.3.4.5", "192.168.1"],
    createdAt: daysAgo(7.2),
  },
];

// Planned leaderboard: backref_9 solves 3 (avg 1.33), demo 2 (avg 1.5),
// dotstar 2 (avg 2), lazy_plus 1 (avg 1), greedy_star 1 (avg 4);
// kleene_bot never solves anything and stays off the board.
const histories: HistorySpec[] = [
  {
    user: "backref_9",
    challenge: "hex-color",
    firstAt: daysAgo(10.5),
    minutesBetween: 0,
    solves: true,
    regexes: ["#[0-9A-Fa-f]{6}"],
  },
  {
    user: "dotstar",
    challenge: "iso-date",
    firstAt: daysAgo(9.5),
    minutesBetween: 30,
    solves: true,
    regexes: [
      String.raw`\d{4}-\d{2}-\d{2}`,
      String.raw`\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])`,
    ],
  },
  {
    user: "kleene_bot",
    challenge: "hex-color",
    firstAt: daysAgo(8),
    minutesBetween: 45,
    solves: false,
    regexes: ["#.{6}", "#[0-9a-fA-F]+"],
  },
  {
    user: "greedy_star",
    challenge: "css-unit",
    firstAt: daysAgo(6.5),
    minutesBetween: 18,
    solves: true,
    regexes: [
      String.raw`\d+px`,
      String.raw`\d+(px|em|rem|%)`,
      String.raw`-?\d+(\.\d+)?(px|em|rem)`,
      String.raw`-?\d+(\.\d+)?(px|em|rem|%)`,
    ],
  },
  {
    user: "demo",
    challenge: "hex-color",
    firstAt: daysAgo(6),
    minutesBetween: 25,
    solves: true,
    regexes: ["#[0-9a-f]{6}", "#[0-9a-fA-F]{6}"],
  },
  {
    user: "backref_9",
    challenge: "semver",
    firstAt: daysAgo(5),
    minutesBetween: 15,
    solves: true,
    regexes: [
      String.raw`\d+\.\d+\.\d+`,
      String.raw`(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)`,
    ],
  },
  {
    user: "demo",
    challenge: "time-24h",
    firstAt: daysAgo(4.2),
    minutesBetween: 0,
    solves: true,
    regexes: [String.raw`([01][0-9]|2[0-3]):[0-5][0-9]`],
  },
  {
    user: "dotstar",
    challenge: "ipv4",
    firstAt: daysAgo(3),
    minutesBetween: 40,
    solves: true,
    regexes: [
      String.raw`(\d{1,3}\.){3}\d{1,3}`,
      String.raw`((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])`,
    ],
  },
  {
    user: "backref_9",
    challenge: "username",
    firstAt: daysAgo(2.3),
    minutesBetween: 0,
    solves: true,
    regexes: ["[a-z][a-z0-9_]{2,15}"],
  },
  {
    user: "greedy_star",
    challenge: "semver",
    firstAt: daysAgo(1.5),
    minutesBetween: 20,
    solves: false,
    regexes: [String.raw`\d+(\.\d+)+`, String.raw`\d+\.\d+\.\d+`],
  },
  {
    user: "lazy_plus",
    challenge: "username",
    firstAt: daysAgo(1.1),
    minutesBetween: 0,
    solves: true,
    regexes: ["[a-z][_a-z0-9]{2,15}"],
  },
];

/**
 * Checks that a demo challenge has consistent examples and controls.
 * @param c - Demo challenge to validate.
 * @returns Nothing; throws when the challenge is inconsistent.
 */
function validateChallenge(c: ChallengeSpec): void {
  const matcher = createMatcher(c.secretRegex);
  if (!matcher.ok) fail(`challenge ${c.key}: secret rejected: ${matcher.error}`);
  for (const list of [c.controlsPositive, c.controlsNegative]) {
    if (list.length < 2 || list.length > 6) {
      fail(`challenge ${c.key}: control list of length ${list.length}`);
    }
  }
  for (const v of [c.examplePositive, ...c.controlsPositive]) {
    if (!matcher.test(v)) fail(`challenge ${c.key}: secret does not match positive "${v}"`);
  }
  for (const v of [c.exampleNegative, ...c.controlsNegative]) {
    if (matcher.test(v)) fail(`challenge ${c.key}: secret matches negative "${v}"`);
  }
  const values = [...c.controlsPositive, ...c.controlsNegative];
  if (new Set(values).size !== values.length) {
    fail(`challenge ${c.key}: duplicate control value`);
  }
}

/**
 * Replaces database contents with demo users, challenges and attempts.
 * Parameters: none.
 * @returns A promise that resolves after the seed is written and its totals are logged.
 */
async function main(): Promise<void> {
  await truncateAll(prisma);

  const userIds = new Map<string, number>();
  for (const u of users) {
    const passwordHash = await argon2.hash(PASSWORD);
    const created = await prisma.user.create({
      data: { username: u.username, passwordHash, createdAt: u.createdAt },
      select: { id: true },
    });
    userIds.set(u.username, created.id);
  }

  const byKey = new Map<string, { id: number; spec: ChallengeSpec }>();
  for (const c of challenges) {
    validateChallenge(c);
    const authorId = userIds.get(c.author);
    if (authorId === undefined) fail(`challenge ${c.key}: unknown author ${c.author}`);
    const created = await prisma.challenge.create({
      data: {
        authorId,
        title: c.title,
        secretRegex: c.secretRegex,
        examplePositive: c.examplePositive,
        exampleNegative: c.exampleNegative,
        createdAt: c.createdAt,
        controlStrings: {
          create: [
            ...c.controlsPositive.map(
              /**
               * Builds a positive control row for the demo challenge.
               * @param value - String the secret pattern must match.
               * @returns The control value and its positive kind.
               */
              (value) => ({ value, kind: "POSITIVE" as const })
            ),
            ...c.controlsNegative.map(
              /**
               * Builds a negative control row for the demo challenge.
               * @param value - String the secret pattern must reject.
               * @returns The control value and its negative kind.
               */
              (value) => ({ value, kind: "NEGATIVE" as const })
            ),
          ],
        },
      },
      select: { id: true },
    });
    byKey.set(c.key, { id: created.id, spec: c });
  }

  let attemptCount = 0;
  for (const h of histories) {
    const userId = userIds.get(h.user);
    if (userId === undefined) fail(`history: unknown user ${h.user}`);
    const target = byKey.get(h.challenge);
    if (target === undefined) fail(`history: unknown challenge ${h.challenge}`);
    if (target.spec.author === h.user) {
      fail(`history: ${h.user} attempts own challenge ${h.challenge}`);
    }
    if (h.firstAt.getTime() <= target.spec.createdAt.getTime()) {
      fail(`history: ${h.user} attempts ${h.challenge} before it exists`);
    }
    for (const [i, regex] of h.regexes.entries()) {
      const isLast = i === h.regexes.length - 1;
      const scored = score(regex, target.spec.controlsPositive, target.spec.controlsNegative);
      const expected = isLast && h.solves;
      if (scored.solved !== expected) {
        fail(
          `history: ${h.user} on ${h.challenge}, attempt ${i + 1} "${regex}" ` +
            `scores solved=${scored.solved}, planned ${expected}`,
        );
      }
      await prisma.attempt.create({
        data: {
          challengeId: target.id,
          userId,
          proposedRegex: regex,
          positivesMatched: scored.positivesMatched,
          negativesMatched: scored.negativesMatched,
          solved: scored.solved,
          createdAt: new Date(h.firstAt.getTime() + i * h.minutesBetween * 60 * 1000),
        },
        select: { id: true },
      });
      attemptCount += 1;
    }
  }

  console.log(
    `seeded ${users.length} users (password: ${PASSWORD}), ` +
      `${challenges.length} challenges, ${attemptCount} attempts`,
  );
}

main()
  .catch(
    /**
     * Reports a seed failure and marks the process unsuccessful.
     * @param e - Error raised while seeding.
     * @returns Nothing; logs the error and sets the exit code.
     */
    (e) => {
      console.error(e);
      process.exitCode = 1;
    }
  )
  .finally(
    /**
     * Closes the seed database connection after completion or failure.
     * Parameters: none.
     * @returns A promise that resolves when Prisma disconnects.
     */
    () => prisma.$disconnect()
  );
