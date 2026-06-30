"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardCheck,
  Package,
  FileText,
  X,
  ChevronRight,
  Wind,
  Eye,
} from "lucide-react";

import { useAuthStore } from "@/store/auth";
import { supabase } from "@/lib/supabaseClient";
import { apiGet } from "@/lib/apiClient";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import BVModal from "@/components/dashboard/BvModal";
import BvDataTable from "@/components/dashboard/BvDataTable";
import BvDetailModal from "@/components/dashboard/BvDetailModal";
import type { BVFormData } from "@/components/dashboard/BvModal";
import ViewProductOrderModal from "@/components/dashboard/ViewProductOrderModal";
import EnhancedOrderModal from "@/components/dashboard/EnhancedOrderModal";
import { LymphedemaOrderModal } from "@/components/dashboard/LymphedemaOrderModal";
import { LymphedemaOrderPdfButton } from "@/components/dashboard/LymphedemaOrderPdf";
import type { ProductOrderRow } from "@/components/dashboard/productOrderColumns";

type TabKey = "bv_requests" | "order_products" | "baa_agreements" | "lymphedema_orders" | "ocular_orders";

type LymphedemaOrderRow = {
  id: string;
  status: string;
  insurance: string | null;
  device: string | null;
  extremity: string[] | null;
  createdAt: string | null;
  submittedAt: string | null;
};

type OcularOrderRow = {
  id: string;
  status: string;
  patient: { firstName?: string; lastName?: string } | null;
  productVariant: string | null;
  sizeMm: number | null;
  sku: string | null;
  quantity: number | null;
  createdAt: string | null;
};

type BvRequestRow = {
  id: string;
  createdAt: string | null;
  status: string;
  provider: string | null;
  practice: string | null;
  woundSize: string | null;
  applicationDate: string | null;
  deliveryDate: string | null;
  proofStatus: string | null;
  approvalProofUrl: string | null;
  initials: string | null;
  placeOfService: string | null;
  insurance: string | null;
  woundType: string | null;
  woundLocation: string | null;
};

type BaaAgreementRow = {
  id: string;
  createdAt: string | null;
  status: string;
  clinicName: string | null;
  providerEmail: string | null;
  coveredEntity: string;
  coveredEntityName: string;
  businessAssociateName: string | null;
};

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
          ? "bg-primary text-white shadow-sm"
          : "text-white/65 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span
        className={`shrink-0 w-5 h-5 ${active ? "text-white" : "text-white/50 group-hover:text-white/90"}`}
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
                  : "bg-white/15 text-white"
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

export default function ProviderDashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.role);
  const token = useAuthStore((s) => s.jwt);
  const enabledTracks = useAuthStore((s) => s.enabledTracks);

  const defaultTab = (tracks: string[]): TabKey => {
    if (tracks.includes("wound_care")) return "bv_requests";
    if (tracks.includes("lymphedema")) return "lymphedema_orders";
    if (tracks.includes("ocular")) return "ocular_orders";
    return "baa_agreements";
  };

  const [tab, setTab] = React.useState<TabKey>(() => defaultTab(enabledTracks));
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // BV Requests state
  const [bvRequests, setBvRequests] = React.useState<BvRequestRow[]>([]);
  const [bvLoading, setBvLoading] = React.useState(false);
  const [bvError, setBvError] = React.useState<string | null>(null);
  const [bvSearchQuery, setBvSearchQuery] = React.useState("");
  const [bvDateFilter, setBvDateFilter] = React.useState("");
  const [bvCurrentPage, setBvCurrentPage] = React.useState(1);
  const bvItemsPerPage = 10;
  const [selectedBvId, setSelectedBvId] = React.useState<string | null>(null);
  const [createBvModalOpen, setCreateBvModalOpen] = React.useState(false);
  const [bvDetailOpen, setBvDetailOpen] = React.useState(false);
  const [detailEdit, setDetailEdit] = React.useState(false);
  const [detailInitialData, setDetailInitialData] = React.useState<BVFormData | null>(null);

  // Product Orders state
  const [productOrders, setProductOrders] = React.useState<ProductOrderRow[]>(
    [],
  );
  const [productOrdersLoading, setProductOrdersLoading] = React.useState(false);
  const [productOrdersError, setProductOrdersError] = React.useState<
    string | null
  >(null);
  const [productOrderSearchQuery, setProductOrderSearchQuery] =
    React.useState("");
  const [productOrderCurrentPage, setProductOrderCurrentPage] =
    React.useState(1);
  const productOrderItemsPerPage = 10;
  const [selectedProductOrderId, setSelectedProductOrderId] = React.useState<
    string | null
  >(null);
  const [viewProductOrderModalOpen, setViewProductOrderModalOpen] =
    React.useState(false);
  const [productOrderModalOpen, setProductOrderModalOpen] =
    React.useState(false);

  // BAA Agreements state
  const [baaAgreements, setBaaAgreements] = React.useState<BaaAgreementRow[]>(
    [],
  );
  const [baaLoading, setBaaLoading] = React.useState(false);
  const [baaError, setBaaError] = React.useState<string | null>(null);
  const [baaSearchQuery, setBaaSearchQuery] = React.useState("");
  const [baaCurrentPage, setBaaCurrentPage] = React.useState(1);
  const baaItemsPerPage = 10;

  // Lymphedema Orders state
  const [lymphedemaOrders, setLymphedemaOrders] = React.useState<LymphedemaOrderRow[]>([]);
  const [lymphedemaLoading, setLymphedemaLoading] = React.useState(false);
  const [lymphedemaError, setLymphedemaError] = React.useState<string | null>(null);
  const [lymphedemaModalOpen, setLymphedemaModalOpen] = React.useState(false);

  // Ocular Orders state
  const [ocularOrders, setOcularOrders] = React.useState<OcularOrderRow[]>([]);
  const [ocularLoading, setOcularLoading] = React.useState(false);
  const [ocularError, setOcularError] = React.useState<string | null>(null);

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
      setBvError(
        err instanceof Error ? err.message : "Failed to load BV requests",
      );
    } finally {
      setBvLoading(false);
    }
  }, [token]);

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
      setProductOrdersError(
        err instanceof Error ? err.message : "Failed to load product orders",
      );
    } finally {
      setProductOrdersLoading(false);
    }
  }, [token]);

  const refreshBaaAgreements = React.useCallback(async () => {
    setBaaLoading(true);
    setBaaError(null);
    try {
      if (!token) {
        setBaaError("Please sign in again.");
        return;
      }
      const res = await apiGet<{ success: true; data: BaaAgreementRow[] }>(
        "/api/baa-providers",
        { token },
      );
      setBaaAgreements(res.data);
    } catch (err) {
      setBaaError(
        err instanceof Error ? err.message : "Failed to load BAA agreements",
      );
    } finally {
      setBaaLoading(false);
    }
  }, [token]);

  const refreshLymphedemaOrders = React.useCallback(async () => {
    setLymphedemaLoading(true);
    setLymphedemaError(null);
    try {
      if (!token) { setLymphedemaError("Please sign in again."); return; }
      const res = await apiGet<{ success: true; data: LymphedemaOrderRow[] }>(
        "/api/lymphedema-orders",
        { token },
      );
      setLymphedemaOrders(res.data);
    } catch (err) {
      setLymphedemaError(err instanceof Error ? err.message : "Failed to load lymphedema orders");
    } finally {
      setLymphedemaLoading(false);
    }
  }, [token]);

  const refreshOcularOrders = React.useCallback(async () => {
    setOcularLoading(true);
    setOcularError(null);
    try {
      if (!token) { setOcularError("Please sign in again."); return; }
      const res = await apiGet<{ success: true; data: OcularOrderRow[] }>(
        "/api/ocular/orders",
        { token },
      );
      setOcularOrders(res.data);
    } catch (err) {
      setOcularError(err instanceof Error ? err.message : "Failed to load ocular orders");
    } finally {
      setOcularLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (
      requestedTab === "bv_requests" ||
      requestedTab === "order_products" ||
      requestedTab === "baa_agreements" ||
      requestedTab === "lymphedema_orders" ||
      requestedTab === "ocular_orders"
    ) {
      setTab(requestedTab as TabKey);
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth");
  }, [router, status]);

  React.useEffect(() => {
    if (status === "authenticated" && enabledTracks.length > 0) {
      setTab((current) => {
        const isWoundTab = current === "bv_requests" || current === "order_products";
        if (isWoundTab && !enabledTracks.includes("wound_care")) return defaultTab(enabledTracks);
        if (current === "lymphedema_orders" && !enabledTracks.includes("lymphedema")) return defaultTab(enabledTracks);
        if (current === "ocular_orders" && !enabledTracks.includes("ocular")) return defaultTab(enabledTracks);
        return current;
      });
    }
  }, [status, enabledTracks]);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    if (role === "admin") {
      router.replace("/admin");
    } else if (role === "clinic_staff") {
      router.replace("/clinic-staff");
    }
  }, [status, role, router]);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    if (enabledTracks.includes("wound_care")) {
      void refreshBvRequests();
      void refreshProductOrders();
    }
    void refreshBaaAgreements();
    if (enabledTracks.includes("lymphedema")) void refreshLymphedemaOrders();
    if (enabledTracks.includes("ocular")) void refreshOcularOrders();

    const channel = supabase
      .channel("provider-dashboard")
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status, enabledTracks, refreshBvRequests, refreshProductOrders, refreshBaaAgreements, refreshLymphedemaOrders, refreshOcularOrders]);

  if (status === "idle" || status === "loading") {
    return <div className="min-h-screen bg-slate-50" />;
  }

  const navItems = [
    ...(enabledTracks.includes("wound_care") ? [
      {
        key: "bv_requests" as TabKey,
        label: "BV Requests",
        icon: <ClipboardCheck className="w-5 h-5" />,
        badge: bvRequests.length,
      },
      {
        key: "order_products" as TabKey,
        label: "Order Products",
        icon: <Package className="w-5 h-5" />,
        badge: productOrders.length,
      },
    ] : []),
    ...(enabledTracks.includes("lymphedema") ? [{
      key: "lymphedema_orders" as TabKey,
      label: "Medical Devices / Equipment",
      icon: <Wind className="w-5 h-5" />,
      badge: lymphedemaOrders.length,
    }] : []),
    ...(enabledTracks.includes("ocular") ? [{
      key: "ocular_orders" as TabKey,
      label: "Ocular",
      icon: <Eye className="w-5 h-5" />,
      badge: ocularOrders.length,
    }] : []),
    {
      key: "baa_agreements" as TabKey,
      label: "BAA Provider Agreements",
      icon: <FileText className="w-5 h-5" />,
    },
  ];

  const activeItem = navItems.find((n) => n.key === tab);

  const renderSidebar = (onClose?: () => void) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <div>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            Provider
          </p>
          <p className="text-sm font-bold text-white mt-0.5">Navigation</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

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
    </div>
  );

  // BV requests filtered list helpers
  const filteredBvRequests = bvRequests.filter((r) => {
    const matchesSearch =
      !bvSearchQuery ||
      (r.practice ?? "").toLowerCase().includes(bvSearchQuery.toLowerCase()) ||
      (r.provider ?? "").toLowerCase().includes(bvSearchQuery.toLowerCase()) ||
      r.status.toLowerCase().includes(bvSearchQuery.toLowerCase());

    const matchesDate = !bvDateFilter || (r.createdAt && r.createdAt.startsWith(bvDateFilter));

    return matchesSearch && matchesDate;
  });
  const _bvTotalPages = Math.ceil(filteredBvRequests.length / bvItemsPerPage);
  const _paginatedBvRequests = filteredBvRequests.slice(
    (bvCurrentPage - 1) * bvItemsPerPage,
    bvCurrentPage * bvItemsPerPage,
  );

  // Product orders filtered list helpers
  const filteredProductOrders = productOrders.filter(
    (r) =>
      !productOrderSearchQuery ||
      (r.practice ?? "")
        .toLowerCase()
        .includes(productOrderSearchQuery.toLowerCase()) ||
      (r.product ?? "")
        .toLowerCase()
        .includes(productOrderSearchQuery.toLowerCase()) ||
      r.status.toLowerCase().includes(productOrderSearchQuery.toLowerCase()),
  );
  const productOrderTotalPages = Math.ceil(
    filteredProductOrders.length / productOrderItemsPerPage,
  );
  const paginatedProductOrders = filteredProductOrders.slice(
    (productOrderCurrentPage - 1) * productOrderItemsPerPage,
    productOrderCurrentPage * productOrderItemsPerPage,
  );

  // BAA agreements filtered list helpers
  const filteredBaaAgreements = baaAgreements.filter(
    (r) =>
      !baaSearchQuery ||
      (r.clinicName ?? "")
        .toLowerCase()
        .includes(baaSearchQuery.toLowerCase()) ||
      r.status.toLowerCase().includes(baaSearchQuery.toLowerCase()),
  );
  const baaTotalPages = Math.ceil(
    filteredBaaAgreements.length / baaItemsPerPage,
  );
  const paginatedBaaAgreements = filteredBaaAgreements.slice(
    (baaCurrentPage - 1) * baaItemsPerPage,
    baaCurrentPage * baaItemsPerPage,
  );

  const isEligibleForOrdering = bvRequests.some(
    (r) => r.status === "approved" && r.proofStatus === "verified",
  );

  const statusBadge = (s: string) => {
    const cls =
      s === "approved" || s === "completed"
        ? "bg-green-100 text-green-800 border border-green-200"
        : s === "denied" || s === "cancelled" || s === "rejected"
          ? "bg-red-100 text-red-800 border border-red-200"
          : s === "shipped"
            ? "bg-blue-100 text-blue-800 border border-blue-200"
            : s === "signed"
              ? "bg-blue-100 text-blue-800 border border-blue-200"
              : "bg-yellow-100 text-yellow-800 border border-yellow-200";
    return (
      <span
        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${cls}`}
      >
        {s.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar onMenuToggle={() => setSidebarOpen(true)} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-brand-dark border-r border-white/10 shrink-0 h-full overflow-y-auto">
          {renderSidebar()}
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-brand-dark shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
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
                  <span>Provider</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-slate-600 font-medium">
                    {activeItem?.label ?? ""}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-brand-dark">
                  {activeItem?.label ?? "Dashboard"}
                </h1>
              </div>
            </div>

            {/* BV Requests Tab */}
            {tab === "bv_requests" ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-base font-semibold text-brand-dark">
                      BV Requests
                    </div>
                    <div className="text-sm text-slate-500">
                      View your benefits verification requests.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCreateBvModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-cta rounded-lg hover:bg-brand-cta-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-cta transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 5v14M5 12h14"
                        />
                      </svg>
                      New BV
                    </button>
                    <button
                      type="button"
                      onClick={refreshBvRequests}
                      disabled={bvLoading}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {bvError && (
                  <div className="bg-red-50 rounded-lg p-3 text-sm text-red-600 mb-4 border border-red-100">
                    {bvError}
                  </div>
                )}

                <div className="text-sm text-slate-500 mb-3">
                  {bvLoading
                    ? "Loading…"
                    : `${filteredBvRequests.length} record(s)`}
                </div>

                <div className="w-full">
                  <div className="flex items-center pb-4">
                    <input
                      type="text"
                      placeholder="Search practice..."
                      value={bvSearchQuery}
                      onChange={(e) => {
                        setBvSearchQuery(e.target.value);
                        setBvCurrentPage(1);
                      }}
                      className="max-w-sm px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
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
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      />
                      {bvDateFilter && (
                        <button
                          onClick={() => {
                            setBvDateFilter("");
                            setBvCurrentPage(1);
                          }}
                          className="text-xs text-primary hover:text-primary-dark font-medium"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden bg-white">
                    {bvLoading ? (
                      <div className="p-8 text-center text-slate-500">
                        Loading BV requests...
                      </div>
                    ) : (
                      <BvDataTable
                        rows={bvRequests}
                        loading={bvLoading}
                        onUploaded={refreshBvRequests}
                        onView={(id) => {
                          const row = bvRequests.find((r) => r.id === id) ?? null;
                          setDetailInitialData(
                            row
                              ? {
                                  provider: row.provider ?? undefined,
                                  placeOfService: undefined,
                                  insurance: undefined,
                                  woundType: undefined,
                                  woundSize: row.woundSize ?? undefined,
                                  woundLocation: undefined,
                                  icd10: undefined,
                                  initials: undefined,
                                  applicationDate: row.applicationDate ?? undefined,
                                  deliveryDate: row.deliveryDate ?? undefined,
                                  instructions: undefined,
                                }
                              : null,
                          );
                          setSelectedBvId(id);
                          setDetailEdit(false);
                          setBvDetailOpen(true);
                        }}
                        onEdit={(id) => {
                          const row = bvRequests.find((r) => r.id === id) ?? null;
                          setDetailInitialData(
                            row
                              ? {
                                  provider: row.provider ?? undefined,
                                  placeOfService: undefined,
                                  insurance: undefined,
                                  woundType: undefined,
                                  woundSize: row.woundSize ?? undefined,
                                  woundLocation: undefined,
                                  icd10: undefined,
                                  initials: undefined,
                                  applicationDate: row.applicationDate ?? undefined,
                                  deliveryDate: row.deliveryDate ?? undefined,
                                  instructions: undefined,
                                }
                              : null,
                          );
                          setSelectedBvId(id);
                          setDetailEdit(true);
                          setBvDetailOpen(true);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Order Products Tab */}
            {tab === "order_products" ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-base font-semibold text-brand-dark">
                      Order Products
                    </div>
                    <div className="text-sm text-slate-500">
                      View product orders linked to your BV requests.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => setProductOrderModalOpen(true)}
                        disabled={!isEligibleForOrdering}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-cta rounded-lg transition-colors ${
                          isEligibleForOrdering
                            ? "hover:bg-brand-cta-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-cta"
                            : "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 5v14M5 12h14"
                          />
                        </svg>
                        Create Product Order
                      </button>
                      {!isEligibleForOrdering && (
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white text-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                          You need at least one approved BV request with verified manufacturer proof before you
                          can order products
                          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={refreshProductOrders}
                      disabled={productOrdersLoading}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {productOrdersError && (
                  <div className="bg-red-50 rounded-lg p-3 text-sm text-red-600 mb-4 border border-red-100">
                    {productOrdersError}
                  </div>
                )}

                <div className="text-sm text-slate-500 mb-3">
                  {productOrdersLoading
                    ? "Loading…"
                    : `${filteredProductOrders.length} record(s)`}
                </div>

                <div className="w-full">
                  <div className="flex items-center pb-4">
                    <input
                      type="text"
                      placeholder="Search practice..."
                      value={productOrderSearchQuery}
                      onChange={(e) => {
                        setProductOrderSearchQuery(e.target.value);
                        setProductOrderCurrentPage(1);
                      }}
                      className="max-w-sm px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />
                  </div>

                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    {productOrdersLoading ? (
                      <div className="p-8 text-center text-slate-500">
                        Loading product orders...
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-brand-dark text-white text-left">
                                <th className="py-3 px-4 font-medium">Date</th>
                                <th className="py-3 px-4 font-medium">
                                  Practice
                                </th>
                                <th className="py-3 px-4 font-medium hidden sm:table-cell">
                                  Manufacturer
                                </th>
                                <th className="py-3 px-4 font-medium">
                                  Product
                                </th>
                                <th className="py-3 px-4 font-medium">
                                  Patient Initials
                                </th>
                                <th className="py-3 px-4 font-medium hidden md:table-cell">
                                  Size
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
                              {paginatedProductOrders.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={7}
                                    className="h-24 text-center text-slate-500"
                                  >
                                    No results.
                                  </td>
                                </tr>
                              ) : (
                                paginatedProductOrders.map((order, idx) => (
                                  <tr
                                    key={order.id}
                                    className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-primary/5 transition-colors`}
                                  >
                                    <td className="py-4 px-4">
                                      {order.createdAt
                                        ? String(order.createdAt).slice(0, 10)
                                        : "—"}
                                    </td>
                                    <td className="py-4 px-4 font-semibold">
                                      {order.practice ?? "N/A"}
                                    </td>
                                    <td className="py-4 px-4 hidden sm:table-cell">
                                      {order.manufacturer ?? "N/A"}
                                    </td>
                                    <td className="py-4 px-4">
                                      <span className="font-semibold">
                                        {order.product ?? "N/A"}
                                      </span>
                                      {order.productCode && (
                                        <div className="text-xs text-gray-500">
                                          {order.productCode}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-4 px-4 font-medium">
                                      {order.patientInitials ?? "N/A"}
                                    </td>
                                    <td className="py-4 px-4 hidden md:table-cell">
                                      {order.woundSize ?? "N/A"}
                                    </td>
                                    <td className="py-4 px-4">
                                      {statusBadge(order.status)}
                                    </td>
                                    <td className="py-4 px-4">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedProductOrderId(order.id);
                                          setViewProductOrderModalOpen(true);
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
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

                        <div className="flex items-center justify-end space-x-2 py-4 px-4">
                          <button
                            type="button"
                            onClick={() =>
                              setProductOrderCurrentPage((p) =>
                                Math.max(1, p - 1),
                              )
                            }
                            disabled={
                              productOrderCurrentPage === 1 ||
                              filteredProductOrders.length === 0
                            }
                            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setProductOrderCurrentPage((p) => p + 1)
                            }
                            disabled={
                              productOrderCurrentPage >=
                                productOrderTotalPages ||
                              filteredProductOrders.length === 0
                            }
                            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Lymphedema Orders Tab */}
            {tab === "lymphedema_orders" ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-brand-dark">Medical Devices / Equipment</div>
                    <div className="text-sm text-slate-500">Submit and track AIROS compression pump & garment orders.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { void refreshLymphedemaOrders(); }}
                      disabled={lymphedemaLoading}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={() => setLymphedemaModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-cta rounded-lg hover:bg-brand-cta-dark transition-colors"
                    >
                      <Wind className="w-4 h-4" />
                      New Order
                    </button>
                  </div>
                </div>

                {lymphedemaError && (
                  <div className="mx-5 mt-4 bg-red-50 rounded-lg p-3 text-sm text-red-600 border border-red-100">
                    {lymphedemaError}
                  </div>
                )}

                {lymphedemaLoading && lymphedemaOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">Loading…</div>
                ) : lymphedemaOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">No lymphedema orders yet. Click &quot;New Order&quot; to submit one.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-left">
                          <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                          <th className="px-4 py-3 font-medium text-slate-600">Insurance</th>
                          <th className="px-4 py-3 font-medium text-slate-600">Device</th>
                          <th className="px-4 py-3 font-medium text-slate-600">Extremity</th>
                          <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lymphedemaOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-slate-500 text-xs">
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{order.insurance ?? "—"}</td>
                            <td className="px-4 py-3 text-slate-600">{order.device ?? "—"}</td>
                            <td className="px-4 py-3 text-slate-600">{Array.isArray(order.extremity) ? order.extremity.join(", ") : "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                                order.status === "approved" || order.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : order.status === "shipped"
                                    ? "bg-blue-100 text-blue-800"
                                    : order.status === "denied" || order.status === "cancelled"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <LymphedemaOrderPdfButton orderId={order.id} token={token} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}

            {/* Ocular Orders Tab */}
            {tab === "ocular_orders" ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-brand-dark">Ocular</div>
                    <div className="text-sm text-slate-500">Submit and track VisiDisc® amniotic membrane orders.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { void refreshOcularOrders(); }}
                      disabled={ocularLoading}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/ocular/orders/new")}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      New Order
                    </button>
                  </div>
                </div>

                {ocularError && (
                  <div className="mx-5 mt-4 bg-red-50 rounded-lg p-3 text-sm text-red-600 border border-red-100">
                    {ocularError}
                  </div>
                )}

                {ocularLoading && ocularOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">Loading…</div>
                ) : ocularOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    No ocular orders yet.{" "}
                    <button onClick={() => router.push("/ocular/orders/new")} className="text-primary underline font-medium">
                      Place your first order
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-left">
                          <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                          <th className="px-4 py-3 font-medium text-slate-600">Patient</th>
                          <th className="px-4 py-3 font-medium text-slate-600">Product</th>
                          <th className="px-4 py-3 font-medium text-slate-600">Qty</th>
                          <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ocularOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-slate-500 text-xs">
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-700 font-medium">
                              {order.patient
                                ? [order.patient.firstName, order.patient.lastName].filter(Boolean).join(" ") || "—"
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {order.productVariant
                                ? `VisiDisc® ${order.productVariant.charAt(0).toUpperCase() + order.productVariant.slice(1)} ${order.sizeMm ? `${order.sizeMm}mm` : ""}`.trim()
                                : "—"}
                              {order.sku && <div className="text-xs text-slate-400 font-mono">{order.sku}</div>}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{order.quantity ?? "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                                order.status === "approved" || order.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : order.status === "shipped"
                                    ? "bg-blue-100 text-blue-800"
                                    : order.status === "denied" || order.status === "cancelled"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {order.status.replace(/_/g, " ")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}

            {/* BAA Provider Agreements Tab */}
            {tab === "baa_agreements" ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-base font-semibold text-brand-dark">
                      BAA Provider Agreements
                    </div>
                    <div className="text-sm text-slate-500">
                      View your Business Associate Agreement status.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={refreshBaaAgreements}
                    disabled={baaLoading}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    Refresh
                  </button>
                </div>

                {baaError && (
                  <div className="bg-red-50 rounded-lg p-3 text-sm text-red-600 mb-4 border border-red-100">
                    {baaError}
                  </div>
                )}

                <div className="text-sm text-slate-500 mb-3">
                  {baaLoading
                    ? "Loading…"
                    : `${filteredBaaAgreements.length} record(s)`}
                </div>

                <div className="w-full">
                  <div className="flex items-center pb-4">
                    <input
                      type="text"
                      placeholder="Search clinic name..."
                      value={baaSearchQuery}
                      onChange={(e) => {
                        setBaaSearchQuery(e.target.value);
                        setBaaCurrentPage(1);
                      }}
                      className="max-w-sm px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />
                  </div>

                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    {baaLoading ? (
                      <div className="p-8 text-center text-slate-500">
                        Loading BAA agreements...
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-brand-dark text-white text-left">
                                <th className="py-3 px-4 font-medium">
                                  Created
                                </th>
                                <th className="py-3 px-4 font-medium">
                                  Clinic
                                </th>
                                <th className="py-3 px-4 font-medium hidden sm:table-cell">
                                  Signer Name
                                </th>
                                <th className="py-3 px-4 font-medium hidden md:table-cell">
                                  Business Associate
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
                              {paginatedBaaAgreements.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="h-24 text-center text-slate-500"
                                  >
                                    No results.
                                  </td>
                                </tr>
                              ) : (
                                paginatedBaaAgreements.map((agreement, idx) => (
                                  <tr
                                    key={agreement.id}
                                    className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-primary/5 transition-colors`}
                                  >
                                    <td className="py-4 px-4">
                                      {agreement.createdAt
                                        ? new Date(
                                            agreement.createdAt,
                                          ).toLocaleDateString()
                                        : "—"}
                                    </td>
                                    <td className="py-4 px-4 font-semibold">
                                      {agreement.clinicName ?? "N/A"}
                                    </td>
                                    <td className="py-4 px-4 hidden sm:table-cell">
                                      {agreement.coveredEntityName ?? "N/A"}
                                    </td>
                                    <td className="py-4 px-4 hidden md:table-cell">
                                      {agreement.businessAssociateName ?? "—"}
                                    </td>
                                    <td className="py-4 px-4">
                                      {statusBadge(agreement.status)}
                                    </td>
                                    <td className="py-4 px-4">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          router.push(
                                            `/baa-providers/${agreement.id}`,
                                          );
                                        }}
                                        className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-colors"
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

                        <div className="flex items-center justify-end space-x-2 py-4 px-4">
                          <button
                            type="button"
                            onClick={() =>
                              setBaaCurrentPage((p) => Math.max(1, p - 1))
                            }
                            disabled={
                              baaCurrentPage === 1 ||
                              filteredBaaAgreements.length === 0
                            }
                            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            onClick={() => setBaaCurrentPage((p) => p + 1)}
                            disabled={
                              baaCurrentPage >= baaTotalPages ||
                              filteredBaaAgreements.length === 0
                            }
                            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>

      {/* Create BV Request Modal */}
      <BVModal
        open={createBvModalOpen}
        onOpenChange={setCreateBvModalOpen}
        onCreated={() => {
          setCreateBvModalOpen(false);
          void refreshBvRequests();
        }}
      />

      {/* Create Product Order Modal */}
      {productOrderModalOpen && (
        <EnhancedOrderModal
          open={productOrderModalOpen}
          onOpenChange={setProductOrderModalOpen}
          onCreated={refreshProductOrders}
        />
      )}

      {/* Product Order View Modal (view-only, no approve/deny/delete) */}
      <ViewProductOrderModal
        open={viewProductOrderModalOpen}
        onOpenChange={setViewProductOrderModalOpen}
        orderId={selectedProductOrderId}
        viewOnly
      />
      {/* Lymphedema Order Modal */}
      <LymphedemaOrderModal
        open={lymphedemaModalOpen}
        onOpenChange={setLymphedemaModalOpen}
        onCreated={() => {
          setLymphedemaModalOpen(false);
          void refreshLymphedemaOrders();
        }}
      />

      {/* Bv Detail & Edit Modal */}
      <BvDetailModal
        open={bvDetailOpen}
        onOpenChange={(open) => {
          setBvDetailOpen(open);
          if (!open) {
            setSelectedBvId(null);
            setDetailEdit(false);
            setDetailInitialData(null);
          }
        }}
        id={selectedBvId ?? undefined}
        edit={detailEdit}
        initialData={detailInitialData}
        onUpdated={refreshBvRequests}
        onRequestEdit={(initialData) => {
          if (initialData) setDetailInitialData(initialData);
          setDetailEdit(true);
        }}
      />

    </div>
  );
}
