import { prisma } from "../db.js";
import { AppError, ValidationError } from "../errors.js";
import { createMatcher } from "./regex/engine.js";

// The secret regex and the control string values never leave this module
// except into the database; every query below selects explicit fields
// (docs/security.md). Creation-time validation messages are the one place
// allowed to quote them, since they go back to the author who typed them.

export interface CreateChallengeInput {
  title: string;
  regex: string;
  examplePositive: string;
  exampleNegative: string;
  controlsPositive: string[];
  controlsNegative: string[];
}

export interface PublicAuthor {
  id: number;
  username: string;
}

export interface ChallengeListEntry {
  id: number;
  title: string;
  author: PublicAuthor;
  createdAt: Date;
  solvedByMe: boolean;
  myAttempts: number;
  solvedCount: number;
}

export interface AttemptSummary {
  proposedRegex: string;
  positivesMatched: number;
  negativesMatched: number;
  solved: boolean;
  createdAt: Date;
}

export interface ChallengeDetail {
  id: number;
  title: string;
  author: PublicAuthor;
  createdAt: Date;
  examplePositive: string;
  exampleNegative: string;
  controlCounts: { positive: number; negative: number };
  solvedByMe: boolean;
  myAttempts: AttemptSummary[];
}

export async function createChallenge(
  authorId: number,
  input: CreateChallengeInput,
): Promise<{ id: number }> {
  // Nothing else can be checked without a compiled regex, so this failure
  // is reported alone.
  const matcher = createMatcher(input.regex);
  if (!matcher.ok) {
    throw new ValidationError({ regex: matcher.error });
  }

  const errors: Record<string, string> = {};

  // Control values must be distinct across both arrays combined, mirroring
  // the DB unique constraint on (challengeId, value). This check runs first
  // so a duplicate entry reports the duplication instead of a match failure.
  const firstUseOf = new Map<string, string>();
  const allControls = [
    ...input.controlsPositive.map((value, index) => ({ value, field: "controlsPositive", index })),
    ...input.controlsNegative.map((value, index) => ({ value, field: "controlsNegative", index })),
  ];
  for (const { value, field, index } of allControls) {
    const firstUse = firstUseOf.get(value);
    if (firstUse === undefined) {
      firstUseOf.set(value, `${field}[${index}]`);
    } else {
      errors[`${field}.${index}`] = `duplicate control value "${value}", already used at ${firstUse}`;
    }
  }

  if (!matcher.test(input.examplePositive)) {
    errors["examplePositive"] = `must match the regex, but "${input.examplePositive}" does not`;
  }
  if (matcher.test(input.exampleNegative)) {
    errors["exampleNegative"] = `must not match the regex, but "${input.exampleNegative}" does`;
  }
  input.controlsPositive.forEach((value, index) => {
    if (!matcher.test(value)) {
      errors[`controlsPositive.${index}`] ??=
        `positive control at index ${index} ("${value}") must match the regex, but does not`;
    }
  });
  input.controlsNegative.forEach((value, index) => {
    if (matcher.test(value)) {
      errors[`controlsNegative.${index}`] ??=
        `negative control at index ${index} ("${value}") must not match the regex, but does`;
    }
  });

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  // A nested create is a single transaction: the challenge and all its
  // control strings are written together or not at all.
  return prisma.challenge.create({
    data: {
      authorId,
      title: input.title,
      secretRegex: input.regex,
      examplePositive: input.examplePositive,
      exampleNegative: input.exampleNegative,
      controlStrings: {
        create: [
          ...input.controlsPositive.map((value) => ({ value, kind: "POSITIVE" as const })),
          ...input.controlsNegative.map((value) => ({ value, kind: "NEGATIVE" as const })),
        ],
      },
    },
    select: { id: true },
  });
}

export async function listChallenges(userId: number): Promise<ChallengeListEntry[]> {
  // Three queries however long the list gets: the challenges, the caller's
  // attempt counts, and every (challenge, user) pair with a solved attempt.
  // The pairs yield both solvedCount and solvedByMe.
  const [challenges, myAttemptCounts, solvedPairs] = await Promise.all([
    prisma.challenge.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        createdAt: true,
        author: { select: { id: true, username: true } },
      },
    }),
    prisma.attempt.groupBy({
      by: ["challengeId"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.attempt.groupBy({
      by: ["challengeId", "userId"],
      where: { solved: true },
    }),
  ]);

  const myCounts = new Map(myAttemptCounts.map((row) => [row.challengeId, row._count._all]));
  const solvedCounts = new Map<number, number>();
  const solvedByMe = new Set<number>();
  for (const pair of solvedPairs) {
    solvedCounts.set(pair.challengeId, (solvedCounts.get(pair.challengeId) ?? 0) + 1);
    if (pair.userId === userId) {
      solvedByMe.add(pair.challengeId);
    }
  }

  return challenges.map((challenge) => ({
    id: challenge.id,
    title: challenge.title,
    author: challenge.author,
    createdAt: challenge.createdAt,
    solvedByMe: solvedByMe.has(challenge.id),
    myAttempts: myCounts.get(challenge.id) ?? 0,
    solvedCount: solvedCounts.get(challenge.id) ?? 0,
  }));
}

export async function getChallenge(userId: number, challengeId: number): Promise<ChallengeDetail> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: {
      id: true,
      title: true,
      createdAt: true,
      examplePositive: true,
      exampleNegative: true,
      author: { select: { id: true, username: true } },
    },
  });
  if (challenge === null) {
    throw new AppError(404, "Challenge not found");
  }

  const [controlGroups, myAttempts] = await Promise.all([
    // counts per kind only; the values stay out of the response
    prisma.controlString.groupBy({
      by: ["kind"],
      where: { challengeId },
      _count: { _all: true },
    }),
    prisma.attempt.findMany({
      where: { challengeId, userId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        proposedRegex: true,
        positivesMatched: true,
        negativesMatched: true,
        solved: true,
        createdAt: true,
      },
    }),
  ]);

  const controlCounts = { positive: 0, negative: 0 };
  for (const group of controlGroups) {
    if (group.kind === "POSITIVE") {
      controlCounts.positive = group._count._all;
    } else {
      controlCounts.negative = group._count._all;
    }
  }

  return {
    id: challenge.id,
    title: challenge.title,
    author: challenge.author,
    createdAt: challenge.createdAt,
    examplePositive: challenge.examplePositive,
    exampleNegative: challenge.exampleNegative,
    controlCounts,
    solvedByMe: myAttempts.some((attempt) => attempt.solved),
    myAttempts,
  };
}
