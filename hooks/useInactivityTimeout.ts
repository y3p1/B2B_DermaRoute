"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { isPublicPath } from "@/lib/routeGuard";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const THROTTLE_MS = 60 * 1000; // 1 minute

export function useInactivityTimeout() {
  const status = useAuthStore((s) => s.status);
  const accountType = useAuthStore((s) => s.accountType);
  const logout = useAuthStore((s) => s.logout);
  const pathname = usePathname();
  const router = useRouter();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(0);

  const handleTimeout = useCallback(async () => {
    await logout();
    const redirect =
      accountType === "admin"
        ? "/admin/signin?reason=timeout"
        : "/auth?reason=timeout";
    router.replace(redirect);
  }, [accountType, logout, router]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleTimeout, TIMEOUT_MS);
  }, [handleTimeout]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current < THROTTLE_MS) return;
    lastActivityRef.current = now;
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (status !== "authenticated" || isPublicPath(pathname)) return;

    const events = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ] as const;

    // Start the timer
    resetTimer();

    for (const event of events) {
      window.addEventListener(event, handleActivity);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of events) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [status, pathname, resetTimer, handleActivity]);
}
