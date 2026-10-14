import type { Request, Response } from "express";
import * as leaderboardService from "../services/leaderboardService.js";

/**
 * Sends the leaderboard.
 * @param _req - Unused request supplied by Express.
 * @param res - Response used to send the ranked users.
 * @returns A promise that resolves with no value after sending the rankings.
 */
export async function get(_req: Request, res: Response): Promise<void> {
  res.json(await leaderboardService.getLeaderboard());
}
