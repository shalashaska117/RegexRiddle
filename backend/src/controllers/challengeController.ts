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

export async function create(req: Request, res: Response): Promise<void> {
  const input = parseBody(req, createShape);
  const created = await challengeService.createChallenge(sessionUserId(req), input);
  res.status(201).json(created);
}

export async function list(req: Request, res: Response): Promise<void> {
  res.json(await challengeService.listChallenges(sessionUserId(req)));
}

export async function detail(req: Request, res: Response): Promise<void> {
  const { id } = parseParams(req, idParamShape);
  res.json(await challengeService.getChallenge(sessionUserId(req), id));
}
