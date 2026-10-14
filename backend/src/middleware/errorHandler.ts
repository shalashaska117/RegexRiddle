import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError, AuthenticationRequiredError, ValidationError } from "../errors.js";

/**
 * Sends a JSON response for an unknown route.
 * @param _req - Unused request supplied by Express.
 * @param res - Response used to send status 404 and its message.
 * @returns No value; sends the not-found response.
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}

/**
 * Reads a client-error status from an error object.
 * @param err - Error whose status or statusCode is checked.
 * @returns An integer status from 400 to 499, or null if none is present.
 */
function clientFaultStatus(err: unknown): number | null {
  if (typeof err !== "object" || err === null) {
    return null;
  }
  const { status, statusCode } = err as { status?: unknown; statusCode?: unknown };
  const candidate = typeof status === "number" ? status : statusCode;
  if (typeof candidate === "number" && Number.isInteger(candidate) && candidate >= 400 && candidate < 500) {
    return candidate;
  }
  return null;
}

/**
 * Converts errors into safe JSON responses.
 * @param err - Error to classify and report.
 * @param _req - Unused request supplied by Express.
 * @param res - Response used to send the status and error details.
 * @param _next - Unused callback required for Express error middleware.
 * @returns No value; sends the error response and logs unexpected failures.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    // one message per field; issues on the object itself (unknown keys) go
    // under "body"
    const errors: Record<string, string> = {};
    for (const issue of err.issues) {
      const field = issue.path.length > 0 ? issue.path.map(String).join(".") : "body";
      errors[field] ??= issue.message;
    }
    res.status(422).json({ error: "Validation failed", errors });
    return;
  }
  // before the AppError branch, since ValidationError extends it
  if (err instanceof ValidationError) {
    res.status(err.status).json({ error: err.message, errors: err.errors });
    return;
  }
  if (err instanceof AuthenticationRequiredError) {
    res.status(err.status).json({ error: err.message, code: "AUTHENTICATION_REQUIRED" });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const clientStatus = clientFaultStatus(err);
  if (clientStatus !== null) {
    // Client faults are not logged: a JSON parse error carries the raw
    // request body, which on the auth endpoints holds credentials. The
    // expose flag (set by http-errors) marks the message safe to return;
    // for parse errors it only ever quotes the sender's own bytes.
    const expose = (err as { expose?: unknown }).expose === true;
    const message = expose && err instanceof Error ? err.message : "Bad request";
    res.status(clientStatus).json({ error: message });
    return;
  }
  // Same reason before the fallthrough log: never write a raw request
  // body to the server log.
  if (typeof err === "object" && err !== null && "body" in err) {
    delete (err as { body?: unknown }).body;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
