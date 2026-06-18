"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wind, LayoutDashboard, Plus, ClipboardList, LogOut, Menu, X } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { supabase } from "@/lib/supabaseClient";
import { isClientDemoMode } from "@/lib/demoMode";

const NAV_ITEMS = [
  { href: "/medical-devices/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/medical-devices/orders/new", label: "New Order", icon: Plus },
  { href: "/medical-devices/orders", label: "Order History", icon: ClipboardList },
];

export default function MedicalDevicesLayout({ children }: { children: React.ReactNode }) {
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
      if (!enabledTracks.includes("lymphedema")) { router.replace("/no-tracks"); return; }
    }
  }, [status, role, enabledTracks, router]);

  if ((status === "idle" || status === "loading") && !isClientDemoMode()) {
    return <div className="min-h-screen bg-purple-50" />;
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  const renderNav = () => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isOrderHistory = item.href === "/medical-devices/orders";
        const isActive = isOrderHistory
          ? pathname === "/medical-devices/orders"
          : pathname === item.href || (!isOrderHistory && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={[
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              isActive
                ? "bg-purple-600 text-white shadow-sm"
                : "text-purple-800 hover:bg-purple-100",
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
    <div className="min-h-screen bg-purple-50 flex flex-col">
      <header className="h-16 bg-white border-b border-purple-100 flex items-center px-4 gap-3 shrink-0 shadow-sm">
        <button
          className="lg:hidden p-2 rounded-md text-purple-700 hover:bg-purple-50"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Wind className="w-6 h-6 text-purple-600" />
          <span className="font-bold text-purple-900 text-lg">Medical Devices / Equipment</span>
        </div>
        <div className="flex-1" />
        <span className="hidden sm:block text-sm text-purple-700 font-medium truncate max-w-xs">
          {provider?.clinicName ?? "Provider Portal"}
        </span>
        <button
          onClick={() => { void handleSignOut(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      <div className="flex flex-1">
        <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-purple-100 shrink-0 relative z-10 h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-4 py-4 border-b border-purple-50">
            <p className="text-xs font-semibold text-purple-500 uppercase tracking-wider">Navigation</p>
          </div>
          {renderNav()}
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-4 border-b border-purple-100">
                <div className="flex items-center gap-2">
                  <Wind className="w-5 h-5 text-purple-600" />
                  <span className="font-bold text-purple-900">Medical Devices</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-md text-purple-600 hover:bg-purple-50">
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
