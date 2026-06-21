import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthComponent from "@/components/auth/signin/AuthComponent";

const isDemoEnv =
  process.env.DEMO_MODE === "true" ||
  process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function AuthPage() {
  if (isDemoEnv) {
    redirect("/demo");
  }

  return (
    <Suspense fallback={<div />}>
      <AuthComponent />
    </Suspense>
  );
}
