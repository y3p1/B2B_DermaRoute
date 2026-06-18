"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, ClipboardList, CheckCircle, Clock, Bandage, Stethoscope } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { isClientDemoMode } from "@/lib/demoMode";

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

export default function WoundCareDashboardPage() {
  const token = useAuthStore((s) => s.jwt);
  const provider = useAuthStore((s) => s.provider);
  const [orders, setOrders] = React.useState<BvRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!token && !isClientDemoMode()) return;
    setLoading(true);
    void apiGet<{ success: true; data: BvRow[] }>("/api/bv-requests", { token: token ?? "" })
      .then((res) => setOrders(res.data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [token]);

  const recentOrders = orders.slice(0, 5);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const approvedCount = orders.filter((o) => o.status === "approved").length;

  const woundTypeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) {
      const wt = o.woundType ?? "Unknown";
      counts[wt] = (counts[wt] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-emerald-900">
          Welcome{provider?.clinicName ? `, ${provider.clinicName}` : ""}
        </h1>
        <p className="text-emerald-600 text-sm mt-1">
          Tissue Products & PRP — Benefits Verification Portal
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Total BVs</span>
          </div>
          <p className="text-2xl font-bold text-emerald-900">{loading ? "…" : orders.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Pending</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{loading ? "…" : pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Verified</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{loading ? "…" : approvedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-sm font-medium text-slate-600">Denied</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{loading ? "…" : orders.filter((o) => o.status === "denied").length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Quick action */}
        <div className="bg-emerald-600 rounded-xl p-6 text-white flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-lg">Submit a BV Request</h2>
            <p className="text-emerald-100 text-sm mt-1">
              Single-page form — takes under 3 minutes.
            </p>
          </div>
          <Link
            href="/wound-care/orders/new"
            className="flex items-center justify-center gap-2 mt-4 px-5 py-2.5 bg-white text-emerald-700 font-semibold rounded-lg hover:bg-emerald-50 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New BV Request
          </Link>
        </div>

        {/* Wound type breakdown */}
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Bandage className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-800 text-sm">Wound Type Breakdown</h2>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : woundTypeCounts.length === 0 ? (
            <p className="text-sm text-slate-400">No data yet</p>
          ) : (
            <div className="space-y-2">
              {woundTypeCounts.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 truncate max-w-48">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${Math.min(100, (count / orders.length) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent requests */}
      <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Recent BV Requests</h2>
          <Link href="/wound-care/orders" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No requests yet.{" "}
            <Link href="/wound-care/orders/new" className="text-emerald-600 underline">
              Submit your first BV request
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Patient</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Wound Type</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Size</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Insurance</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Status</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800">{order.initials ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{order.woundType ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{order.woundSize ?? "—"}</td>
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
