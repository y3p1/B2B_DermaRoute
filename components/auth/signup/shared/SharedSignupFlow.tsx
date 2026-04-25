"use client";

import React, { useState } from "react";
import { ApiError, apiPost } from "@/lib/apiClient";
import SignupStep2Verification from "@/components/auth/signup/shared/SignupStep2Verification";

type SignupStep = 1 | 2 | 3 | 4;

const steps = ["Account Details", "Review", "Success"];

export interface ProfileForm {
  accountPhone: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface SharedSignupFlowProps<T extends ProfileForm> {
  Step1Component: React.ComponentType<{
    onNext: (data: T) => void;
    defaultValues?: Partial<T>;
  }>;
  Step3Component: React.ComponentType<{
    profile: T;
    onNext: () => void;
    onBack: () => void;
    isSubmitting?: boolean;
    error?: {
      title: string;
      description: string;
      cta?: { label: string; href: string };
    } | null;
    onDismissError?: () => void;
  }>;
  Step4Component: React.ComponentType;
  title: string;
  signInUrl: string;
  submitUrl?: string;
}

export default function SharedSignupFlow<T extends ProfileForm>({
  Step1Component,
  Step3Component,
  Step4Component,
  title,
  signInUrl,
  submitUrl,
}: SharedSignupFlowProps<T>) {
  const [currentStep, setCurrentStep] = useState<SignupStep>(1);
  const [profile, setProfile] = useState<T | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<null | {
    title: string;
    description: string;
    cta?: { label: string; href: string };
  }>(null);

  const handleStep1Next = (data: T) => {
    setProfile(data);
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    setCurrentStep(3);
  };

  const handleStep2Back = () => {
    setCurrentStep(1);
  };

  const handleStep3Back = () => {
    setCurrentStep(2);
  };

  const handleSubmit = async () => {
    if (!profile) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const url = submitUrl ?? "/api/clinic-staff-signup";
      await apiPost<
        { message: string; user_id: string },
        Record<string, unknown>
      >(url, profile as Record<string, unknown>);

      setCurrentStep(4);
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

      const errorTitle = (() => {
        if (apiCode === "EMAIL_ALREADY_REGISTERED")
          return "Email already registered";
        if (apiCode === "PHONE_ALREADY_REGISTERED")
          return "Phone number already registered";
        if (err instanceof ApiError) return err.message || "Signup failed";
        return "Signup failed";
      })();

      const description = apiDetails ?? fallback;

      setSubmitError({
        title: errorTitle,
        description,
        cta: isDuplicate
          ? { label: "Back to sign in", href: signInUrl }
          : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-screen min-h-screen flex flex-col items-center bg-[#1a1a2e]">
      <div className="w-full max-w-md my-8 mx-auto p-0 rounded-lg shadow-lg bg-card flex flex-col items-center justify-center">
        <div className="w-full px-8 pt-8 pb-4">
          <div className="relative">
            <div className="absolute left-5 right-5 top-5 h-0.5 bg-gray-300" />

            <div className="flex items-start justify-between">
              {steps.map((label, idx) => {
                const displayStep = Math.min(currentStep, steps.length);
                const isComplete = displayStep > idx + 1;
                const isActive = displayStep === idx + 1;

                return (
                  <div
                    key={label}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold border-2 transition-colors ${
                        isComplete
                          ? "bg-green-500 border-green-500 text-white"
                          : isActive
                            ? "bg-black border-black text-white"
                            : "bg-gray-200 border-gray-300 text-gray-500"
                      }`}
                    >
                      {isComplete ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>

                    <span className="mt-2 text-[11px] font-medium text-muted-foreground text-center leading-tight">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {currentStep === 1 && (
          <Step1Component
            onNext={handleStep1Next}
            defaultValues={profile || undefined}
          />
        )}
        {currentStep === 2 && profile && (
          <SignupStep2Verification
            phone={profile.accountPhone}
            onNext={handleStep2Next}
            onBack={handleStep2Back}
            steps={steps}
            title={title}
          />
        )}
        {currentStep === 3 && profile && (
          <Step3Component
            profile={profile}
            onNext={handleSubmit}
            onBack={handleStep3Back}
            isSubmitting={isSubmitting}
            error={submitError}
            onDismissError={() => setSubmitError(null)}
          />
        )}
        {currentStep === 4 && <Step4Component />}
      </div>

      {currentStep !== 4 ? (
        <div className="text-center mb-4">
          <span className="text-muted-foreground text-sm">
            Already have an account?{" "}
          </span>
          <a
            href={signInUrl}
            className="text-primary underline text-sm hover:text-primary/80"
          >
            Back to sign in
          </a>
        </div>
      ) : null}
    </div>
  );
}
