import { Router } from "express";
import { authRouter } from "./auth.js";
import { challengesRouter } from "./challenges.js";
import { usersRouter } from "./users.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/challenges", challengesRouter);
apiRouter.use("/users", usersRouter);
