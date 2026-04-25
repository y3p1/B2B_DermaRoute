"use client";
import React from "react";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { shouldBlockRender } = useRouteGuard();
  useInactivityTimeout();

  if (shouldBlockRender) {
    return null;
  }

  return <>{children}</>;
}
