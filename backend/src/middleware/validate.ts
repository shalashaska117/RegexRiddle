import type { Request } from "express";
import { z } from "zod";

// Strict objects reject unknown keys, per docs/security.md. A failed parse
// throws a ZodError that the error handler turns into a 422.

export function parseBody<S extends z.ZodRawShape>(req: Request, shape: S) {
  return z.strictObject(shape).parse(req.body);
}

export function parseParams<S extends z.ZodRawShape>(req: Request, shape: S) {
  return z.strictObject(shape).parse(req.params);
}

export function parseQuery<S extends z.ZodRawShape>(req: Request, shape: S) {
  return z.strictObject(shape).parse(req.query);
}

// Numeric route id, capped at the Postgres Int maximum so oversized ids
// fail validation instead of erroring inside Prisma.
export const idParamShape = {
  id: z.coerce.number().int().positive().max(2_147_483_647),
};
