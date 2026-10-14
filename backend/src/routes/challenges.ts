import { Router } from "express";
import * as challengeController from "../controllers/challengeController.js";
import * as attemptController from "../controllers/attemptController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { env } from "../config/env.js";

export const challengesRouter = Router();

// every challenge endpoint requires a session
challengesRouter.use(requireAuth);

// keyed by ip alone, one budget across all challenges: each submission runs
// a regex against every control string, so the counter must not split per id
const attemptLimiter = rateLimit({
  windowMs: env.attemptRateLimitWindowMs,
  max: env.attemptRateLimitMax,
  key:
    /**
     * Shares one attempt limit across all challenges for an IP address.
     * @param req - Request whose IP address identifies the counter.
     * @returns The counter key for this client's challenge attempts.
     */
    (req) => `${req.ip}:attempts`,
});

challengesRouter.post("/", challengeController.create);
challengesRouter.get("/", challengeController.list);
challengesRouter.get("/:id", challengeController.detail);
challengesRouter.post("/:id/attempts", attemptLimiter, attemptController.submit);
challengesRouter.get("/:id/attempts", attemptController.list);
