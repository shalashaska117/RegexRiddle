import type { NextFunction, Request, Response } from "express";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  // one counter per distinct return value; the default is ip plus exact
  // route path, so a parameterized route counts each parameter value apart
  key?: (req: Request) => string;
}

// Fixed-window in-memory limiter, one counter per ip and route. Counters
// reset on restart, which is fine for a single-process demo.
export function rateLimit({ windowMs, max, key }: RateLimitOptions) {
  const windows = new Map<string, { start: number; count: number }>();
  const keyOf = key ?? ((req: Request) => `${req.ip}:${req.baseUrl}${req.path}`);

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
