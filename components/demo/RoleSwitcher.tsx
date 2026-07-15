"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Shield, Wind, Eye, Activity } from "lucide-react";
import { type DemoRole, DEMO_TRACK_LABELS } from "@/lib/demoMode";
import { useAuthStore } from "@/store/auth";

type CardDef = {
  role: DemoRole;
  label: string;
  sublabel?: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  description: string;
  href: string;
};

function getTrackTag(role: DemoRole, trackMap: Record<string, string[]>): string | null {
  const tracks = trackMap[role];
  if (!tracks || tracks.length === 0) return null;
  const labels = tracks.map((t) => DEMO_TRACK_LABELS[t] ?? t);
  if (labels.length === 1) return `${labels[0]} only`;
  return labels.join(" · ");
}

const PROVIDER_CARDS: CardDef[] = [
  {
    role: "provider",
    label: "Cedar Hills Wound Center",
    sublabel: "Jordan Rivera, MD",
    icon: Wind,
    description: "Wound care & medical device / equipment orders.",
    href: "/",
  },
  {
    role: "provider_wound2",
    label: "Summit Wound Specialists",
    sublabel: "Casey Morrison, MD",
    icon: Activity,
    description: "Wound care biologics only. Demonstrates single-track access assigned by admin.",
    href: "/",
  },
  {
    role: "provider_ocular",
    label: "Coastal Eye Clinic",
    sublabel: "Taylor Nguyen, MD",
    icon: Eye,
    description: "Ocular amniotic membrane orders. Demonstrates ocular-only track access.",
    href: "/",
  },
];

const STAFF_CARDS: CardDef[] = [
  {
    role: "clinic_staff",
    label: "DR Representative",
    sublabel: "Alex Patel",
    icon: ClipboardList,
    description: "Manage BV requests and coordinate with assigned providers.",
    href: "/clinic-staff",
  },
  {
    role: "admin",
    label: "Admin",
    sublabel: "Morgan Chen",
    icon: Shield,
    description: "Full access: manage manufacturers, products, analytics, and practice tracks.",
    href: "/admin",
  },
];

import { NOISE_BG, HERO_GRADIENT_BG } from "@/lib/visual-constants";

function RoleCard({
  card,
  pending,
  onPick,
  trackMap,
  variant = "light",
}: {
  card: CardDef;
  pending: DemoRole | null;
  onPick: (role: DemoRole, href: string) => void;
  trackMap: Record<string, string[]>;
  variant?: "light" | "dark";
}) {
  const { role, label, sublabel, icon: Icon, description, href } = card;
  const trackTag = getTrackTag(role, trackMap);
  const dark = variant === "dark";
  return (
    <button
      key={role}
      onClick={() => onPick(role, href)}
      disabled={pending !== null}
      aria-busy={pending === role}
      className={[
        "group flex flex-col items-center text-center gap-3 p-6 rounded-2xl inset-ring-1",
        "transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:-translate-y-1 active:translate-y-0 active:scale-[0.99]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.65_0.167_35)] focus-visible:ring-offset-2",
        "disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0",
        dark
          ? [
              "bg-[var(--brand-dark)] inset-ring-white/10 focus-visible:ring-offset-[oklch(0.985_0.005_160)]",
              "shadow-[0_1px_2px_oklch(0.17_0.012_285/0.20),0_12px_32px_-12px_oklch(0.17_0.012_285/0.45)]",
              "hover:shadow-[0_2px_4px_oklch(0.17_0.012_285/0.24),0_20px_48px_-16px_oklch(0.17_0.012_285/0.55)]",
            ].join(" ")
          : [
              "bg-white inset-ring-[oklch(0.45_0.12_160/0.14)]",
              "shadow-[0_1px_2px_oklch(0.45_0.12_160/0.05),0_12px_32px_-12px_oklch(0.45_0.12_160/0.18)]",
              "hover:shadow-[0_2px_4px_oklch(0.45_0.12_160/0.06),0_20px_48px_-16px_oklch(0.45_0.12_160/0.28)]",
            ].join(" "),
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center justify-center w-12 h-12 rounded-full ring-1 ring-inset",
          dark ? "bg-white/[0.08] ring-white/10" : "ring-[oklch(0.45_0.12_160/0.10)]",
        ].join(" ")}
        style={dark ? undefined : { background: "oklch(0.94 0.05 160)" }}
      >
        <Icon
          className="w-6 h-6"
          style={{ color: dark ? "oklch(0.72 0.16 40)" : "oklch(0.45 0.12 160)" } as React.CSSProperties}
        />
      </div>
      <div>
        <div className={`font-semibold text-sm mb-0.5 ${dark ? "text-white" : "text-gray-900"}`}>{label}</div>
        {sublabel && <div className={`text-xs mb-1 ${dark ? "text-white/50" : "text-gray-400"}`}>{sublabel}</div>}
        <div className={`text-xs leading-relaxed ${dark ? "text-white/60" : "text-gray-500"}`}>{description}</div>
        {trackTag && (
          <div
            className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset"
            style={
              dark
                ? ({ background: "oklch(1 0 0 / 0.06)", color: "oklch(0.85 0.05 160)", "--tw-ring-color": "oklch(1 0 0 / 0.10)" } as React.CSSProperties)
                : ({ background: "oklch(0.95 0.03 160)", color: "oklch(0.40 0.12 160)", "--tw-ring-color": "oklch(0.45 0.12 160 / 0.12)" } as React.CSSProperties)
            }
          >
            {trackTag}
          </div>
        )}
      </div>
      <span
        className="text-xs font-semibold mt-auto inline-flex items-center gap-1"
        style={{ color: dark ? "oklch(0.72 0.16 40)" : "oklch(0.45 0.12 160)" }}
      >
        {pending === role ? (
          "Loading…"
        ) : (
          <>
            Enter
            <span aria-hidden className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5">
              →
            </span>
          </>
        )}
      </span>
    </button>
  );
}

export function RoleSwitcher() {
  const router = useRouter();
  const switchDemoRole = useAuthStore((s) => s.switchDemoRole);
  const [pendingRole, setPendingRole] = React.useState<DemoRole | null>(null);

  // Fetch practice tracks from DB on mount
  const [trackMap, setTrackMap] = React.useState<Record<string, string[]>>({});

  React.useEffect(() => {
    let cancelled = false;
    async function fetchTracks() {
      try {
        const res = await fetch("/api/demo-tracks");
        if (!res.ok) return;
        const json = await res.json() as { success: boolean; data: Record<string, string[]> };
        if (!cancelled && json.success && json.data) {
          setTrackMap(json.data);
        }
      } catch {
        // Keep hardcoded defaults on error
      }
    }
    void fetchTracks();
    return () => { cancelled = true; };
  }, []);

  const pick = async (role: DemoRole, href: string) => {
    if (pendingRole) return;
    setPendingRole(role);
    try {
      await switchDemoRole(role);
      router.replace(href);
    } finally {
      setPendingRole(null);
    }
  };

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
        <img src="/dermaroute-logo.svg" alt="DermaRoute Demo" className="h-12" />
      </div>

      <p className="relative text-sm mb-10 font-medium" style={{ color: "oklch(0.50 0.08 160)" }}>
        Routing benefit verifications at the speed of care.
      </p>

      <h1 className="relative text-2xl font-bold text-gray-900 mb-2 text-center tracking-[-0.02em]">Choose a role to explore</h1>
      <p className="relative text-sm text-gray-500 mb-8 text-center max-w-sm">
        No sign-in required. Browse the full portal as any role — all data is demo data.
      </p>

      <div className="relative w-full max-w-4xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 text-center">Provider Accounts</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PROVIDER_CARDS.map((card) => (
              <RoleCard key={card.role} card={card} pending={pendingRole} onPick={(r, h) => { void pick(r, h); }} trackMap={trackMap} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 text-center">Staff & Administration</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            {STAFF_CARDS.map((card) => (
              <RoleCard key={card.role} card={card} pending={pendingRole} onPick={(r, h) => { void pick(r, h); }} trackMap={trackMap} variant="dark" />
            ))}
          </div>
        </div>
      </div>


    </div>
  );
}
