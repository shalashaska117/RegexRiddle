import type { Request, Response } from "express";
import * as leaderboardService from "../services/leaderboardService.js";

export async function get(_req: Request, res: Response): Promise<void> {
  res.json(await leaderboardService.getLeaderboard());
}
