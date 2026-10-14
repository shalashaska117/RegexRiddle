import type { NextFunction, Request, Response } from "express";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  // one counter per distinct return value; the default is ip plus exact
  // route path, so a parameterized route counts each parameter value apart
  key?: (req: Request) => string;
}

/**
 * Creates a request limiter with counters kept in memory.
 * @param options - Request limit settings.
 * @param options.windowMs - Duration of each counting window in milliseconds.
 * @param options.max - Maximum requests allowed in one window.
 * @param options.key - Optional function that assigns requests to counters.
 * @returns Middleware that allows requests or sends status 429 when over the limit.
 */
export function rateLimit({ windowMs, max, key }: RateLimitOptions) {
  const windows = new Map<string, { start: number; count: number }>();
  const keyOf = key ?? (
    /**
     * Groups requests by IP address and full route path.
     * @param req - Request whose address and route form the counter key.
     * @returns The key for this IP address and route.
     */
    (req: Request) => `${req.ip}:${req.baseUrl}${req.path}`);

  /**
   * Counts the request and enforces its window limit.
   * @param req - Request to assign to a counter.
   * @param res - Response used to send status 429 when over the limit.
   * @param next - Continues requests within the limit.
   * @returns No value; calls next or sends a rate-limit response.
   */
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (windows.size > 10_000) {
      for (const [key, win] of windows) {
        if (now - win.start >= windowMs) {
          windows.delete(key);
        }
      }
    }
    const key = keyOf(req);
    const win = windows.get(key);
    if (!win || now - win.start >= windowMs) {
      windows.set(key, { start: now, count: 1 });
      next();
      return;
    }
    win.count += 1;
    if (win.count > max) {
      res.status(429).json({ error: "Too many requests, retry later" });
      return;
    }
    next();
  };
}
