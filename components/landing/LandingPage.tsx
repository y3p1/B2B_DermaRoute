"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Wind, Eye, Lock, ChevronDown } from "lucide-react";
import { useAuthStore, type TrackKey } from "@/store/auth";
import { isClientDemoMode } from "@/lib/demoMode";

type ServiceCard = {
  track: TrackKey;
  label: string;
  description: string;
  href: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
};

const SERVICES: ServiceCard[] = [
  {
    track: "wound_care",
    label: "Tissue Products & PRP (Biologics)",
    description:
      "Submit benefit verifications, track wound healing, and manage product orders for wound care patients.",
    href: "/wound-care/dashboard",
    icon: Activity,
  },
  {
    track: "ocular",
    label: "Ocular Products",
    description:
      "Submit orders for amniotic membrane grafts and other ocular surface products.",
    href: "/ocular/dashboard",
    icon: Eye,
  },
  {
    track: "lymphedema",
    label: "Medical Devices / Equipment",
    description:
      "AIROS Compression Pump & Garment Ordering",
    href: "/medical-devices/dashboard",
    icon: Wind,
  },
];

export function LandingPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const enabledTracks = useAuthStore((s) => s.enabledTracks);
  const accountType = useAuthStore((s) => s.accountType);

  const isDemo = isClientDemoMode();
  // In demo mode the viewer is always "in" — treat as authenticated for UI so
  // the heading doesn't flash "Provider Portal" before hydrate completes.
  const isAuthenticated = status === "authenticated" || isDemo;

  function isEnabled(track: TrackKey): boolean {
    if (!isAuthenticated) return false;
    return enabledTracks.includes(track);
  }

  function handleServiceClick(service: ServiceCard) {
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }
    if (!isEnabled(service.track)) return;
    router.push(service.href);
  }

  // Admin/clinic_staff shouldn't be on this page — redirect handled by route guard
  if (isAuthenticated && accountType === "admin") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white to-[oklch(0.96_0.03_160)] px-4 py-16">
      <div className="mb-2 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dermaroute-logo.svg" alt="DermaRoute" className="h-12" />
      </div>

      <p
        className="text-sm mb-10 font-medium"
        style={{ color: "oklch(0.50 0.08 160)" }}
      >
        Routing benefit verifications at the speed of care.
      </p>

      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        {isAuthenticated ? "Your Services" : "Provider Portal"}
      </h1>
      <p className="text-sm text-gray-500 mb-10 text-center max-w-sm">
        {isAuthenticated
          ? "Select a service to get started."
          : "Sign in to access your practice's enabled services."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
        {SERVICES.map((service) => {
          const enabled = isEnabled(service.track);
          const Icon = service.icon;

          return (
            <button
              key={service.track}
              onClick={() => handleServiceClick(service)}
              disabled={isAuthenticated && !enabled}
              className={[
                "group flex flex-col items-center text-center gap-4 p-7 rounded-2xl border bg-white transition-all focus:outline-none focus:ring-2",
                enabled || !isAuthenticated
                  ? "shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                  : "opacity-50 cursor-not-allowed",
              ].join(" ")}
              style={
                {
                  borderColor: "oklch(0.88 0.08 35)",
                  "--tw-ring-color": "oklch(0.65 0.167 35)",
                } as React.CSSProperties
              }
            >
              <div
                className="flex items-center justify-center w-14 h-14 rounded-full relative"
                style={{
                  background: enabled || !isAuthenticated
                    ? "oklch(0.92 0.06 160)"
                    : "oklch(0.93 0.01 160)",
                }}
              >
                <Icon
                  className="w-7 h-7"
                  style={{
                    color: enabled || !isAuthenticated
                      ? "oklch(0.45 0.12 160)"
                      : "oklch(0.60 0.02 160)",
                  } as React.CSSProperties}
                />
                {isAuthenticated && !enabled && (
                  <Lock
                    className="w-3.5 h-3.5 absolute -bottom-0.5 -right-0.5"
                    style={{ color: "oklch(0.55 0.02 160)" }}
                  />
                )}
              </div>

              <div>
                <div className="font-semibold text-gray-900 text-base mb-1">
                  {service.label}
                </div>
                <div className="text-xs text-gray-500 leading-relaxed">
                  {service.description}
                </div>
              </div>

              <span
                className="text-xs font-semibold mt-auto"
                style={{
                  color: enabled || !isAuthenticated
                    ? "oklch(0.45 0.12 160)"
                    : "oklch(0.60 0.02 160)",
                }}
              >
                {!isAuthenticated
                  ? "Sign in →"
                  : enabled
                    ? "Open →"
                    : "Not enabled"}
              </span>
            </button>
          );
        })}
      </div>

      {!isAuthenticated && (
        <button
          onClick={() => router.push("/auth")}
          className="mt-10 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ background: "oklch(0.45 0.12 160)" }}
        >
          Sign in to your account
        </button>
      )}

      {!isAuthenticated && <FaqSection />}

      <p className="mt-12 text-xs text-gray-400">
        DermaRoute Provider Portal
      </p>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    q: "What is DermaRoute?",
    a: "DermaRoute is a B2B wound care procurement portal that streamlines benefit verifications, product ordering, and CMS policy lookups for healthcare providers. It supports tissue biologics, ocular products, and medical devices.",
  },
  {
    q: "What is a benefit verification?",
    a: "A benefit verification (BV) confirms a patient’s insurance coverage for specific wound care products before ordering. DermaRoute automates the BV submission and tracking workflow between providers and distributors.",
  },
  {
    q: "What technology does DermaRoute use?",
    a: "DermaRoute is built with Next.js (App Router), TypeScript, Supabase/Postgres, Drizzle ORM, and Tailwind CSS. Its AI policy assistant uses Retrieval-Augmented Generation (RAG) with Google Gemini and pgvector.",
  },
  {
    q: "Who uses DermaRoute?",
    a: "DermaRoute serves three user roles: healthcare providers who submit benefit verifications and orders, clinic staff who manage multi-provider practices, and admin users who oversee operations, products, and analytics.",
  },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="w-full max-w-2xl mt-16">
      <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">
        Frequently Asked Questions
      </h2>
      <div className="space-y-2">
        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            className="border rounded-xl bg-white overflow-hidden"
            style={{ borderColor: "oklch(0.88 0.08 35)" }}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
            >
              {item.q}
              <ChevronDown
                className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`}
              />
            </button>
            {open === i && (
              <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
