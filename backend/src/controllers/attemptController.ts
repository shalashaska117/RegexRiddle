import type { Request, Response } from "express";
import { z } from "zod";
import { idParamShape, parseBody, parseParams } from "../middleware/validate.js";
import { sessionUserId } from "../middleware/requireAuth.js";
import * as attemptService from "../services/attemptService.js";

// same cap as the regex engine: patterns up to 500 characters
const submitShape = {
  regex: z.string().min(1, "1 to 500 characters").max(500, "1 to 500 characters"),
};

export async function submit(req: Request, res: Response): Promise<void> {
  const { id } = parseParams(req, idParamShape);
  const { regex } = parseBody(req, submitShape);
  const score = await attemptService.submitAttempt(sessionUserId(req), id, regex);
  res.status(201).json(score);
}

export async function list(req: Request, res: Response): Promise<void> {
  const { id } = parseParams(req, idParamShape);
  res.json(await attemptService.listAttempts(sessionUserId(req), id));
}
