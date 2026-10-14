import type { Request, Response } from "express";
import { z } from "zod";
import { idParamShape, parseBody, parseParams } from "../middleware/validate.js";
import { sessionUserId } from "../middleware/requireAuth.js";
import * as challengeService from "../services/challengeService.js";

// Shape limits match the regex engine caps: patterns up to 500 characters,
// inputs up to 1000, so the matcher never sees oversized input.
const controlArray = z
  .array(z.string().max(1000, "at most 1000 characters each"))
  .min(1, "1 to 10 control strings")
  .max(10, "1 to 10 control strings");

const createShape = {
  title: z
    .string()
    .trim()
    .min(1, "1 to 100 characters after trimming")
    .max(100, "1 to 100 characters after trimming"),
  regex: z.string().min(1, "1 to 500 characters").max(500, "1 to 500 characters"),
  examplePositive: z.string().max(1000, "at most 1000 characters"),
  exampleNegative: z.string().max(1000, "at most 1000 characters"),
  controlsPositive: controlArray,
  controlsNegative: controlArray,
};

/**
 * Validates and creates a challenge.
 * @param req - Request with the author session, title, regex, examples and controls.
 * @param res - Response used to send the new challenge ID.
 * @returns A promise that resolves with no value after sending the ID.
 */
export async function create(req: Request, res: Response): Promise<void> {
  const input = parseBody(req, createShape);
  const created = await challengeService.createChallenge(sessionUserId(req), input);
  res.status(201).json(created);
}

/**
 * Sends challenges with the current user's progress.
 * @param req - Request with the current session.
 * @param res - Response used to send the challenge list.
 * @returns A promise that resolves with no value after sending the list.
 */
export async function list(req: Request, res: Response): Promise<void> {
  res.json(await challengeService.listChallenges(sessionUserId(req)));
}

/**
 * Sends a challenge's public details and the current user's attempts.
 * @param req - Request with the session and challenge ID.
 * @param res - Response used to send the challenge details.
 * @returns A promise that resolves with no value after sending the details.
 */
export async function detail(req: Request, res: Response): Promise<void> {
  const { id } = parseParams(req, idParamShape);
  res.json(await challengeService.getChallenge(sessionUserId(req), id));
}
