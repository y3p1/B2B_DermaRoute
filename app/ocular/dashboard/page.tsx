"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, ClipboardList, Eye, Package } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { isClientDemoMode } from "@/lib/demoMode";

type OcularOrderSummary = {
  id: string;
  status: string;
  eye: string | null;
  productVariant: string | null;
  sizeMm: number | null;
  patient: { firstName?: string; lastName?: string } | null;
  createdAt: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function OcularDashboardPage() {
  const token = useAuthStore((s) => s.jwt);
  const provider = useAuthStore((s) => s.provider);
  const [orders, setOrders] = React.useState<OcularOrderSummary[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!token && !isClientDemoMode()) return;
    setLoading(true);
    void apiGet<{ success: true; data: OcularOrderSummary[] }>("/api/ocular/orders", { token: token ?? "" })
      .then((res) => setOrders(res.data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [token]);

  const recentOrders = orders.slice(0, 5);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const approvedCount = orders.filter((o) => o.status === "approved").length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-teal-900">
          Welcome{provider?.clinicName ? `, ${provider.clinicName}` : ""}
        </h1>
        <p className="text-teal-600 text-sm mt-1">
          VisiDisc Amniotic Membrane Allograft — Ocular Surface Care
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-teal-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Total Orders</span>
          </div>
          <p className="text-2xl font-bold text-teal-900">{loading ? "…" : orders.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-teal-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Pending</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{loading ? "…" : pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-teal-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Approved</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{loading ? "…" : approvedCount}</p>
        </div>
      </div>

      {/* Quick action */}
      <div className="bg-teal-600 rounded-xl p-6 text-white mb-8 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Ready to order VisiDisc?</h2>
          <p className="text-teal-100 text-sm mt-1">
            Single-page form — takes under 2 minutes.
          </p>
        </div>
        <Link
          href="/ocular/orders/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-teal-700 font-semibold rounded-lg hover:bg-teal-50 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Order
        </Link>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-teal-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Recent Orders</h2>
          <Link href="/ocular/orders" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No orders yet.{" "}
            <Link href="/ocular/orders/new" className="text-teal-600 underline">
              Place your first order
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Patient</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Product</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Eye</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Status</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800">
                    {order.patient
                      ? `${order.patient.firstName ?? ""} ${order.patient.lastName ?? ""}`.trim() || "—"
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {order.productVariant && order.sizeMm
                      ? `VisiDisc ${order.productVariant.charAt(0).toUpperCase() + order.productVariant.slice(1)} ${order.sizeMm}mm`
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-600 capitalize">{order.eye ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
