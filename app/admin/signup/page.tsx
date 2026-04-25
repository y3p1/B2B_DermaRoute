import AdminSignupComponent from "@/components/auth/signup/admin/AdminSignupComponent";
import { Suspense } from "react";

export default function AdminSignupPage() {
  return (
    <Suspense fallback={null}>
      <AdminSignupComponent />
    </Suspense>
  );
}
