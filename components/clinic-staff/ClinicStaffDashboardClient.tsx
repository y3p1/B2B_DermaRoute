"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Package,
  ClipboardCheck,
  FileText,
  Box,
  Factory,
  UserPlus,
  X,
  ChevronRight,
  FolderOpen,
  ArrowRightLeft,
  RefreshCw,
  Activity,
  BarChart3,
  ScrollText,
  Shield,
  Users,
} from "lucide-react";

import { useAuthStore } from "@/store/auth";
import { supabase } from "@/lib/supabaseClient";
import { apiGet } from "@/lib/apiClient";
import { isClientDemoMode } from "@/lib/demoMode";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import BaaProvidersEmbeddedClient from "@/components/admin/baa-providers/BaaProvidersEmbeddedClient";
import BvVerificationModal from "@/components/clinic-staff/BvVerificationModal";
import { ProductsManagementTab } from "@/components/clinic-staff/ProductsManagementTab";
import { ManufacturersManagementTab } from "@/components/clinic-staff/ManufacturersManagementTab";
import { InsurancesManagementTab } from "@/components/clinic-staff/InsurancesManagementTab";
import { BvFormsManagementTab } from "@/components/clinic-staff/BvFormsManagementTab";
import { InsuranceRoutingTab } from "@/components/clinic-staff/InsuranceRoutingTab";
import { ReorderTrackingTab } from "@/components/clinic-staff/ReorderTrackingTab";
import { HealingTrackerTab } from "@/components/clinic-staff/HealingTrackerTab";
import { AnalyticsTab } from "@/components/clinic-staff/AnalyticsTab";
import { AuditLogsTab } from "@/components/clinic-staff/AuditLogsTab";
import { PolicyTrackerTab } from "@/components/clinic-staff/PolicyTrackerTab";
import { ItsRepresentativesTab } from "@/components/clinic-staff/ItsRepresentativesTab";
import ProductOrderDataTable from "@/components/dashboard/ProductOrderDataTable";
import EnhancedOrderModal from "@/components/dashboard/EnhancedOrderModal";
import ViewProductOrderModal from "@/components/dashboard/ViewProductOrderModal";
import type { ProductOrderRow } from "@/components/dashboard/productOrderColumns";

type TabKey =
  | "product_orders"
  | "bv_requests"
  | "reorder_log"
  | "healing_tracker"
  | "baa_agreements"
  | "products"
  | "manufacturers"
  | "insurances"
  | "bv_forms"
  | "insurance_routing"
  | "analytics"
  | "audit_logs"
  | "policy_tracker"
  | "its_representatives";

type BvRequestRow = {
  id: string;
  createdAt: string | null;
  status: string;
  provider: string | null;
  practice: string | null;
  woundSize: string | null;
  placeOfService: string | null;
  insurance: string | null;
  woundType: string | null;
  woundLocation: string | null;
  applicationDate: string | null;
  deliveryDate: string | null;
  proofStatus: string | null;
  initials: string | null;
};

function roleLabel(role: string | null) {
  if (role === "admin") return "Admin";
  if (role === "clinic_staff") return "Clinic Staff";
  return "";
}

interface SidebarNavItemProps {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active: boolean;
  onClick: () => void;
  collapsed?: boolean;
}

function SidebarNavItem({
  icon,
  label,
  badge,
  active,
  onClick,
  collapsed,
}: SidebarNavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <span
        className={`shrink-0 w-5 h-5 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-700"}`}
      >
        {icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{label}</span>
          {typeof badge === "number" ? (
            <span
              className={`inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-semibold ${
                active
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {badge}
            </span>
          ) : null}
        </>
      )}
      {collapsed && typeof badge === "number" ? (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
      ) : null}
    </button>
  );
}

interface ClinicStaffDashboardClientProps {
  titleOverride?: string | null;
}

export default function ClinicStaffDashboardClient({
  titleOverride = null,
}: ClinicStaffDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.role);
  const token = useAuthStore((s) => s.jwt);

  const [tab, setTab] = React.useState<TabKey>("product_orders");
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [bvRequests, setBvRequests] = React.useState<BvRequestRow[]>([]);
  const [bvLoading, setBvLoading] = React.useState(false);
  const [bvError, setBvError] = React.useState<string | null>(null);
  const [verifyModalOpen, setVerifyModalOpen] = React.useState(false);
  const [selectedBvId, setSelectedBvId] = React.useState<string | null>(null);
  const [bvSearchQuery, setBvSearchQuery] = React.useState("");
  const [bvDateFilter, setBvDateFilter] = React.useState("");
  const [bvCurrentPage, setBvCurrentPage] = React.useState(1);
  const bvItemsPerPage = 10;

  // Product Orders state
  const [productOrders, setProductOrders] = React.useState<ProductOrderRow[]>(
    [],
  );
  const [productOrdersLoading, setProductOrdersLoading] = React.useState(false);
  const [productOrdersError, setProductOrdersError] = React.useState<
    string | null
  >(null);
  const [productOrderModalOpen, setProductOrderModalOpen] =
    React.useState(false);
  const [viewProductOrderModalOpen, setViewProductOrderModalOpen] =
    React.useState(false);
  const [selectedProductOrderId, setSelectedProductOrderId] = React.useState<
    string | null
  >(null);

  const refreshBvRequests = React.useCallback(async () => {
    setBvLoading(true);
    setBvError(null);
    try {
      if (!token) {
        setBvError("Please sign in again.");
        return;
      }

      const res = await apiGet<{ success: true; data: BvRequestRow[] }>(
        "/api/bv-requests",
        { token },
      );
      setBvRequests(res.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load BV requests";
      setBvError(message);
    } finally {
      setBvLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (
      requestedTab === "product_orders" ||
      requestedTab === "bv_requests" ||
      requestedTab === "reorder_log" ||
      requestedTab === "healing_tracker" ||
      requestedTab === "baa_agreements" ||
      requestedTab === "products" ||
      requestedTab === "manufacturers" ||
      requestedTab === "insurances" ||
      requestedTab === "bv_forms" ||
      requestedTab === "insurance_routing" ||
      requestedTab === "analytics" ||
      requestedTab === "audit_logs" ||
      requestedTab === "policy_tracker" ||
      requestedTab === "its_representatives"
    ) {
      setTab(requestedTab);
    }
  }, [searchParams]);

  const refreshProductOrders = React.useCallback(async () => {
    setProductOrdersLoading(true);
    setProductOrdersError(null);
    try {
      if (!token) {
        setProductOrdersError("Please sign in again.");
        return;
      }

      const res = await apiGet<{ success: true; data: ProductOrderRow[] }>(
        "/api/order-products",
        { token },
      );
      setProductOrders(res.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load product orders";
      setProductOrdersError(message);
    } finally {
      setProductOrdersLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (isClientDemoMode()) return;
    if (status === "unauthenticated") router.replace("/auth");
  }, [router, status]);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    if (role !== "admin" && role !== "clinic_staff") router.replace("/");
  }, [role, router, status]);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    void refreshBvRequests();
    void refreshProductOrders();
  }, [status, refreshBvRequests, refreshProductOrders]);

  React.useEffect(() => {
    if (status !== "authenticated" || !token) return;

    // We subscribe to Supabase Realtime to keep the dashboard instantly synchronized.
    // Ensure `bv_requests` and `order_products` are added to the supabase_realtime publication
    // in the Supabase Dashboard -> Database -> Publications.
    const channel = supabase
      .channel("clinic-staff-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bv_requests" },
        () => {
          void refreshBvRequests();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_products" },
        () => {
          void refreshProductOrders();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Supabase Realtime connected securely for dashboard");
        }
      });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshBvRequests();
        void refreshProductOrders();
      }
    };

    const handleWindowFocus = () => {
      void refreshBvRequests();
      void refreshProductOrders();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [status, token, refreshBvRequests, refreshProductOrders]);

  if (status === "idle" || status === "loading") {
    return <div className="min-h-screen bg-[#F8F9FB]" />;
  }

  const titleRole = titleOverride ?? roleLabel(role);

  const navItems = [
    {
      key: "product_orders" as TabKey,
      label: "Product Orders",
      icon: <Package className="w-5 h-5" />,
      badge: productOrders.length,
    },
    {
      key: "bv_requests" as TabKey,
      label: "BV Requests",
      icon: <ClipboardCheck className="w-5 h-5" />,
      badge: bvRequests.filter((r) => r.status === "pending").length,
    },
    {
      key: "reorder_log" as TabKey,
      label: "Re-Order Tracking",
      icon: <RefreshCw className="w-5 h-5" />,
    },
    {
      key: "healing_tracker" as TabKey,
      label: "Healing Tracker",
      icon: <Activity className="w-5 h-5" />,
    },
    {
      key: "baa_agreements" as TabKey,
      label: "BAA Provider Agreements",
      icon: <FileText className="w-5 h-5" />,
    },
    ...(role === "admin" ? [
      {
        key: "products" as TabKey,
        label: "Products Management",
        icon: <Box className="w-5 h-5" />,
      },
      {
        key: "manufacturers" as TabKey,
        label: "Manufacturers",
        icon: <Factory className="w-5 h-5" />,
      },
      {
        key: "insurances" as TabKey,
        label: "Insurances",
        icon: <FileText className="w-5 h-5" />,
      },
      {
        key: "bv_forms" as TabKey,
        label: "BV Form Management",
        icon: <FolderOpen className="w-5 h-5" />,
      },
      {
        key: "insurance_routing" as TabKey,
        label: "Insurance Routing",
        icon: <ArrowRightLeft className="w-5 h-5" />,
      },
      {
        key: "analytics" as TabKey,
        label: "Analytics",
        icon: <BarChart3 className="w-5 h-5" />,
      },
      {
        key: "audit_logs" as TabKey,
        label: "Audit Logs",
        icon: <ScrollText className="w-5 h-5" />,
      },
      {
        key: "policy_tracker" as TabKey,
        label: "Policy Tracker",
        icon: <Shield className="w-5 h-5" />,
      },
      {
        key: "its_representatives" as TabKey,
        label: "ITS Representatives",
        icon: <Users className="w-5 h-5" />,
      },
    ] : []),
  ];

  const activeItem = navItems.find((n) => n.key === tab);

  const renderSidebar = (onClose?: () => void) => (
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {titleRole || "Dashboard"}
          </p>
          <p className="text-sm font-bold text-slate-800 mt-0.5">Navigation</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            badge={item.badge}
            active={tab === item.key}
            onClick={() => {
              setTab(item.key);
              onClose?.();
            }}
          />
        ))}
      </nav>

      {/* Bottom actions */}
      {role === "admin" && (
        <div className="px-3 py-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => {
              router.push("/admin/users/new");
              onClose?.();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <UserPlus className="w-5 h-5 shrink-0" />
            <span>Create Admin Account</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <DashboardNavbar onMenuToggle={() => setSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 sticky top-18 h-[calc(100vh-72px)] overflow-y-auto">
          {renderSidebar()}
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer */}
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
              {renderSidebar(() => setSidebarOpen(false))}
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            {/* Page header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <span>{titleRole || "Dashboard"}</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-slate-600 font-medium">
                    {activeItem?.label ?? ""}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-[#18192B]">
                  {activeItem?.label ?? "Dashboard"}
                </h1>
              </div>

              {/* Notification bell and badge hidden for future implementation (March 2026) */}
              {/**
              <div className="relative">
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"
                  aria-label={
                    notificationCount > 0
                      ? `Notifications (${notificationCount})`
                      : "Notifications"
                  }
                >
                  <Bell className="w-5 h-5 text-slate-600" />
                </button>
                {notificationCount > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                ) : null}
              </div>
              */}
            </div>

            {/* Tab content */}
            {tab === "product_orders" ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div>
                    <div className="text-base font-semibold text-[#18192B]">
                      Product Orders
                    </div>
                    <div className="text-sm text-slate-500">
                      Manage product orders linked to approved BV requests
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 sm:shrink-0">
                    <button
                      type="button"
                      onClick={refreshProductOrders}
                      disabled={productOrdersLoading}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Refresh
                    </button>
                    {role !== "admin" && (
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => setProductOrderModalOpen(true)}
                          disabled={!bvRequests.some(r => r.status === "approved" && r.proofStatus === "verified")}
                          className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                            bvRequests.some(r => r.status === "approved" && r.proofStatus === "verified")
                              ? "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              : "bg-blue-600 opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <Package className="w-4 h-4" />
                          Create Product Order
                        </button>
                        {!bvRequests.some(r => r.status === "approved" && r.proofStatus === "verified") && (
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white text-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10">
                            You need at least one approved BV request with verified manufacturer proof before you can order products
                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {productOrdersError && (
                  <div className="bg-red-50 rounded-lg p-3 text-sm text-red-600 mb-4 border border-red-100">
                    {productOrdersError}
                  </div>
                )}

                <ProductOrderDataTable
                  rows={productOrders}
                  loading={productOrdersLoading}
                  onView={(id) => {
                    setSelectedProductOrderId(id);
                    setViewProductOrderModalOpen(true);
                  }}
                />
              </div>
            ) : null}

            {tab === "bv_requests" ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-base font-semibold text-[#18192B]">
                      Benefits Verification Requests
                    </div>
                    <div className="text-sm text-slate-500">
                      Medicare Standard covers all products automatically. These
                      requests are for Medicare Advantage and Commercial plans
                      requiring manual verification.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={refreshBvRequests}
                    disabled={bvLoading}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    Refresh
                  </button>
                </div>

                {bvError && (
                  <div className="bg-red-50 rounded-lg p-3 text-sm text-red-600 mb-4 border border-red-100">
                    {bvError}
                  </div>
                )}

                <div className="text-sm text-slate-500 mb-3">
                  {bvLoading
                    ? "Loading…"
                    : `${(() => {
                        const filtered = bvRequests.filter(
                          (r) => {
                            const matchesSearch = !bvSearchQuery ||
                              (r.practice ?? "").toLowerCase().includes(bvSearchQuery.toLowerCase()) ||
                              (r.insurance ?? "").toLowerCase().includes(bvSearchQuery.toLowerCase()) ||
                              (r.placeOfService ?? "").toLowerCase().includes(bvSearchQuery.toLowerCase()) ||
                              (r.woundType ?? "").toLowerCase().includes(bvSearchQuery.toLowerCase()) ||
                              r.status.toLowerCase().includes(bvSearchQuery.toLowerCase());
                            
                            const matchesDate = !bvDateFilter || (r.createdAt && r.createdAt.startsWith(bvDateFilter));
                            
                            return matchesSearch && matchesDate;
                          },
                        );
                        return filtered.length;
                      })()} record(s)`}
                </div>

                <div className="w-full">
                  <div className="flex items-center pb-4">
                    <input
                      type="text"
                      placeholder="Search clinic name..."
                      value={bvSearchQuery}
                      onChange={(e) => {
                        setBvSearchQuery(e.target.value);
                        setBvCurrentPage(1);
                      }}
                      className="max-w-sm px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm font-medium text-slate-600">Filter by Date:</span>
                      <input
                        type="date"
                        value={bvDateFilter}
                        onChange={(e) => {
                          setBvDateFilter(e.target.value);
                          setBvCurrentPage(1);
                        }}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      {bvDateFilter && (
                        <button
                          onClick={() => {
                            setBvDateFilter("");
                            setBvCurrentPage(1);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    {bvLoading ? (
                      <div className="p-8 text-center text-slate-500">
                        Loading BV requests...
                      </div>
                    ) : (
                      (() => {
                        const filtered = bvRequests.filter((r) => {
                          const matchesSearch = !bvSearchQuery ||
                            (r.practice ?? "").toLowerCase().includes(bvSearchQuery.toLowerCase()) ||
                            (r.insurance ?? "").toLowerCase().includes(bvSearchQuery.toLowerCase()) ||
                            (r.placeOfService ?? "").toLowerCase().includes(bvSearchQuery.toLowerCase()) ||
                            (r.woundType ?? "").toLowerCase().includes(bvSearchQuery.toLowerCase()) ||
                            r.status.toLowerCase().includes(bvSearchQuery.toLowerCase());
                          
                          const matchesDate = !bvDateFilter || (r.createdAt && r.createdAt.startsWith(bvDateFilter));
                          
                          return matchesSearch && matchesDate;
                        });
                        const startIdx = (bvCurrentPage - 1) * bvItemsPerPage;
                        const endIdx = startIdx + bvItemsPerPage;
                        const paginatedRequests = filtered.slice(
                          startIdx,
                          endIdx,
                        );

                        return (
                          <>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-[#18192B] text-white text-left">
                                    <th className="py-3 px-4 font-medium">
                                      Date
                                    </th>
                                    <th className="py-3 px-4 font-medium">
                                      Clinic Name
                                    </th>
                                    <th className="py-3 px-4 font-medium">
                                      Place of Service
                                    </th>
                                    <th className="py-3 px-4 font-medium">
                                      Patient Initials
                                    </th>
                                    <th className="py-3 px-4 font-medium hidden sm:table-cell">
                                      Insurance
                                    </th>
                                    <th className="py-3 px-4 font-medium hidden md:table-cell">
                                      Wound Location
                                    </th>
                                    <th className="py-3 px-4 font-medium">
                                      Status
                                    </th>
                                    <th className="py-3 px-4 font-medium">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paginatedRequests.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={8}
                                        className="h-24 text-center text-slate-500"
                                      >
                                        No results.
                                      </td>
                                    </tr>
                                  ) : (
                                    paginatedRequests.map((request, idx) => (
                                      <tr
                                        key={request.id}
                                        className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-blue-50/40 transition-colors`}
                                      >
                                        <td className="py-4 px-4 text-sm text-slate-600">
                                          {request.createdAt ? String(request.createdAt).slice(0, 10) : "N/A"}
                                        </td>
                                        <td className="py-4 px-4 font-semibold">
                                          {request.practice ?? "N/A"}
                                        </td>
                                        <td className="py-4 px-4 font-semibold">
                                          {request.placeOfService ?? "N/A"}
                                        </td>
                                        <td className="py-4 px-4">
                                          {request.initials ?? "N/A"}
                                        </td>
                                        <td className="py-4 px-4 hidden sm:table-cell">
                                          {request.insurance ?? "N/A"}
                                        </td>
                                        <td className="py-4 px-4 hidden md:table-cell">
                                          {request.woundLocation ?? "N/A"}
                                        </td>
                                        <td className="py-4 px-4">
                                          <span
                                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                                              request.status === "pending"
                                                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                                : request.status === "approved"
                                                  ? "bg-green-100 text-green-800 border border-green-200"
                                                  : request.status ===
                                                      "rejected"
                                                    ? "bg-red-100 text-red-800 border border-red-200"
                                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                            }`}
                                          >
                                            {request.status}
                                          </span>
                                        </td>
                                        <td className="py-4 px-4">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedBvId(request.id);
                                              setVerifyModalOpen(true);
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                          >
                                            View
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </>
                        );
                      })()
                    )}
                  </div>

                  <div className="flex items-center justify-end space-x-2 py-4">
                    <button
                      type="button"
                      onClick={() =>
                        setBvCurrentPage((p) => Math.max(1, p - 1))
                      }
                      disabled={
                        bvCurrentPage === 1 ||
                        bvRequests.filter(
                          (r) =>
                            !bvSearchQuery ||
                            (r.practice ?? "")
                              .toLowerCase()
                              .includes(bvSearchQuery.toLowerCase()) ||
                            (r.insurance ?? "")
                              .toLowerCase()
                              .includes(bvSearchQuery.toLowerCase()) ||
                            (r.placeOfService ?? "")
                              .toLowerCase()
                              .includes(bvSearchQuery.toLowerCase()) ||
                            (r.woundType ?? "")
                              .toLowerCase()
                              .includes(bvSearchQuery.toLowerCase()) ||
                            r.status
                              .toLowerCase()
                              .includes(bvSearchQuery.toLowerCase()),
                        ).length === 0
                      }
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setBvCurrentPage((p) => p + 1)}
                      disabled={
                        bvCurrentPage >=
                          Math.ceil(
                            bvRequests.filter(
                              (r) =>
                                !bvSearchQuery ||
                                (r.practice ?? "")
                                  .toLowerCase()
                                  .includes(bvSearchQuery.toLowerCase()) ||
                                (r.insurance ?? "")
                                  .toLowerCase()
                                  .includes(bvSearchQuery.toLowerCase()) ||
                                (r.placeOfService ?? "")
                                  .toLowerCase()
                                  .includes(bvSearchQuery.toLowerCase()) ||
                                (r.woundType ?? "")
                                  .toLowerCase()
                                  .includes(bvSearchQuery.toLowerCase()) ||
                                r.status
                                  .toLowerCase()
                                  .includes(bvSearchQuery.toLowerCase()),
                            ).length / bvItemsPerPage,
                          ) ||
                        bvRequests.filter(
                          (r) =>
                            !bvSearchQuery ||
                            (r.practice ?? "")
                              .toLowerCase()
                              .includes(bvSearchQuery.toLowerCase()) ||
                            (r.insurance ?? "")
                              .toLowerCase()
                              .includes(bvSearchQuery.toLowerCase()) ||
                            (r.placeOfService ?? "")
                              .toLowerCase()
                              .includes(bvSearchQuery.toLowerCase()) ||
                            (r.woundType ?? "")
                              .toLowerCase()
                              .includes(bvSearchQuery.toLowerCase()) ||
                            r.status
                              .toLowerCase()
                              .includes(bvSearchQuery.toLowerCase()),
                        ).length === 0
                      }
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "reorder_log" ? (
              <ReorderTrackingTab role={role as "admin" | "clinic_staff"} />
            ) : null}

            {tab === "healing_tracker" ? (
              <HealingTrackerTab />
            ) : null}

            {tab === "baa_agreements" ? (
              <BaaProvidersEmbeddedClient basePath="/clinic-staff/baa-providers" />
            ) : null}

            {tab === "products" ? <ProductsManagementTab /> : null}

            {tab === "manufacturers" ? <ManufacturersManagementTab /> : null}

            {tab === "insurances" ? <InsurancesManagementTab /> : null}

            {tab === "bv_forms" ? <BvFormsManagementTab /> : null}

            {tab === "insurance_routing" ? <InsuranceRoutingTab /> : null}

            {tab === "analytics" ? <AnalyticsTab /> : null}

            {tab === "audit_logs" ? <AuditLogsTab /> : null}

            {tab === "policy_tracker" ? <PolicyTrackerTab /> : null}

            {tab === "its_representatives" ? <ItsRepresentativesTab /> : null}
          </div>
        </main>
      </div>

      <BvVerificationModal
        open={verifyModalOpen}
        onOpenChange={setVerifyModalOpen}
        id={selectedBvId ?? undefined}
        onVerified={() => {
          void refreshBvRequests();
          setVerifyModalOpen(false);
        }}
        onSwitchToProductOrdersTab={() => setTab("product_orders")}
      />

      {productOrderModalOpen && (
        <EnhancedOrderModal
          open={productOrderModalOpen}
          onOpenChange={setProductOrderModalOpen}
          onCreated={() => {
            void refreshProductOrders();
            setProductOrderModalOpen(false);
          }}
        />
      )}

      <ViewProductOrderModal
        open={viewProductOrderModalOpen}
        onOpenChange={setViewProductOrderModalOpen}
        orderId={selectedProductOrderId}
        onDeleted={() => {
          void refreshProductOrders();
          setViewProductOrderModalOpen(false);
          setSelectedProductOrderId(null);
        }}
        onStatusUpdated={() => {
          void refreshProductOrders();
        }}
      />
    </div>
  );
}
