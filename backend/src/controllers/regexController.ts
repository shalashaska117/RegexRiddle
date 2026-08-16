import type { Request, Response } from "express";
import { z } from "zod";
import { parseBody } from "../middleware/validate.js";
import { ValidationError } from "../errors.js";
import {
  createMatcher,
  MAX_INPUT_LENGTH,
  MAX_PATTERN_LENGTH,
} from "../services/regex/engine.js";

// Same caps as challenge creation and attempts, so the tutorial cannot try a
// pattern the game would refuse.
const testShape = {
  pattern: z
    .string()
    .min(1, `1 to ${MAX_PATTERN_LENGTH} characters`)
    .max(MAX_PATTERN_LENGTH, `1 to ${MAX_PATTERN_LENGTH} characters`),
  subject: z.string().max(MAX_INPUT_LENGTH, `at most ${MAX_INPUT_LENGTH} characters`),
};

// Runs one pattern against one string through the engine that scores
// attempts, so the tutorial can never teach behaviour the game contradicts.
// Nothing is stored and no session is involved.
export function testPattern(req: Request, res: Response): void {
  const { pattern, subject } = parseBody(req, testShape);
  const matcher = createMatcher(pattern);
  if (!matcher.ok) {
    // Quotes the pattern the caller just typed, and nothing else.
    throw new ValidationError({ pattern: matcher.error });
  }
  res.json({ matches: matcher.test(subject) });
}
