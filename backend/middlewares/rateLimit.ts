import type { NextFunction, Request, Response } from "../http/types";
import { isDemoMode } from "../../lib/demoMode";

type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type Entry = { count: number; resetAt: number };

export function rateLimit(options: RateLimitOptions) {
  const store = new Map<string, Entry>();

  return (req: Request, res: Response, next: NextFunction) => {
    if (isDemoMode()) return next();

    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";

    const entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    entry.count += 1;
    store.set(key, entry);

    if (entry.count > options.max) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ error: "Too many requests" });
    }

    next();
  };
}
