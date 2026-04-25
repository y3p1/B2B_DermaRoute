import React, { Suspense } from "react";
import AuthComponent from "@/components/auth/signin/AuthComponent";

export default function AuthPage() {
  return (
    <Suspense fallback={<div />}>
      <AuthComponent />
    </Suspense>
  );
}
