import { apiPost } from "./client";

// Runs one pattern against one string on the server, through the engine that
// scores attempts. A pattern the engine refuses answers 422 with the reason
// under the "pattern" field error.
export function testPattern(
  pattern: string,
  subject: string,
): Promise<{ matches: boolean }> {
  return apiPost<{ matches: boolean }>("/api/regex/test", { pattern, subject });
}
