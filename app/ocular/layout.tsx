"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Eye, LayoutDashboard, Info, Plus, ClipboardList, LogOut, Menu, MessageSquare, X } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { supabase } from "@/lib/supabaseClient";
import { isClientDemoMode } from "@/lib/demoMode";

const NAV_ITEMS = [
  { href: "/ocular/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ocular/product-info", label: "Product Info", icon: Info },
  { href: "/ocular/orders/new", label: "New Order", icon: Plus },
  { href: "/ocular/orders", label: "Order History", icon: ClipboardList },
  { href: "/policy-assistant", label: "Policy Assistant", icon: MessageSquare },
];

export default function OcularLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const enabledTracks = useAuthStore((s) => s.enabledTracks);
  const role = useAuthStore((s) => s.role);
  const provider = useAuthStore((s) => s.provider);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (isClientDemoMode()) return;
    if (status === "unauthenticated") {
      router.replace("/auth");
      return;
    }
    if (status === "authenticated") {
      if (role === "admin") { router.replace("/admin"); return; }
      if (role === "clinic_staff") { router.replace("/clinic-staff"); return; }
      if (!enabledTracks.includes("ocular")) { router.replace("/no-tracks"); return; }
    }
  }, [status, role, enabledTracks, router]);

  if ((status === "idle" || status === "loading") && !isClientDemoMode()) {
    return <div className="min-h-screen bg-teal-50" />;
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  const renderNav = () => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== "/ocular/orders" && pathname.startsWith(item.href));
        const isOrderHistory = item.href === "/ocular/orders";
        const orderHistoryActive = isOrderHistory && pathname === "/ocular/orders";
        const isActive = isOrderHistory ? orderHistoryActive : active;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={[
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
              isActive
                ? "bg-teal-600 text-white shadow-sm active:bg-teal-700"
                : "text-teal-800 hover:bg-teal-100 active:bg-teal-200",
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
    <div className="min-h-screen bg-teal-50 flex flex-col">
      {/* Top bar */}
      <header className="h-16 bg-white border-b border-teal-100 flex items-center px-4 gap-3 shrink-0 shadow-sm sticky top-0 z-20">
        <button
          className="lg:hidden p-2 rounded-md text-teal-700 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Eye className="w-6 h-6 text-teal-600" />
          <span className="font-bold text-teal-900 text-lg">Ocular Products</span>
        </div>
        <div className="flex-1" />
        <span className="hidden sm:block text-sm text-teal-700 font-medium truncate max-w-xs">
          {provider?.clinicName ?? "Provider Portal"}
        </span>
        <button
          onClick={() => { void handleSignOut(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-teal-100 shrink-0 relative z-10 sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-4 py-4 border-b border-teal-50">
            <p className="text-xs font-semibold text-teal-500 uppercase tracking-wider">Navigation</p>
          </div>
          {renderNav()}
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-4 border-b border-teal-100">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-teal-600" />
                  <span className="font-bold text-teal-900">Ocular Products</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-md text-teal-600 hover:bg-teal-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {renderNav()}
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
