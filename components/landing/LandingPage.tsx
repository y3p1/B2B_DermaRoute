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

import { NOISE_BG, HERO_GRADIENT_BG } from "@/lib/visual-constants";

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
    <div
      className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16 overflow-hidden"
      style={{ background: HERO_GRADIENT_BG }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
        style={{ backgroundImage: NOISE_BG }}
      />

      <div className="relative mb-2 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dermaroute-logo.svg" alt="DermaRoute" className="h-12" />
      </div>

      <p
        className="relative text-sm mb-10 font-medium"
        style={{ color: "oklch(0.50 0.08 160)" }}
      >
        Routing benefit verifications at the speed of care.
      </p>

      <h1 className="relative text-2xl font-bold text-gray-900 mb-2 text-center tracking-[-0.02em]">
        {isAuthenticated ? "Your Services" : "Provider Portal"}
      </h1>
      <p className="relative text-sm text-gray-500 mb-10 text-center max-w-sm">
        {isAuthenticated
          ? "Select a service to get started."
          : "Sign in to access your practice's enabled services."}
      </p>

      <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
        {SERVICES.map((service) => {
          const enabled = isEnabled(service.track);
          const Icon = service.icon;
          const interactive = enabled || !isAuthenticated;

          return (
            <button
              key={service.track}
              onClick={() => handleServiceClick(service)}
              disabled={isAuthenticated && !enabled}
              className={[
                "group flex flex-col items-center text-center gap-4 p-7 rounded-2xl bg-white inset-ring-1 inset-ring-[oklch(0.45_0.12_160/0.14)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.65_0.167_35)] focus-visible:ring-offset-2",
                interactive
                  ? [
                      "cursor-pointer",
                      "transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      "shadow-[0_1px_2px_oklch(0.45_0.12_160/0.05),0_12px_32px_-12px_oklch(0.45_0.12_160/0.18)]",
                      "hover:shadow-[0_2px_4px_oklch(0.45_0.12_160/0.06),0_20px_48px_-16px_oklch(0.45_0.12_160/0.28)]",
                      "hover:-translate-y-1 active:translate-y-0 active:scale-[0.99]",
                    ].join(" ")
                  : "opacity-60 saturate-0 cursor-not-allowed shadow-[0_1px_2px_oklch(0.45_0.12_160/0.04)]",
              ].join(" ")}
            >
              <div
                className="flex items-center justify-center w-14 h-14 rounded-full relative ring-1 ring-inset ring-[oklch(0.45_0.12_160/0.10)]"
                style={{
                  background: interactive
                    ? "oklch(0.94 0.05 160)"
                    : "oklch(0.93 0.01 160)",
                }}
              >
                <Icon
                  className="w-7 h-7"
                  style={{
                    color: interactive
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
                className="text-xs font-semibold mt-auto inline-flex items-center gap-1"
                style={{
                  color: interactive
                    ? "oklch(0.45 0.12 160)"
                    : "oklch(0.60 0.02 160)",
                }}
              >
                {!isAuthenticated ? (
                  <>
                    Sign in
                    <span aria-hidden className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5">→</span>
                  </>
                ) : enabled ? (
                  <>
                    Open
                    <span aria-hidden className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5">→</span>
                  </>
                ) : (
                  "Not enabled"
                )}
              </span>
            </button>
          );
        })}
      </div>

      {!isAuthenticated && (
        <button
          onClick={() => router.push("/auth")}
          className="relative mt-10 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors hover:bg-[oklch(0.40_0.11_160)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.65_0.167_35)] focus-visible:ring-offset-2 active:bg-[oklch(0.37_0.10_160)]"
          style={{ background: "oklch(0.45 0.12 160)" }}
        >
          Sign in to your account
        </button>
      )}

      {!isAuthenticated && <FaqSection />}

      <p className="relative mt-12 text-xs text-gray-400">
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
    <section className="relative w-full max-w-2xl mt-16">
      <h2 className="text-lg font-bold text-gray-900 mb-4 text-center tracking-[-0.01em]">
        Frequently Asked Questions
      </h2>
      <div className="space-y-2">
        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            className="rounded-xl bg-white overflow-hidden ring-1 ring-inset ring-[oklch(0.45_0.12_160/0.14)] shadow-[0_1px_2px_oklch(0.45_0.12_160/0.04)]"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left text-sm font-semibold text-gray-800 hover:bg-[oklch(0.97_0.01_160)] active:bg-[oklch(0.95_0.02_160)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[oklch(0.65_0.167_35)]"
            >
              {item.q}
              <ChevronDown
                className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${open === i ? "rotate-180" : ""}`}
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
