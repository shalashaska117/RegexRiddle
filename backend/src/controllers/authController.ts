import type { Request, Response } from "express";
import { z } from "zod";
import { parseBody, passwordSchema } from "../middleware/validate.js";
import { sessionUserId } from "../middleware/requireAuth.js";
import * as authService from "../services/authService.js";
import * as userService from "../services/userService.js";

// Character allowlist checked without a regex: docs/security.md promises
// that no user input ever reaches JavaScript's native RegExp, and that
// includes fixed patterns like /^[a-z0-9_]+$/ run over the username.
function isValidUsername(value: string): boolean {
  for (const ch of value) {
    const ok = (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9") || ch === "_";
    if (!ok) {
      return false;
    }
  }
  return true;
}

const registerShape = {
  username: z
    .string()
    .min(3, "3 to 32 characters")
    .max(32, "3 to 32 characters")
    .refine(isValidUsername, "lowercase letters, digits and underscore only"),
  password: passwordSchema,
};

// login only checks shape, not the register rules: a malformed username is
// just a failed login, and both cases answer 401 from the service
const loginShape = {
  username: z.string().min(1).max(32),
  password: z.string().min(1).max(128),
};

export async function register(req: Request, res: Response): Promise<void> {
  const { username, password } = parseBody(req, registerShape);
  const user = await authService.register(username, password);
  res.status(201).json(user);
}

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = parseBody(req, loginShape);
  const user = await authService.verifyCredentials(username, password);
  // fresh session id on login, against session fixation
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
  req.session.userId = user.id;
  res.json(user);
}

export async function logout(req: Request, res: Response): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
  res.clearCookie("rr.sid");
  res.status(204).end();
}

export async function me(req: Request, res: Response): Promise<void> {
  // same source and shape as GET /api/users/me, so the two cannot drift
  res.json(await userService.getProfile(sessionUserId(req)));
}
