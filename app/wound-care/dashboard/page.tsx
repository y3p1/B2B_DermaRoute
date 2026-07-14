"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, ClipboardList, CheckCircle, CheckCheck, Clock, Bandage } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { isClientDemoMode } from "@/lib/demoMode";
import { StatusBadge, canonicalStatus } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { BreakdownCard } from "@/components/dashboard/BreakdownCard";
import { humanizeLabel } from "@/lib/format";

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
  const statusOf = (o: BvRow) => canonicalStatus(o.status, "provider");
  const pendingCount = orders.filter((o) => statusOf(o) === "pending").length;
  const approvedCount = orders.filter((o) => statusOf(o) === "approved").length;
  const completedCount = orders.filter((o) => statusOf(o) === "completed").length;

  const woundTypeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) {
      const wt = humanizeLabel(o.woundType, "Unknown");
      counts[wt] = (counts[wt] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-emerald-900 tracking-tight">
          Welcome{provider?.clinicName ? `, ${provider.clinicName}` : ""}
        </h1>
        <p className="text-emerald-600 text-sm mt-1">
          Tissue Products & PRP — Benefits Verification Portal
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total BVs"
          value={orders.length}
          loading={loading}
          icon={ClipboardList}
          iconClassName="bg-emerald-50 text-emerald-600"
          valueClassName="text-emerald-900"
        />
        <StatCard
          label="Pending"
          value={pendingCount}
          loading={loading}
          icon={Clock}
          iconClassName="bg-amber-50 text-amber-600"
          valueClassName="text-amber-700"
        />
        <StatCard
          label="Approved"
          value={approvedCount}
          loading={loading}
          icon={CheckCircle}
          iconClassName="bg-sky-50 text-sky-600"
          valueClassName="text-sky-700"
        />
        <StatCard
          label="Completed"
          value={completedCount}
          loading={loading}
          icon={CheckCheck}
          iconClassName="bg-emerald-50 text-emerald-700"
          valueClassName="text-emerald-700"
        />
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
        <BreakdownCard
          title="Wound Type Breakdown"
          icon={Bandage}
          iconClassName="text-emerald-600"
          barClassName="bg-emerald-400"
          loading={loading}
          total={orders.length}
          items={woundTypeCounts.map(([type, count]) => ({ key: type, label: type, count }))}
        />
      </div>

      {/* Recent requests */}
      <div className="bg-white rounded-xl ring-1 ring-slate-900/5 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_4px_12px_-4px_rgb(15_23_42/0.06)] overflow-hidden">
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
                  <td className="px-5 py-3 text-slate-600">{humanizeLabel(order.woundType)}</td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{order.woundSize ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{order.insurance ?? "—"}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.status} />
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
