// Mirrors the server policy in backend/src/middleware/validate.ts. The server
// stays the authority; checking here only spares the player a rejected round
// trip, and the rate-limit budget that comes with it.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export interface PasswordRule {
  id: string;
  label: string;
  met: (value: string) => boolean;
}

// Special means anything that is not an ASCII letter or digit, the same rule
// the server applies, so accented letters and spaces count.
function hasSpecial(value: string): boolean {
  for (const ch of value) {
    const letter = (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
    const digit = ch >= "0" && ch <= "9";
    if (!letter && !digit) return true;
  }
  return false;
}

function hasLowercase(value: string): boolean {
  for (const ch of value) {
    if (ch >= "a" && ch <= "z") return true;
  }
  return false;
}

function hasUppercase(value: string): boolean {
  for (const ch of value) {
    if (ch >= "A" && ch <= "Z") return true;
  }
  return false;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN} characters`,
    met: (value) => value.length >= PASSWORD_MIN,
  },
  { id: "lowercase", label: "A lowercase letter", met: hasLowercase },
  { id: "uppercase", label: "An uppercase letter", met: hasUppercase },
  { id: "special", label: "A special character", met: hasSpecial },
];

// The message to show under the field, or null when the value is acceptable.
export function passwordProblem(value: string): string | null {
  if (value.length > PASSWORD_MAX) {
    return `The password is longer than ${PASSWORD_MAX} characters.`;
  }
  if (PASSWORD_RULES.every((rule) => rule.met(value))) {
    return null;
  }
  return "The password does not meet every requirement listed below.";
}
