import { prisma } from "../db.js";
import { avatarUrl } from "./userService.js";

export interface LeaderboardRow {
  rank: number;
  user: { id: number; username: string; avatarUrl: string | null };
  solvedCount: number;
  avgAttempts: number;
}

interface RawRow {
  id: number;
  username: string;
  avatarPath: string | null;
  solvedCount: number;
  avgAttempts: number;
}

// Raw SQL instead of prisma groupBy: "attempts up to and including the first
// solving one" needs a correlated subquery per (user, challenge) pair, which
// the prisma query API cannot express in one round trip. The first solving
// attempt is the solved row with the lowest id, since ids follow insertion
// order; counting rows with id at most that stays correct even if attempts
// after a solve existed. No user input reaches this query.
/**
 * Ranks the top 50 users by solved count and average attempts.
 * Parameters: none.
 * @returns A promise for ranked users with ID, username, avatar URL, solved count and average attempts.
 */
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const rows = await prisma.$queryRaw<RawRow[]>`
    WITH first_solved AS (
      SELECT "userId", "challengeId", MIN("id") AS "firstSolvedId"
      FROM "Attempt"
      WHERE "solved" = true
      GROUP BY "userId", "challengeId"
    )
    SELECT u."id",
           u."username",
           u."avatarPath",
           COUNT(*)::int AS "solvedCount",
           -- rounded in SQL, exactly (numeric, half up), so the ORDER BY
           -- below ties on the same two-decimal value the client sees;
           -- ordering on the raw average could contradict the documented
           -- username tiebreak when two averages differ only past the
           -- second decimal
           ROUND(AVG(sub."attemptsToSolve"), 2)::float8 AS "avgAttempts"
    FROM (
      SELECT fs."userId",
             (SELECT COUNT(*)
              FROM "Attempt" a
              WHERE a."userId" = fs."userId"
                AND a."challengeId" = fs."challengeId"
                AND a."id" <= fs."firstSolvedId") AS "attemptsToSolve"
      FROM first_solved fs
    ) sub
    JOIN "User" u ON u."id" = sub."userId"
    GROUP BY u."id", u."username", u."avatarPath"
    ORDER BY "solvedCount" DESC, "avgAttempts" ASC, u."username" ASC
    LIMIT 50
  `;

  return rows.map(
    /**
     * Builds a public leaderboard row with its rank.
     * @param row - Ranked database row with user data and solving statistics.
     * @param index - Zero-based position in the rankings.
     * @returns The one-based rank, public user details, solved count and average attempts.
     */
    (row, index) => ({
      rank: index + 1,
      user: {
        id: row.id,
        username: row.username,
        avatarUrl: avatarUrl(row.id, row.avatarPath),
      },
      solvedCount: row.solvedCount,
      avgAttempts: row.avgAttempts,
    }));
}
