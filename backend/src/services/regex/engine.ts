// Safe regex engine wrapper. Every user-supplied pattern in the app runs
// through here and nowhere else; RE2 matches in linear time, so crafted
// patterns cannot pin the CPU (see docs/security.md). This module must not
// touch JavaScript's native RegExp.
import RE2 from "re2";

export const MAX_PATTERN_LENGTH = 500;
export const MAX_INPUT_LENGTH = 1000;

export type Matcher =
  | { ok: true; test: (input: string) => boolean }
  | { ok: false; error: string };

// Compiles a pattern once, anchored as ^(?:pattern)$ so test() reports
// whether the WHOLE string matches, never a substring. On invalid or
// unsupported syntax (RE2 has no backreferences or lookaround) returns
// ok false with a message safe to show to the pattern's author. The
// message may quote the pattern itself and nothing else.
export function createMatcher(pattern: string): Matcher {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return {
      ok: false,
      error: `pattern is longer than ${MAX_PATTERN_LENGTH} characters`,
    };
  }

  let compiled: RE2;
  try {
    // The pattern must compile on its own before it is wrapped. A pattern
    // that only compiles inside ^(?:...)$ has an unmatched ")" that closes
    // the wrapper group early (e.g. "a)|(b" would become "^(?:a)|(b)$",
    // which matches substrings). RE2 rejects unmatched parens, so a
    // pattern that passes this compile cannot escape the group below.
    new RE2(pattern);
    compiled = new RE2(`^(?:${pattern})$`);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `invalid or unsupported pattern: ${detail}` };
  }

  return {
    ok: true,
    test(input: string): boolean {
      // Oversized input is a caller bug, not a mismatch, so throw instead
      // of returning false. Controllers enforce the cap before calling.
      if (input.length > MAX_INPUT_LENGTH) {
        throw new RangeError(
          `input is longer than ${MAX_INPUT_LENGTH} characters`,
        );
      }
      return compiled.test(input);
    },
  };
}
