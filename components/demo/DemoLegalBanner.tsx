"use client";
import { isClientDemoMode } from "@/lib/demoMode";

export function DemoLegalBanner() {
  if (!isClientDemoMode()) return null;

  return (
    <div
      className="rounded-lg px-5 py-4 mb-8 text-sm font-medium"
      style={{
        background: "oklch(0.95 0.06 160)",
        border: "1px solid oklch(0.75 0.10 160)",
        color: "oklch(0.30 0.10 160)",
      }}
    >
      <strong>DEMO ENVIRONMENT</strong> — This is a demonstration of DermaRoute.
      The legal text below is illustrative only and does not constitute a binding
      agreement.
    </div>
  );
}
