"use client";

import React, { useState } from "react";
import SignupStep1ClinicDetails, {
  ClinicDetailsForm,
} from "./SignupStep1ClinicDetails";
import SignupStep2Verification from "@/components/auth/signup/shared/SignupStep2Verification";
import SignupStep3Agreement, { SignatureData } from "./SignupStep3Agreement";
import SignupStep4Summary from "./SignupStep4Summary";
import SignupStep5Success from "./SignupStep5Success";
import { ApiError, apiPost } from "@/lib/apiClient";

type SignupStep = 1 | 2 | 3 | 4 | 5;

type ProviderSignupRequest = {
  clinic: ClinicDetailsForm;
  baa?: SignatureData;
};

export default function ProviderSignupFlow() {
  const [currentStep, setCurrentStep] = useState<SignupStep>(1);
  const [clinicData, setClinicData] = useState<ClinicDetailsForm | null>(null);
  const [signatureData, setSignatureData] = useState<SignatureData | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<null | {
    title: string;
    description: string;
    cta?: { label: string; href: string };
  }>(null);

  const handleStep1Next = (data: ClinicDetailsForm) => {
    setClinicData(data);
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    setCurrentStep(3);
  };

  const handleStep2Back = () => {
    setCurrentStep(1);
  };

  const handleStep3Next = (data: SignatureData | null) => {
    setSignatureData(data);
    setCurrentStep(4);
  };

  const handleStep3Back = () => {
    setCurrentStep(2);
  };

  const handleStep4Next = async () => {
    if (!clinicData) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload: ProviderSignupRequest = {
        clinic: clinicData,
        baa: signatureData ?? undefined,
      };

      await apiPost<
        { message: string; user_id: string; data: unknown },
        ProviderSignupRequest
      >("/api/provider-signup", payload);

      setCurrentStep(5);
    } catch (err) {
      const fallback =
        err instanceof Error ? err.message : "Failed to submit signup";

      const apiData =
        err instanceof ApiError && err.data && typeof err.data === "object"
          ? (err.data as { code?: unknown; details?: unknown })
          : null;

      const apiCode =
        apiData && typeof apiData.code === "string" ? apiData.code : null;

      const apiDetails =
        apiData && typeof apiData.details === "string" && apiData.details.trim()
          ? apiData.details
          : null;

      const isDuplicate =
        err instanceof ApiError && err.status === 409 && !!apiCode;

      const title = (() => {
        if (apiCode === "EMAIL_ALREADY_REGISTERED")
          return "Email already registered";
        if (apiCode === "PHONE_ALREADY_REGISTERED")
          return "Phone number already registered";
        if (err instanceof ApiError) return err.message || "Signup failed";
        return "Signup failed";
      })();

      const description = apiDetails ?? fallback;

      setSubmitError({
        title,
        description,
        cta: isDuplicate
          ? { label: "Back to sign in", href: "/auth" }
          : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep4Back = () => {
    setCurrentStep(3);
  };

  return (
    <div className="w-screen min-h-screen flex flex-col items-center bg-[#1a1a2e]">
      <div
        className={`w-full ${
          currentStep === 3 ? "max-w-[90%]" : "max-w-md"
        } my-8 mx-auto p-0 rounded-lg shadow-lg bg-card flex flex-col items-center justify-center`}
      >
        <div className="w-full">
          {currentStep === 1 && (
            <SignupStep1ClinicDetails
              onNext={handleStep1Next}
              defaultValues={clinicData || undefined}
            />
          )}
          {currentStep === 2 && clinicData && (
            <SignupStep2Verification
              phone={clinicData.accountPhone}
              onNext={handleStep2Next}
              onBack={handleStep2Back}
              title="Create Provider Account"
            />
          )}
          {currentStep === 3 && (
            <SignupStep3Agreement
              onNext={handleStep3Next}
              onBack={handleStep3Back}
            />
          )}
          {currentStep === 4 && clinicData && (
            <SignupStep4Summary
              clinicData={clinicData}
              signatureData={signatureData || undefined}
              onNext={handleStep4Next}
              onBack={handleStep4Back}
              isSubmitting={isSubmitting}
              error={submitError}
              onDismissError={() => setSubmitError(null)}
            />
          )}
          {currentStep === 5 && <SignupStep5Success />}
        </div>
        <div className="text-center mb-4">
          <span className="text-muted-foreground text-sm">
            Already have an account?{" "}
          </span>
          <a
            href="/auth"
            className="text-primary underline text-sm hover:text-primary/80"
          >
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
