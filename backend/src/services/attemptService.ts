import { prisma } from "../db.js";
import { AppError, ValidationError } from "../errors.js";
import { createMatcher } from "./regex/engine.js";
import type { AttemptSummary } from "./challengeService.js";

// Control string values pass through this module for scoring only; they
// never reach a return value, an error message or a log (docs/security.md).
// The one value an error may quote is the solver's own pattern.

export interface AttemptScore {
  positivesMatched: number;
  totalPositives: number;
  negativesMatched: number;
  totalNegatives: number;
  solved: boolean;
  attemptNumber: number;
}

export async function submitAttempt(
  userId: number,
  challengeId: number,
  proposedRegex: string,
): Promise<AttemptScore> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { authorId: true },
  });
  if (challenge === null) {
    throw new AppError(404, "Challenge not found");
  }
  if (challenge.authorId === userId) {
    throw new AppError(403, "Authors cannot attempt their own challenge");
  }
  const solvedBefore = await prisma.attempt.findFirst({
    where: { challengeId, userId, solved: true },
    select: { id: true },
  });
  if (solvedBefore !== null) {
    throw new AppError(409, "Challenge already solved, no further attempts accepted");
  }

  const matcher = createMatcher(proposedRegex);
  if (!matcher.ok) {
    throw new ValidationError({ regex: matcher.error });
  }

  const controls = await prisma.controlString.findMany({
    where: { challengeId },
    select: { value: true, kind: true },
  });

  let positivesMatched = 0;
  let totalPositives = 0;
  let negativesMatched = 0;
  let totalNegatives = 0;
  for (const control of controls) {
    if (control.kind === "POSITIVE") {
      totalPositives += 1;
      if (matcher.test(control.value)) {
        positivesMatched += 1;
      }
    } else {
      totalNegatives += 1;
      // a negative control counts when the regex does NOT match it
      if (!matcher.test(control.value)) {
        negativesMatched += 1;
      }
    }
  }
  const solved = positivesMatched === totalPositives && negativesMatched === totalNegatives;

  // create and count in one transaction, so attemptNumber is the caller's
  // attempt count on this challenge including the row just written
  const [, attemptNumber] = await prisma.$transaction([
    prisma.attempt.create({
      data: { challengeId, userId, proposedRegex, positivesMatched, negativesMatched, solved },
      select: { id: true },
    }),
    prisma.attempt.count({ where: { challengeId, userId } }),
  ]);

  return { positivesMatched, totalPositives, negativesMatched, totalNegatives, solved, attemptNumber };
}

export async function listAttempts(
  userId: number,
  challengeId: number,
): Promise<AttemptSummary[]> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true },
  });
  if (challenge === null) {
    throw new AppError(404, "Challenge not found");
  }
  return prisma.attempt.findMany({
    where: { challengeId, userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      proposedRegex: true,
      positivesMatched: true,
      negativesMatched: true,
      solved: true,
      createdAt: true,
    },
  });
}
