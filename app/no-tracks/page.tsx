"use client";

import React from "react";
import BrandLogo from "@/components/BrandLogo";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth";

export default function NoTracksPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const provider = useAuthStore((s) => s.provider);

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth");
    }
  }, [status, router]);

  if (status === "idle" || status === "loading") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white to-[oklch(0.96_0.03_160)] px-4 py-16">
      <div className="mb-8">
        { }
        <BrandLogo height={40} />
      </div>

      <div className="flex flex-col items-center text-center max-w-md gap-4">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full"
          style={{ background: "oklch(0.95 0.02 50)" }}
        >
          <AlertCircle
            className="w-8 h-8"
            style={{ color: "oklch(0.55 0.14 50)" }}
          />
        </div>

        <h1 className="text-xl font-bold text-gray-900">No Services Enabled</h1>

        <p className="text-sm text-gray-500 leading-relaxed">
          {provider?.clinicName
            ? `${provider.clinicName} does not have any services enabled yet.`
            : "Your practice does not have any services enabled yet."}{" "}
          Please contact your TissueCare representative to get started.
        </p>

        <div className="flex gap-3 mt-2">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back to Home
          </button>
          <button
            onClick={() => {
              void useAuthStore.getState().logout();
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: "oklch(0.45 0.12 160)" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
