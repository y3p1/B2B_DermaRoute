"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, ClipboardList, CheckCircle, Clock, Wind, Gauge } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { isClientDemoMode } from "@/lib/demoMode";

type LymphedemaOrderRow = {
  id: string;
  status: string;
  insurance: string | null;
  device: string | null;
  patient: { firstName?: string; lastName?: string } | null;
  extremity: string[] | null;
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

const DEVICE_COLORS: Record<string, string> = {
  "AIROS 6": "bg-blue-100 text-blue-700",
  "AIROS 8": "bg-purple-100 text-purple-700",
  "AIROS 6P": "bg-indigo-100 text-indigo-700",
};

export default function MedicalDevicesDashboardPage() {
  const token = useAuthStore((s) => s.jwt);
  const provider = useAuthStore((s) => s.provider);
  const [orders, setOrders] = React.useState<LymphedemaOrderRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!token && !isClientDemoMode()) return;
    setLoading(true);
    void apiGet<{ success: true; data: LymphedemaOrderRow[] }>("/api/lymphedema-orders", { token: token ?? "" })
      .then((res) => setOrders(res.data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [token]);

  const recentOrders = orders.slice(0, 5);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const approvedCount = orders.filter((o) => o.status === "approved").length;

  const deviceCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) {
      const dev = o.device ?? "Not specified";
      counts[dev] = (counts[dev] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  const extremityCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) {
      for (const ex of o.extremity ?? []) {
        counts[ex] = (counts[ex] ?? 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [orders]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-purple-900">
          Welcome{provider?.clinicName ? `, ${provider.clinicName}` : ""}
        </h1>
        <p className="text-purple-600 text-sm mt-1">
          AIROS Compression Pump & Garment Ordering
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Total Orders</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">{loading ? "…" : orders.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Pending</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{loading ? "…" : pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Approved</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{loading ? "…" : approvedCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Quick action */}
        <div className="bg-purple-600 rounded-xl p-6 text-white flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-lg">Order AIROS Equipment</h2>
            <p className="text-purple-200 text-sm mt-1">
              3-step form — patient info, device selection, review.
            </p>
          </div>
          <Link
            href="/medical-devices/orders/new"
            className="flex items-center justify-center gap-2 mt-4 px-5 py-2.5 bg-white text-purple-700 font-semibold rounded-lg hover:bg-purple-50 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Order
          </Link>
        </div>

        {/* Device breakdown */}
        <div className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Wind className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-slate-800 text-sm">Device Breakdown</h2>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : deviceCounts.length === 0 ? (
            <p className="text-sm text-slate-400">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {deviceCounts.map(([device, count]) => (
                <div key={device} className="flex items-center justify-between">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${DEVICE_COLORS[device] ?? "bg-slate-100 text-slate-600"}`}>
                    {device}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full"
                        style={{ width: `${Math.min(100, (count / orders.length) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {extremityCounts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Extremities</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {extremityCounts.map(([ext, count]) => (
                  <span key={ext} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md">
                    {ext} ({count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Recent Orders</h2>
          <Link href="/medical-devices/orders" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No orders yet.{" "}
            <Link href="/medical-devices/orders/new" className="text-purple-600 underline">
              Place your first order
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Patient</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Device</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Extremity</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Insurance</th>
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
                  <td className="px-5 py-3">
                    {order.device ? (
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${DEVICE_COLORS[order.device] ?? "bg-slate-100 text-slate-600"}`}>
                        {order.device}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{order.extremity?.join(", ") ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{order.insurance ?? "—"}</td>
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
