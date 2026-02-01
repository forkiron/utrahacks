import type { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const store = new Map<string, RateLimitEntry>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const entry = store.get(ip);
    if (!entry || now >= entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + options.windowMs });
      return next();
    }
    if (entry.count >= options.max) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }
    entry.count += 1;
    store.set(ip, entry);
    next();
  };
}
