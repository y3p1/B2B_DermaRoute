"use client";

import { Button } from "@/components/ui/button";
import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";
import { useRouter } from "next/navigation";

export default function ClinicStaffSignupStep4Success() {
  const router = useRouter();

  return (
    <div className="w-full px-8 py-4">
      <div className="w-full h-full flex flex-col justify-center items-center">
        <div className="flex-1 rounded-lg flex flex-col justify-center overflow-hidden min-h-175">
          <IntegrityTissueLogo />

          <div className="flex justify-center mt-8">
            <div className="w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center mb-4">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-center font-bold text-4xl text-amber-500 mb-4">
            Registration Submitted!
          </h1>

          <div className="mb-12">
            <p className="text-xl text-black text-center">
              Your ITS Representative account is pending admin approval.
            </p>
            <p className="text-sm text-gray-500 text-center mt-2">
              You will be able to sign in after an administrator approves your account.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => router.replace("/auth?role=clinic_staff")}
              className="w-full max-w-xs bg-gray-300 hover:bg-gray-400 hover:text-white text-gray-800 text-lg py-6 rounded-full"
            >
              Back to sign in
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
