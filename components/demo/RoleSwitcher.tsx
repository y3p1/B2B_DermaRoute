"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Shield, Wind, Eye, Activity } from "lucide-react";
import { type DemoRole, DEMO_ROLE_TRACKS, DEMO_TRACK_LABELS } from "@/lib/demoMode";
import { useAuthStore } from "@/store/auth";

type CardDef = {
  role: DemoRole;
  label: string;
  sublabel?: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  description: string;
  href: string;
};

function getTrackTag(role: DemoRole): string | null {
  const tracks = DEMO_ROLE_TRACKS[role];
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

function RoleCard({
  card,
  pending,
  onPick,
}: {
  card: CardDef;
  pending: DemoRole | null;
  onPick: (role: DemoRole, href: string) => void;
}) {
  const { role, label, sublabel, icon: Icon, description, href } = card;
  const trackTag = getTrackTag(role);
  return (
    <button
      key={role}
      onClick={() => onPick(role, href)}
      disabled={pending !== null}
      aria-busy={pending === role}
      className="group flex flex-col items-center text-center gap-3 p-6 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 disabled:cursor-wait disabled:opacity-70"
      style={{ borderColor: "oklch(0.88 0.08 35)", "--tw-ring-color": "oklch(0.65 0.167 35)" } as React.CSSProperties}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full" style={{ background: "oklch(0.92 0.06 160)" }}>
        <Icon className="w-6 h-6" style={{ color: "oklch(0.45 0.12 160)" } as React.CSSProperties} />
      </div>
      <div>
        <div className="font-semibold text-gray-900 text-sm mb-0.5">{label}</div>
        {sublabel && <div className="text-xs text-gray-400 mb-1">{sublabel}</div>}
        <div className="text-xs text-gray-500 leading-relaxed">{description}</div>
        {trackTag && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "oklch(0.94 0.04 160)", color: "oklch(0.40 0.12 160)" }}>
            {trackTag}
          </div>
        )}
      </div>
      <span className="text-xs font-semibold mt-auto group-hover:underline" style={{ color: "oklch(0.45 0.12 160)" }}>
        {pending === role ? "Loading…" : "Enter →"}
      </span>
    </button>
  );
}

export function RoleSwitcher() {
  const router = useRouter();
  const switchDemoRole = useAuthStore((s) => s.switchDemoRole);
  const [pendingRole, setPendingRole] = React.useState<DemoRole | null>(null);

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white to-[oklch(0.96_0.03_160)] px-4 py-16">
      <div className="mb-2 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dermaroute-logo.svg" alt="DermaRoute Demo" className="h-12" />
      </div>

      <p className="text-sm mb-10 font-medium" style={{ color: "oklch(0.50 0.08 160)" }}>
        Routing benefit verifications at the speed of care.
      </p>

      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Choose a role to explore</h1>
      <p className="text-sm text-gray-500 mb-8 text-center max-w-sm">
        No sign-in required. Browse the full portal as any role — all data is demo data.
      </p>

      <div className="w-full max-w-4xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 text-center">Provider Accounts</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PROVIDER_CARDS.map((card) => (
              <RoleCard key={card.role} card={card} pending={pendingRole} onPick={(r, h) => { void pick(r, h); }} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 text-center">Staff & Administration</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            {STAFF_CARDS.map((card) => (
              <RoleCard key={card.role} card={card} pending={pendingRole} onPick={(r, h) => { void pick(r, h); }} />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-12 text-xs text-gray-400">
        DermaRoute Demo — illustrative only, not a real patient environment.
      </p>
    </div>
  );
}
