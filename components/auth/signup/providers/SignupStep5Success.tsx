"use client";

import { Button } from "@/components/ui/button";
import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";
import { useRouter } from "next/navigation";

export default function SignupStep5Success() {
  const router = useRouter();

  const handleBackToHome = () => {
    router.replace("/");
  };

  return (
    <div className="w-full px-8 py-4">
      <div className="w-full h-full flex flex-col justify-center items-center">
        {/* Success Card */}
        <div className="flex-1 rounded-lg flex flex-col justify-center overflow-hidden min-h-175">
          {/* Logo Section */}
          <IntegrityTissueLogo />

          {/* Success Icon */}
          <div className="flex justify-center mt-8">
            <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-4">
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

          {/* Success Message */}
          <h1 className="text-center font-bold text-4xl text-green-500 mb-4">
            Success!
          </h1>

          <div className="mb-12">
            <p className="text-xl text-black text-center">
              Thank you for signing up for an account with us. Your
              representative will contact you with the next steps.
            </p>
          </div>

          {/* Back to Homepage Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleBackToHome}
              className="w-full max-w-xs bg-gray-300 hover:bg-gray-400 hover:text-white text-gray-800 text-lg py-6 rounded-full"
            >
              Back to homepage
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
