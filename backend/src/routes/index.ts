import { Router } from "express";
import { authRouter } from "./auth.js";
import { challengesRouter } from "./challenges.js";
import { usersRouter } from "./users.js";
import { leaderboardRouter } from "./leaderboard.js";
import { regexRouter } from "./regex.js";

export const apiRouter = Router();

apiRouter.get("/health",
  /**
   * Reports that the API is running.
   * @param _req - Unused request supplied by Express.
   * @param res - Response used to send the health status.
   * @returns No value; sends status ok as JSON.
   */
  (_req, res) => {
    res.json({ status: "ok" });
  });

apiRouter.use("/auth", authRouter);
apiRouter.use("/challenges", challengesRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/leaderboard", leaderboardRouter);
apiRouter.use("/regex", regexRouter);
