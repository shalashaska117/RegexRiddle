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

export function getLeaderboard(): Promise<LeaderboardRow[]> {
  return apiGet<LeaderboardRow[]>("/api/leaderboard");
}
