"use client";

import SharedSignupFlow from "@/components/auth/signup/shared/SharedSignupFlow";
import AdminSignupStep1Profile, {
  type AdminProfileForm,
} from "./AdminSignupStep1Profile";
import AdminSignupStep3Summary from "./AdminSignupStep3Summary";
import AdminSignupStep4Success from "./AdminSignupStep4Success";

export default function AdminSignupComponent() {
  return (
    <SharedSignupFlow<AdminProfileForm>
      Step1Component={AdminSignupStep1Profile}
      Step3Component={AdminSignupStep3Summary}
      Step4Component={AdminSignupStep4Success}
      title="Create Admin Account"
      signInUrl="/admin/signin"
      submitUrl="/api/admin-signup"
    />
  );
}
