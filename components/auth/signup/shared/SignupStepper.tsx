import React from "react";

interface SignupStepperProps {
  currentStep: number;
  steps?: string[];
  title?: string;
}

const defaultSteps = ["Clinic Details", "Verification", "Agreement"];

export default function SignupStepper({
  currentStep,
  steps = defaultSteps,
  title,
}: SignupStepperProps) {
  return (
    <div className="mb-8">
      {title ? (
        <h2 className="text-center text-black font-bold text-lg mb-4">
          {title}
        </h2>
      ) : null}

      <div className="flex items-center justify-center gap-4">
        {steps.map((step, idx) => {
          const stepNumber = idx + 1;
          const isCompleted = currentStep > stepNumber;
          const isCurrent = currentStep === stepNumber;

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    isCompleted
                      ? "bg-green-500"
                      : isCurrent
                        ? "bg-gray-600"
                        : "bg-gray-300"
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span className="text-white font-semibold opacity-90">
                      {stepNumber}
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs whitespace-nowrap ${
                    isCompleted
                      ? "text-green-700 font-semibold"
                      : "text-gray-400"
                  }`}
                >
                  {step}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div className="w-24 h-1 mb-6 bg-gray-300" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
