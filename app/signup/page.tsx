import SignupClientPage from "@/components/auth/signup/providers/SignupClientPage";
import { Suspense } from "react";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupClientPage />
    </Suspense>
  );
}
