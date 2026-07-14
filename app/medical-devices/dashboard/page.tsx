"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, ClipboardList, CheckCircle, CheckCheck, Clock, Wind } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { isClientDemoMode } from "@/lib/demoMode";
import { StatusBadge, canonicalStatus } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { BreakdownCard } from "@/components/dashboard/BreakdownCard";
import { humanizeLabel } from "@/lib/format";

type LymphedemaOrderRow = {
  id: string;
  status: string;
  insurance: string | null;
  device: string | null;
  patient: { firstName?: string; lastName?: string } | null;
  extremity: string[] | null;
  createdAt: string | null;
};

const DEVICE_PILL_CLASSES: Record<string, string> = {
  "AIROS 6": "bg-sky-50 text-sky-800 ring-sky-600/20",
  "AIROS 8": "bg-violet-50 text-violet-800 ring-violet-600/20",
  "AIROS 6P": "bg-indigo-50 text-indigo-800 ring-indigo-600/20",
};

function DevicePill({ device }: { device: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        DEVICE_PILL_CLASSES[device] ?? "bg-slate-50 text-slate-600 ring-slate-400/20"
      }`}
    >
      {device}
    </span>
  );
}

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
  const statusOf = (o: LymphedemaOrderRow) => canonicalStatus(o.status, "provider");
  const pendingCount = orders.filter((o) => statusOf(o) === "pending").length;
  const approvedCount = orders.filter((o) => statusOf(o) === "approved").length;
  const completedCount = orders.filter((o) => statusOf(o) === "completed").length;

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
      for (const ex of Array.isArray(o.extremity) ? o.extremity : []) {
        const label = humanizeLabel(ex);
        counts[label] = (counts[label] ?? 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [orders]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-purple-900 tracking-tight">
          Welcome{provider?.clinicName ? `, ${provider.clinicName}` : ""}
        </h1>
        <p className="text-purple-600 text-sm mt-1">
          AIROS Compression Pump & Garment Ordering
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Orders"
          value={orders.length}
          loading={loading}
          icon={ClipboardList}
          iconClassName="bg-purple-50 text-purple-600"
          valueClassName="text-purple-900"
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
        <div className="bg-purple-600 rounded-xl p-6 text-white flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-lg">Order AIROS Equipment</h2>
            <p className="text-purple-100 text-sm mt-1">
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
        <BreakdownCard
          title="Device Breakdown"
          icon={Wind}
          iconClassName="text-purple-600"
          barClassName="bg-purple-400"
          loading={loading}
          total={orders.length}
          items={deviceCounts.map(([device, count]) => ({
            key: device,
            label: <DevicePill device={device} />,
            count,
          }))}
          footer={
            extremityCounts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {extremityCounts.map(([ext, count]) => (
                  <span
                    key={ext}
                    className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 text-purple-800 ring-1 ring-inset ring-purple-600/20 px-2.5 py-1 text-xs font-medium"
                  >
                    {ext}
                    <span className="text-purple-600 tabular-nums">{count}</span>
                  </span>
                ))}
              </div>
            ) : null
          }
        />
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl ring-1 ring-slate-900/5 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_4px_12px_-4px_rgb(15_23_42/0.06)] overflow-hidden">
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
                    {order.device ? <DevicePill device={order.device} /> : "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-xs">
                    {Array.isArray(order.extremity)
                      ? order.extremity.map((ex) => humanizeLabel(ex)).join(", ")
                      : "—"}
                  </td>
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
