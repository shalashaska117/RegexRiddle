/**
 * Reads a required environment variable.
 * @param name - Environment variable to read.
 * @returns Its nonempty value; throws if it is missing.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required("DATABASE_URL"),
  sessionSecret: required("SESSION_SECRET"),
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10),
  attemptRateLimitWindowMs: Number(process.env.ATTEMPT_RATE_LIMIT_WINDOW_MS ?? 60_000),
  attemptRateLimitMax: Number(process.env.ATTEMPT_RATE_LIMIT_MAX ?? 60),
  regexTestRateLimitWindowMs: Number(process.env.REGEX_TEST_RATE_LIMIT_WINDOW_MS ?? 60_000),
  regexTestRateLimitMax: Number(process.env.REGEX_TEST_RATE_LIMIT_MAX ?? 120),
};
