import { Router } from "express";
import * as regexController from "../controllers/regexController.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { env } from "../config/env.js";

export const regexRouter = Router();

// Public on purpose: the tutorial teaches the engine to visitors who have no
// account yet. With no session to attach a budget to, the limiter is the only
// one, so it is keyed by ip alone.
const testLimiter = rateLimit({
  windowMs: env.regexTestRateLimitWindowMs,
  max: env.regexTestRateLimitMax,
});

regexRouter.post("/test", testLimiter, regexController.testPattern);
