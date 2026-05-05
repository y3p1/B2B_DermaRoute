"use client";
import React from "react";
import { isClientDemoMode } from "@/lib/demoMode";
import { useRouter } from "next/navigation";

export function DemoBanner() {
  const [dismissed, setDismissed] = React.useState(false);
  const router = useRouter();

  if (!isClientDemoMode() || dismissed) return null;

  const handleSwitchRole = () => {
    router.push("/demo");
  };

  return (
    <div
      className="w-full flex items-center justify-between gap-3 px-4 py-2 text-sm"
      style={{
        background: "oklch(0.95 0.04 160)",
        borderBottom: "1px solid oklch(0.80 0.08 160)",
        color: "oklch(0.30 0.10 160)",
      }}
    >
      <span className="font-medium">
        Demo environment — emails, SMS, and external integrations are disabled.
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleSwitchRole}
          className="underline font-semibold text-xs hover:opacity-80"
          style={{ color: "oklch(0.40 0.12 160)" }}
        >
          Switch role
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="opacity-60 hover:opacity-100 text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
