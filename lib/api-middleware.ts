import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter (for demo only, use Redis or similar for production)
const rateLimitMap = new Map<string, { count: number; last: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per window

export function applyCorsHeaders(res: NextResponse, origin: string | string[]) {
  res.headers.set(
    "Access-Control-Allow-Origin",
    Array.isArray(origin) ? origin[0] : origin
  );
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.headers.set("Access-Control-Max-Age", "86400");
}

export function applyRateLimit(req: NextRequest): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (entry && now - entry.last < RATE_LIMIT_WINDOW) {
    if (entry.count >= RATE_LIMIT_MAX) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    entry.count++;
    entry.last = now;
    rateLimitMap.set(ip, entry);
  } else {
    rateLimitMap.set(ip, { count: 1, last: now });
  }
  return null;
}
