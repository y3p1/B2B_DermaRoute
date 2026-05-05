import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthComponent from "@/components/auth/signin/AuthComponent";

export default function AuthPage() {
  if (process.env.DEMO_MODE === "true") {
    redirect("/demo");
  }

  return (
    <Suspense fallback={<div />}>
      <AuthComponent />
    </Suspense>
  );
}
