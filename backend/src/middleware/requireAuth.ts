import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors.js";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.userId === undefined) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

// For handlers mounted behind requireAuth. Throws instead of asserting, so a
// route wired without the guard by mistake still answers 401.
export function sessionUserId(req: Request): number {
  const id = req.session.userId;
  if (id === undefined) {
    throw new AppError(401, "Authentication required");
  }
  return id;
}
