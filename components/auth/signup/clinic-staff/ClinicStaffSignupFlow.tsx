"use client";

import SharedSignupFlow from "@/components/auth/signup/shared/SharedSignupFlow";
import ClinicStaffSignupStep1Profile, {
  type ClinicStaffProfileForm,
} from "./ClinicStaffSignupStep1Profile";
import ClinicStaffSignupStep3Summary from "./ClinicStaffSignupStep3Summary";
import ClinicStaffSignupStep4Success from "./ClinicStaffSignupStep4Success";

export default function ClinicStaffSignupFlow() {
  return (
    <SharedSignupFlow<ClinicStaffProfileForm>
      Step1Component={ClinicStaffSignupStep1Profile}
      Step3Component={ClinicStaffSignupStep3Summary}
      Step4Component={ClinicStaffSignupStep4Success}
      title="Create Clinic Staff Account"
      signInUrl="/auth?role=clinic_staff"
    />
  );
}
