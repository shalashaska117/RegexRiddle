import { apiGet } from "./client";

export interface LeaderboardUser {
  id: number;
  username: string;
  avatarUrl: string | null;
}

export interface LeaderboardRow {
  rank: number;
  user: LeaderboardUser;
  solvedCount: number;
  avgAttempts: number;
}

/**
 * Load players in leaderboard order.
 * Parameters: none.
 * @returns Promise of ranks, player profiles, solved counts and average attempts.
 */
export function getLeaderboard(): Promise<LeaderboardRow[]> {
  return apiGet<LeaderboardRow[]>("/api/leaderboard");
}
