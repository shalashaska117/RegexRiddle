import type { NextFunction, Request, Response } from "express";
import { AuthenticationRequiredError } from "../errors.js";

/**
 * Rejects requests without a user session.
 * @param req - Request whose session is checked.
 * @param _res - Unused response supplied by Express.
 * @param next - Continues the request or forwards an authentication error.
 * @returns No value; calls next with an error when no user is signed in.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (req.session.userId === undefined) {
    next(new AuthenticationRequiredError());
    return;
  }
  next();
}

/**
 * Reads the user ID from the current session.
 * @param req - Request containing the session.
 * @returns The signed-in user ID; throws if the session has none.
 */
export function sessionUserId(req: Request): number {
  const id = req.session.userId;
  if (id === undefined) {
    throw new AuthenticationRequiredError();
  }
  return id;
}
