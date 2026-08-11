import { Router } from "express";
import * as leaderboardController from "../controllers/leaderboardController.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const leaderboardRouter = Router();

leaderboardRouter.get("/", requireAuth, leaderboardController.get);
