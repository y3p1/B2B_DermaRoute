"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";

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

export default function MedicalDevicesOrdersPage() {
  const token = useAuthStore((s) => s.jwt);
  const [orders, setOrders] = React.useState<LymphedemaOrderRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const refresh = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: true; data: LymphedemaOrderRow[] }>("/api/lymphedema-orders", { token });
      setOrders(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const name = `${o.patient?.firstName ?? ""} ${o.patient?.lastName ?? ""}`.toLowerCase();
    const haystack = `${name} ${o.device ?? ""} ${o.insurance ?? ""} ${o.status}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-purple-900">Order History</h1>
          <p className="text-sm text-purple-600 mt-1">{orders.length} order{orders.length !== 1 ? "s" : ""} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { void refresh(); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/medical-devices/orders/new"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Order
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by patient name, device, or status…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-purple-100 shadow-sm overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            {orders.length === 0
              ? <><p className="mb-3">No orders yet.</p><Link href="/medical-devices/orders/new" className="text-purple-600 underline font-medium">Place your first order</Link></>
              : "No orders match your search."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Patient</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Device</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Insurance</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Extremity</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Status</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800">
                    {order.patient
                      ? `${order.patient.firstName ?? ""} ${order.patient.lastName ?? ""}`.trim() || "—"
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{order.device ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{order.insurance ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{order.extremity?.join(", ") ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/medical-devices/orders/${order.id}`}
                      className="text-xs font-medium text-purple-600 hover:text-purple-700"
                    >
                      View →
                    </Link>
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
