import type { Request } from "express";
import { z } from "zod";

// Strict objects reject unknown keys, per docs/security.md. A failed parse
// throws a ZodError that the error handler turns into a 422.

/**
 * Validates a request body and rejects unknown fields.
 * @param req - Request whose body is checked.
 * @param shape - Field schemas for the allowed body.
 * @returns The parsed body with the fields and types defined by shape.
 */
export function parseBody<S extends z.ZodRawShape>(req: Request, shape: S) {
  return z.strictObject(shape).parse(req.body);
}

/**
 * Validates route parameters and rejects unknown fields.
 * @param req - Request whose route parameters are checked.
 * @param shape - Field schemas for the allowed parameters.
 * @returns The parsed parameters with the fields and types defined by shape.
 */
export function parseParams<S extends z.ZodRawShape>(req: Request, shape: S) {
  return z.strictObject(shape).parse(req.params);
}

/**
 * Validates query parameters and rejects unknown fields.
 * @param req - Request whose query parameters are checked.
 * @param shape - Field schemas for the allowed query.
 * @returns The parsed query with the fields and types defined by shape.
 */
export function parseQuery<S extends z.ZodRawShape>(req: Request, shape: S) {
  return z.strictObject(shape).parse(req.query);
}

// Numeric route id, capped at the Postgres Int maximum so oversized ids
// fail validation instead of erroring inside Prisma.
export const idParamShape = {
  id: z.coerce.number().int().positive().max(2_147_483_647),
};

// Password policy, per docs/security.md. Shared by registration and the
// password change, so the two cannot drift.
export const PASSWORD_RULE =
  "8 to 128 characters, with a lowercase letter, an uppercase letter and a special character";

/**
 * Finds the required character groups missing from a password.
 * @param value - Password to scan without a regex; spaces and non-ASCII letters count as special.
 * @returns Names of missing lowercase, uppercase or special-character groups.
 */
function missingPasswordClasses(value: string): string[] {
  let hasLower = false;
  let hasUpper = false;
  let hasSpecial = false;
  for (const ch of value) {
    if (ch >= "a" && ch <= "z") {
      hasLower = true;
    } else if (ch >= "A" && ch <= "Z") {
      hasUpper = true;
    } else if (ch < "0" || ch > "9") {
      hasSpecial = true;
    }
  }
  const missing: string[] = [];
  if (!hasLower) missing.push("a lowercase letter");
  if (!hasUpper) missing.push("an uppercase letter");
  if (!hasSpecial) missing.push("a special character");
  return missing;
}

/**
 * Joins labels with commas and a final and.
 * @param parts - Labels to join in their current order.
 * @returns The joined labels, or an empty string for no labels.
 */
function joinWithAnd(parts: string[]): string {
  if (parts.length < 2) {
    return parts.join("");
  }
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export const passwordSchema = z
  .string()
  .min(8, PASSWORD_RULE)
  .max(128, PASSWORD_RULE)
  .superRefine(
    /**
     * Adds a validation message for missing password character groups.
     * @param value - Password being validated.
     * @param ctx - Zod context used to record a validation issue.
     * @returns No value; adds an issue only when required groups are missing.
     */
    (value, ctx) => {
      const missing = missingPasswordClasses(value);
      if (missing.length > 0) {
        ctx.addIssue({ code: "custom", message: `add ${joinWithAnd(missing)}` });
      }
    });
