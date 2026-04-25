import type { NextFunction, Request, Response } from "../http/types";

type VerifyEntry = {
  failures: number;
  lockUntil: number; // epoch ms
};

type SendEntry = {
  count: number;
  resetAt: number; // epoch ms
  lastSentAt: number; // epoch ms
};

function normalizePhoneE164(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}

function getClientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

const verifyStore = new Map<string, VerifyEntry>();
const sendStore = new Map<string, SendEntry>();

export function __resetOtpAbuseGuardsForTests() {
  verifyStore.clear();
  sendStore.clear();
}

function cleanupVerifyStore(now: number) {
  // Opportunistic cleanup of stale locks; keep it cheap.
  for (const [key, entry] of verifyStore) {
    if (entry.failures === 0 && entry.lockUntil <= now) {
      verifyStore.delete(key);
    }
  }
}

function cleanupSendStore(now: number) {
  for (const [key, entry] of sendStore) {
    if (entry.resetAt <= now && now - entry.lastSentAt > 60 * 60 * 1000) {
      sendStore.delete(key);
    }
  }
}

export function otpVerifyAbuseGuard(options?: {
  maxFailures?: number;
  lockMs?: number;
}) {
  const maxFailures = options?.maxFailures ?? 3;
  const lockMs = options?.lockMs ?? 10 * 60 * 1000;

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    cleanupVerifyStore(now);

    const phone = normalizePhoneE164((req.body as { phone?: unknown })?.phone);
    const clientKey = getClientKey(req);

    // Prefer phone-based limiting; fallback to IP only if phone missing.
    const key = phone ? `phone:${phone}` : `ip:${clientKey}`;

    const entry = verifyStore.get(key) ?? { failures: 0, lockUntil: 0 };
    if (entry.lockUntil > now) {
      const retryAfterSeconds = Math.ceil((entry.lockUntil - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        error:
          "Too many failed verification attempts. Try again after 10 minutes.",
        retryAfterSeconds,
        retryAt: entry.lockUntil,
      });
    }

    // Track outcome after controller responds.
    res.on("finish", () => {
      const status = res.statusCode;
      if (status >= 200 && status < 400) {
        // Success: clear failures
        verifyStore.delete(key);
        return;
      }

      // Count client errors (wrong code, unauthorized, etc) but ignore 429s.
      if (status >= 400 && status < 500 && status !== 429) {
        const current = verifyStore.get(key) ?? { failures: 0, lockUntil: 0 };
        current.failures += 1;
        if (current.failures >= maxFailures) {
          current.lockUntil = Date.now() + lockMs;
        }
        verifyStore.set(key, current);
      }
    });

    next();
  };
}

export function otpSendAbuseGuard(options?: {
  windowMs?: number;
  maxSends?: number;
  minIntervalMs?: number;
}) {
  const windowMs = options?.windowMs ?? 10 * 60 * 1000;
  const maxSends = options?.maxSends ?? 6;
  const minIntervalMs = options?.minIntervalMs ?? 20 * 1000;

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    cleanupSendStore(now);

    const phone = normalizePhoneE164((req.body as { phone?: unknown })?.phone);
    const clientKey = getClientKey(req);

    // Prefer phone-based limiting; fallback to IP only if phone missing.
    const key = phone ? `phone:${phone}` : `ip:${clientKey}`;

    const entry = sendStore.get(key);
    if (!entry || entry.resetAt <= now) {
      sendStore.set(key, {
        count: 1,
        resetAt: now + windowMs,
        lastSentAt: now,
      });
      return next();
    }

    if (now - entry.lastSentAt < minIntervalMs) {
      const retryAfterSeconds = Math.ceil(
        (minIntervalMs - (now - entry.lastSentAt)) / 1000,
      );
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        error: "Please wait before requesting another code.",
        retryAfterSeconds,
        retryAt: now + retryAfterSeconds * 1000,
      });
    }

    entry.count += 1;
    entry.lastSentAt = now;
    sendStore.set(key, entry);

    if (entry.count > maxSends) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        error: "Too many OTP requests. Try again after 10 minutes.",
        retryAfterSeconds,
        retryAt: entry.resetAt,
      });
    }

    next();
  };
}
