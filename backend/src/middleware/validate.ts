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

// Password policy, per docs/security.md. Shared by registration and the
// password change, so the two cannot drift.
export const PASSWORD_RULE =
  "8 to 128 characters, with a lowercase letter, an uppercase letter and a special character";

// Which required character classes the value is missing, named as the error
// message will list them. Special means anything that is not an ASCII letter
// or digit, so accented letters and spaces count. Scanned character by
// character rather than with a pattern: docs/security.md promises that no
// user input reaches JavaScript's native RegExp, and a password least of all.
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

function joinWithAnd(parts: string[]): string {
  if (parts.length < 2) {
    return parts.join("");
  }
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

// The message names only the classes actually missing, so a rejected
// password says what to add instead of restating the whole rule.
export const passwordSchema = z
  .string()
  .min(8, PASSWORD_RULE)
  .max(128, PASSWORD_RULE)
  .superRefine((value, ctx) => {
    const missing = missingPasswordClasses(value);
    if (missing.length > 0) {
      ctx.addIssue({ code: "custom", message: `add ${joinWithAnd(missing)}` });
    }
  });
