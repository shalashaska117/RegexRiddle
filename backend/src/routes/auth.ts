import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { env } from "../config/env.js";

export const authRouter = Router();

// one limiter instance, but keyed by ip and route, so register and login
// count separately
const authLimiter = rateLimit({
  windowMs: env.authRateLimitWindowMs,
  max: env.authRateLimitMax,
});

authRouter.post("/register", authLimiter, authController.register);
authRouter.post("/login", authLimiter, authController.login);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", requireAuth, authController.me);
