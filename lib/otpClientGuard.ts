type VerifyState = {
  failures: number;
  lockUntil: number; // epoch ms
};

type SendState = {
  windowCount: number;
  windowResetAt: number; // epoch ms
  lastSentAt: number; // epoch ms
};

const VERIFY_PREFIX = "otp:verify:";
const SEND_PREFIX = "otp:send:";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function now() {
  return Date.now();
}

export function getVerifyLock(phone: string, lockMs = 10 * 60 * 1000) {
  if (typeof window === "undefined") return { locked: false, retryAt: 0 };
  const key = `${VERIFY_PREFIX}${phone}`;
  const state = safeParse<VerifyState>(window.localStorage.getItem(key));
  const retryAt = state?.lockUntil ?? 0;
  const locked = retryAt > now();

  // If lock expired, clear it.
  if (!locked && state) {
    window.localStorage.removeItem(key);
  }

  return { locked, retryAt, lockMs };
}

export function recordVerifyFailure(
  phone: string,
  options?: { maxFailures?: number; lockMs?: number }
) {
  if (typeof window === "undefined") return;
  const maxFailures = options?.maxFailures ?? 3;
  const lockMs = options?.lockMs ?? 10 * 60 * 1000;

  const key = `${VERIFY_PREFIX}${phone}`;
  const current = safeParse<VerifyState>(window.localStorage.getItem(key)) ?? {
    failures: 0,
    lockUntil: 0,
  };

  const currentNow = now();
  if (current.lockUntil > currentNow) {
    return; // already locked
  }

  current.failures += 1;
  if (current.failures >= maxFailures) {
    current.lockUntil = currentNow + lockMs;
  }

  window.localStorage.setItem(key, JSON.stringify(current));
}

export function recordVerifySuccess(phone: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${VERIFY_PREFIX}${phone}`);
}

export function getSendStatus(
  phone: string,
  options?: { windowMs?: number; maxSends?: number; minIntervalMs?: number }
) {
  if (typeof window === "undefined") {
    return {
      allowed: true,
      retryAt: 0,
      reason: null as null | "window" | "interval",
    };
  }

  const windowMs = options?.windowMs ?? 10 * 60 * 1000;
  const maxSends = options?.maxSends ?? 6;
  const minIntervalMs = options?.minIntervalMs ?? 20 * 1000;

  const key = `${SEND_PREFIX}${phone}`;
  const currentNow = now();
  const state = safeParse<SendState>(window.localStorage.getItem(key));

  if (!state || state.windowResetAt <= currentNow) {
    return {
      allowed: true,
      retryAt: 0,
      reason: null as null | "window" | "interval",
    };
  }

  if (currentNow - state.lastSentAt < minIntervalMs) {
    return {
      allowed: false,
      retryAt: state.lastSentAt + minIntervalMs,
      reason: "interval" as const,
    };
  }

  if (state.windowCount >= maxSends) {
    return {
      allowed: false,
      retryAt: state.windowResetAt,
      reason: "window" as const,
    };
  }

  return {
    allowed: true,
    retryAt: 0,
    reason: null as null | "window" | "interval",
  };
}

export function recordSendAttempt(
  phone: string,
  options?: { windowMs?: number }
) {
  if (typeof window === "undefined") return;

  const windowMs = options?.windowMs ?? 10 * 60 * 1000;
  const key = `${SEND_PREFIX}${phone}`;
  const currentNow = now();
  const state = safeParse<SendState>(window.localStorage.getItem(key));

  if (!state || state.windowResetAt <= currentNow) {
    const next: SendState = {
      windowCount: 1,
      windowResetAt: currentNow + windowMs,
      lastSentAt: currentNow,
    };
    window.localStorage.setItem(key, JSON.stringify(next));
    return;
  }

  state.windowCount += 1;
  state.lastSentAt = currentNow;
  window.localStorage.setItem(key, JSON.stringify(state));
}

export function formatMsRemaining(retryAt: number) {
  const ms = Math.max(0, retryAt - now());
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}
