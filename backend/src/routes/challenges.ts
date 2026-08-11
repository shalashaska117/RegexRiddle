import { Router } from "express";
import * as challengeController from "../controllers/challengeController.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const challengesRouter = Router();

// every challenge endpoint requires a session
challengesRouter.use(requireAuth);

challengesRouter.post("/", challengeController.create);
challengesRouter.get("/", challengeController.list);
challengesRouter.get("/:id", challengeController.detail);
