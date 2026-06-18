"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, LayoutDashboard, Plus, ClipboardList, Package, FileText, LogOut, Menu, X } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { supabase } from "@/lib/supabaseClient";
import { isClientDemoMode } from "@/lib/demoMode";

const NAV_ITEMS = [
  { href: "/wound-care/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wound-care/orders/new", label: "New BV Request", icon: Plus },
  { href: "/wound-care/orders", label: "BV History", icon: ClipboardList },
  { href: "/wound-care/order-products", label: "Order Products", icon: Package },
  { href: "/wound-care/baa-agreements", label: "BAA Agreements", icon: FileText },
];

export default function WoundCareLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const enabledTracks = useAuthStore((s) => s.enabledTracks);
  const role = useAuthStore((s) => s.role);
  const provider = useAuthStore((s) => s.provider);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (isClientDemoMode()) return;
    if (status === "unauthenticated") { router.replace("/auth"); return; }
    if (status === "authenticated") {
      if (role === "admin") { router.replace("/admin"); return; }
      if (role === "clinic_staff") { router.replace("/clinic-staff"); return; }
      if (!enabledTracks.includes("wound_care")) { router.replace("/no-tracks"); return; }
    }
  }, [status, role, enabledTracks, router]);

  if ((status === "idle" || status === "loading") && !isClientDemoMode()) {
    return <div className="min-h-screen bg-emerald-50" />;
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  const renderNav = () => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const exactMatch = item.href === "/wound-care/orders" || item.href === "/wound-care/order-products" || item.href === "/wound-care/baa-agreements";
        const isActive = exactMatch
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={[
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              isActive
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-emerald-800 hover:bg-emerald-100",
            ].join(" ")}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col">
      <header className="h-16 bg-white border-b border-emerald-100 flex items-center px-4 gap-3 shrink-0 shadow-sm">
        <button
          className="lg:hidden p-2 rounded-md text-emerald-700 hover:bg-emerald-50"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-emerald-600" />
          <span className="font-bold text-emerald-900 text-lg">Tissue Products & PRP</span>
        </div>
        <div className="flex-1" />
        <span className="hidden sm:block text-sm text-emerald-700 font-medium truncate max-w-xs">
          {provider?.clinicName ?? "Provider Portal"}
        </span>
        <button
          onClick={() => { void handleSignOut(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      <div className="flex flex-1">
        <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-emerald-100 shrink-0 relative z-10 h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-4 py-4 border-b border-emerald-50">
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Navigation</p>
          </div>
          {renderNav()}
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-4 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-emerald-900">Tissue Products & PRP</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {renderNav()}
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
