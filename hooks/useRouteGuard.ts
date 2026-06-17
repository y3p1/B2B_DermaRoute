"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/auth";
import { isClientDemoMode } from "@/lib/demoMode";
import {
  DEFAULT_UNAUTHENTICATED_REDIRECT,
  getAuthenticatedRedirect,
  isOpenPath,
  isPublicPath,
} from "@/lib/routeGuard";

export function useRouteGuard() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const status = useAuthStore((s) => s.status);

  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    void hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    if (isClientDemoMode()) return;

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") return;
      void hydrate();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [hydrate]);

  React.useEffect(() => {
    if (isClientDemoMode()) return;

    const publicPath = isPublicPath(pathname);
    const openPath = isOpenPath(pathname);

    if (status === "unauthenticated" && !publicPath) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      if (pathname.startsWith("/admin")) {
        router.replace(`/admin/signin${next}`);
      } else {
        router.replace(`${DEFAULT_UNAUTHENTICATED_REDIRECT}${next}`);
      }
      return;
    }

    if (status === "authenticated" && pathname.startsWith("/admin")) {
      const { accountType } = useAuthStore.getState();
      if (accountType !== "admin") {
        router.replace("/");
        return;
      }
    }

    // Open paths (/ and /no-tracks) are accessible to authenticated users — no redirect.
    // Other public paths (like /auth, /signup) redirect authenticated users to their destination.
    if (status === "authenticated" && publicPath && !openPath) {
      const { enabledTracks, accountType, role } = useAuthStore.getState();
      router.replace(
        getAuthenticatedRedirect(enabledTracks, accountType ?? "", role ?? ""),
      );
    }
  }, [pathname, router, status]);

  const shouldBlockRender =
    !isClientDemoMode() &&
    !isPublicPath(pathname) &&
    (status === "idle" || status === "loading");

  return {
    status,
    pathname,
    shouldBlockRender,
    isPublicPath: isPublicPath(pathname),
  };
}
