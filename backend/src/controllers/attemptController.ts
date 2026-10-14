import type { Request, Response } from "express";
import { z } from "zod";
import { idParamShape, parseBody, parseParams } from "../middleware/validate.js";
import { sessionUserId } from "../middleware/requireAuth.js";
import * as attemptService from "../services/attemptService.js";

// same cap as the regex engine: patterns up to 500 characters
const submitShape = {
  regex: z.string().min(1, "1 to 500 characters").max(500, "1 to 500 characters"),
};

/**
 * Validates and scores a submitted regex.
 * @param req - Request with the session, challenge ID and regex.
 * @param res - Response used to send the score.
 * @returns A promise that resolves with no value after sending the score.
 */
export async function submit(req: Request, res: Response): Promise<void> {
  const { id } = parseParams(req, idParamShape);
  const { regex } = parseBody(req, submitShape);
  const score = await attemptService.submitAttempt(sessionUserId(req), id, regex);
  res.status(201).json(score);
}

/**
 * Lists the current user's attempts on a challenge.
 * @param req - Request with the session and challenge ID.
 * @param res - Response used to send the attempt history.
 * @returns A promise that resolves with no value after sending the history.
 */
export async function list(req: Request, res: Response): Promise<void> {
  const { id } = parseParams(req, idParamShape);
  res.json(await attemptService.listAttempts(sessionUserId(req), id));
}
