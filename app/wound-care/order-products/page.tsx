"use client";

import * as React from "react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { isClientDemoMode } from "@/lib/demoMode";
import EnhancedOrderModal from "@/components/dashboard/EnhancedOrderModal";
import { StatusBadge } from "@/components/ui/status-badge";

type ProductOrderRow = {
  id: string;
  createdAt: string | null;
  status: string;
  practice: string | null;
  manufacturer: string | null;
  product: string | null;
  productCode: string | null;
  woundSize: string | null;
  patientInitials: string | null;
};

type BvEligibilityRow = {
  id: string;
  status: string;
  proofStatus: string | null;
};

export default function WoundCareOrderProductsPage() {
  const token = useAuthStore((s) => s.jwt);
  const [rows, setRows] = React.useState<ProductOrderRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [bvRequests, setBvRequests] = React.useState<BvEligibilityRow[]>([]);
  const [orderModalOpen, setOrderModalOpen] = React.useState(false);

  const refreshOrders = React.useCallback(() => {
    if (!token && !isClientDemoMode()) return;
    setLoading(true);
    void apiGet<{ success: true; data: ProductOrderRow[] }>("/api/order-products", { token: token ?? "" })
      .then((res) => setRows(res.data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [token]);

  React.useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  React.useEffect(() => {
    if (!token && !isClientDemoMode()) return;
    void apiGet<{ success: true; data: BvEligibilityRow[] }>("/api/bv-requests", { token: token ?? "" })
      .then((res) => setBvRequests(res.data))
      .catch(() => undefined);
  }, [token]);

  // Providers can only order once they have an approved BV request with
  // verified manufacturer proof — mirrors the gate in ProviderDashboardClient.
  const isEligibleForOrdering = bvRequests.some(
    (r) => r.status === "approved" && r.proofStatus === "verified",
  );

  const filtered = rows.filter(
    (r) =>
      !search ||
      (r.practice ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.product ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.patientInitials ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Order Products</h1>
          <p className="text-sm text-emerald-600 mt-1">
            Order wound care products gated from your approved BV requests, or review existing orders.
          </p>
        </div>
        <div className="relative group shrink-0">
          <button
            type="button"
            onClick={() => setOrderModalOpen(true)}
            disabled={!isEligibleForOrdering}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg transition-colors ${
              isEligibleForOrdering
                ? "hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
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
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 5v14M5 12h14"
              />
            </svg>
            Create Product Order
          </button>
          {!isEligibleForOrdering && (
            <span className="pointer-events-none absolute top-full right-0 mt-2 w-64 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white text-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10">
              You need at least one approved BV request with verified manufacturer proof before you can order products.
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Search practice or product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          />
          <span className="text-sm text-slate-500">{loading ? "Loading…" : `${filtered.length} record(s)`}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No product orders found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Date</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Practice</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 hidden sm:table-cell">Manufacturer</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Product</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Patient</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 hidden md:table-cell">Size</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-600 text-xs">
                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-800">{row.practice ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600 hidden sm:table-cell">{row.manufacturer ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className="font-medium text-slate-800">{row.product ?? "—"}</span>
                    {row.productCode && <span className="block text-xs text-slate-400">{row.productCode}</span>}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-700">{row.patientInitials ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600 text-xs hidden md:table-cell">{row.woundSize ?? "—"}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {orderModalOpen && (
        <EnhancedOrderModal
          open={orderModalOpen}
          onOpenChange={setOrderModalOpen}
          onCreated={refreshOrders}
        />
      )}
    </div>
  );
}
