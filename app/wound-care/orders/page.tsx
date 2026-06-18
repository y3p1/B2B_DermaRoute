"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";

type BvRow = {
  id: string;
  status: string;
  insurance: string | null;
  woundType: string | null;
  woundSize: string | null;
  initials: string | null;
  practice: string | null;
  createdAt: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
  downloaded: "bg-slate-100 text-slate-600",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function WoundCareOrdersPage() {
  const token = useAuthStore((s) => s.jwt);
  const [orders, setOrders] = React.useState<BvRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const refresh = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: true; data: BvRow[] }>("/api/bv-requests", { token });
      setOrders(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const haystack = `${o.initials ?? ""} ${o.insurance ?? ""} ${o.woundType ?? ""} ${o.status}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">BV Request History</h1>
          <p className="text-sm text-emerald-600 mt-1">{orders.length} request{orders.length !== 1 ? "s" : ""} total</p>
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
            href="/wound-care/orders/new"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Request
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by patient initials, insurance, or status…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            {orders.length === 0
              ? <><p className="mb-3">No requests yet.</p><Link href="/wound-care/orders/new" className="text-emerald-600 underline font-medium">Submit your first BV request</Link></>
              : "No requests match your search."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Patient</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Insurance</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Wound Type</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Size</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Status</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800">{order.initials ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{order.insurance ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{order.woundType ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{order.woundSize ?? "—"}</td>
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
                      href={`/wound-care/orders/${order.id}`}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
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
