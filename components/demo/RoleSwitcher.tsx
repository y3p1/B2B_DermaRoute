"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, ClipboardList, Shield } from "lucide-react";
import { type DemoRole } from "@/lib/demoMode";
import { useAuthStore } from "@/store/auth";

const ROLES: {
  role: DemoRole;
  label: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  description: string;
  href: string;
}[] = [
  {
    role: "provider",
    label: "Provider",
    icon: Stethoscope,
    description:
      "Submit BV requests, track wound healing, and manage product orders.",
    href: "/",
  },
  {
    role: "clinic_staff",
    label: "Clinic Staff",
    icon: ClipboardList,
    description:
      "Manage patient BV requests and coordinate with providers.",
    href: "/clinic-staff",
  },
  {
    role: "admin",
    label: "Admin",
    icon: Shield,
    description:
      "Review BV requests, manage manufacturers, products, and analytics.",
    href: "/admin",
  },
];

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

      <p
        className="text-sm mb-10 font-medium"
        style={{ color: "oklch(0.50 0.08 160)" }}
      >
        Routing benefit verifications at the speed of care.
      </p>

      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        Choose a role to explore
      </h1>
      <p className="text-sm text-gray-500 mb-10 text-center max-w-sm">
        No sign-in required. Browse the full portal as any role — all data is
        demo data.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
        {ROLES.map(({ role, label, icon: Icon, description, href }) => (
          <button
            key={role}
            onClick={() => pick(role, href)}
            disabled={pendingRole !== null}
            aria-busy={pendingRole === role}
            className="group flex flex-col items-center text-center gap-4 p-7 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 disabled:cursor-wait disabled:opacity-70"
            style={
              {
                borderColor: "oklch(0.88 0.04 160)",
                "--tw-ring-color": "oklch(0.65 0.11 160)",
              } as React.CSSProperties
            }
          >
            <div
              className="flex items-center justify-center w-14 h-14 rounded-full"
              style={{ background: "oklch(0.92 0.06 160)" }}
            >
              <Icon
                className="w-7 h-7"
                style={{ color: "oklch(0.45 0.12 160)" } as React.CSSProperties}
              />
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-base mb-1">
                {label}
              </div>
              <div className="text-xs text-gray-500 leading-relaxed">
                {description}
              </div>
            </div>
            <span
              className="text-xs font-semibold mt-auto group-hover:underline"
              style={{ color: "oklch(0.45 0.12 160)" }}
            >
              View as {label} →
            </span>
          </button>
        ))}
      </div>

      <p className="mt-12 text-xs text-gray-400">
        DermaRoute Demo — illustrative only, not a real patient environment.
      </p>
    </div>
  );
}
