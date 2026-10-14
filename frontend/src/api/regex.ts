import { apiPost } from "./client";

// Runs one pattern against one string on the server, through the engine that
// scores attempts. A pattern the engine refuses answers 422 with the reason
// under the "pattern" field error.
/**
 * Check a pattern against one string with the server's regex engine.
 * @param pattern - Regular expression to compile and test.
 * @param subject - String the pattern must match in full.
 * @returns Promise of an object whose matches flag is true for a full-string match.
 */
export function testPattern(
  pattern: string,
  subject: string,
): Promise<{ matches: boolean }> {
  return apiPost<{ matches: boolean }>("/api/regex/test", { pattern, subject });
}
