"use client";

import { useSearchParams, useRouter } from "next/navigation";
import ProviderSignupFlow from "./ProviderSignupFlow";
import ClinicStaffSignupFlow from "../clinic-staff/ClinicStaffSignupFlow";
import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";

export default function SignupClientPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = searchParams.get("role");

  if (!role) {
    return (
      <div className="w-screen min-h-screen flex flex-col items-center justify-center bg-[#1a1a2e] px-4">
        <div className="w-full max-w-md p-8 rounded-lg shadow-lg bg-card flex flex-col items-center">
          <IntegrityTissueLogo />
          <p className="text-black/80 font-bold my-6 text-center">
            Are you signing up as a Provider/Clinic Staff or as an ITS Representative?
          </p>
          <div className="flex flex-col gap-4 w-full">
            <button
              className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold shadow hover:bg-neutral-800 transition"
              onClick={() => router.push("/signup?role=provider")}
            >
              I am a Provider/Clinic Staff
            </button>
            <button
              className="w-full px-6 py-3 bg-white text-black rounded-lg font-semibold shadow hover:bg-neutral-100 transition"
              onClick={() => router.push("/signup?role=clinic_staff")}
            >
              I am an ITS Representative
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (role === "provider") {
    return <ProviderSignupFlow />;
  }
  if (role === "clinic_staff") {
    return <ClinicStaffSignupFlow />;
  }
  // fallback
  return null;
}
