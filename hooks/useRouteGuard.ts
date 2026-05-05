"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/auth";
import { isClientDemoMode } from "@/lib/demoMode";
import {
  DEFAULT_AUTHENTICATED_REDIRECT,
  DEFAULT_UNAUTHENTICATED_REDIRECT,
  isLegacyAuthenticatedPath,
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

    if (isLegacyAuthenticatedPath(pathname)) {
      router.replace(DEFAULT_AUTHENTICATED_REDIRECT);
      return;
    }

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
      const accountType = useAuthStore.getState().accountType;
      if (accountType !== "admin") {
        router.replace("/");
        return;
      }
    }

    if (status === "authenticated" && publicPath) {
      router.replace(DEFAULT_AUTHENTICATED_REDIRECT);
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
