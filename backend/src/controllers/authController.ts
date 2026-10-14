import type { Request, Response } from "express";
import { z } from "zod";
import { parseBody, passwordSchema } from "../middleware/validate.js";
import { sessionUserId } from "../middleware/requireAuth.js";
import * as authService from "../services/authService.js";
import * as userService from "../services/userService.js";

/**
 * Checks the allowed username characters without a regex.
 * @param value - Username to check.
 * @returns True if every character is a lowercase ASCII letter, digit or underscore.
 */
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

/**
 * Creates an account from the submitted credentials.
 * @param req - Request with the username and password.
 * @param res - Response used to send the new user ID and username.
 * @returns A promise that resolves with no value after sending the new account.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { username, password } = parseBody(req, registerShape);
  const user = await authService.register(username, password);
  res.status(201).json(user);
}

/**
 * Checks credentials and starts a new session.
 * @param req - Request with credentials and the session to replace.
 * @param res - Response used to send the user ID and username.
 * @returns A promise that resolves with no value after starting the session.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = parseBody(req, loginShape);
  const user = await authService.verifyCredentials(username, password);
  await new Promise<void>(
    /**
     * Starts session regeneration to prevent session fixation.
     * @param resolve - Completes the promise when regeneration succeeds.
     * @param reject - Fails the promise if regeneration fails.
     * @returns No value; starts the session operation.
     */
    (resolve, reject) => {
      req.session.regenerate(
        /**
         * Completes the session regeneration promise.
         * @param err - Regeneration error, or no error on success.
         * @returns No value; rejects on error or resolves on success.
         */
        (err) => (err ? reject(err) : resolve()));
    });
  req.session.userId = user.id;
  res.json(user);
}

/**
 * Ends the session and clears its cookie.
 * @param req - Request with the session to destroy.
 * @param res - Response used to clear the cookie and send status 204.
 * @returns A promise that resolves with no value after logout.
 */
export async function logout(req: Request, res: Response): Promise<void> {
  await new Promise<void>(
    /**
     * Starts deletion of the current session.
     * @param resolve - Completes the promise when deletion succeeds.
     * @param reject - Fails the promise if deletion fails.
     * @returns No value; starts the session operation.
     */
    (resolve, reject) => {
      req.session.destroy(
        /**
         * Completes the session deletion promise.
         * @param err - Deletion error, or no error on success.
         * @returns No value; rejects on error or resolves on success.
         */
        (err) => (err ? reject(err) : resolve()));
    });
  res.clearCookie("rr.sid");
  res.status(204).end();
}

/**
 * Sends the current user's profile.
 * @param req - Request with the current session.
 * @param res - Response used to send the public profile.
 * @returns A promise that resolves with no value after sending the profile.
 */
export async function me(req: Request, res: Response): Promise<void> {
  // same source and shape as GET /api/users/me, so the two cannot drift
  res.json(await userService.getProfile(sessionUserId(req)));
}
