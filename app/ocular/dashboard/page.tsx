"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Layers } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { isClientDemoMode } from "@/lib/demoMode";
import { StatusBadge, countByCanonicalStatus } from "@/components/ui/status-badge";
import { DashboardStatsRow } from "@/components/dashboard/DashboardStatsRow";
import { BreakdownCard } from "@/components/dashboard/BreakdownCard";
import { humanizeLabel } from "@/lib/format";

type OcularOrderSummary = {
  id: string;
  status: string;
  eye: string | null;
  productVariant: string | null;
  sizeMm: number | null;
  patient: { firstName?: string; lastName?: string } | null;
  createdAt: string | null;
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
  const counts = React.useMemo(() => countByCanonicalStatus(orders), [orders]);

  const productMix = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) {
      const key =
        o.productVariant && o.sizeMm
          ? `VisiDisc ${humanizeLabel(o.productVariant)} ${o.sizeMm}mm`
          : "Not specified";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  const eyeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) {
      const eye = humanizeLabel(o.eye, "Unknown");
      counts[eye] = (counts[eye] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-teal-900 tracking-tight">
          Welcome{provider?.clinicName ? `, ${provider.clinicName}` : ""}
        </h1>
        <p className="text-teal-600 text-sm mt-1">
          VisiDisc Amniotic Membrane Allograft — Ocular Surface Care
        </p>
      </div>

      <div className="mb-8">
        <DashboardStatsRow total={orders.length} counts={counts} loading={loading} totalLabel="Total Orders" totalIconClassName="bg-teal-50 text-teal-600" totalValueClassName="text-teal-900" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Quick action */}
        <div className="bg-teal-600 rounded-xl p-6 text-white flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-lg">Ready to order VisiDisc?</h2>
            <p className="text-teal-100 text-sm mt-1">
              Single-page form — takes under 2 minutes.
            </p>
          </div>
          <Link
            href="/ocular/orders/new"
            className="flex items-center justify-center gap-2 mt-4 px-5 py-2.5 bg-white text-teal-700 font-semibold rounded-lg hover:bg-teal-50 active:bg-teal-100 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-600"
          >
            <Plus className="w-4 h-4" />
            New Order
          </Link>
        </div>

        {/* Product mix breakdown */}
        <BreakdownCard
          title="Product Mix"
          icon={Layers}
          iconClassName="text-teal-600"
          barClassName="bg-teal-400"
          loading={loading}
          total={orders.length}
          items={productMix.map(([label, count]) => ({ key: label, label, count }))}
          footer={
            eyeCounts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {eyeCounts.map(([eye, count]) => (
                  <span
                    key={eye}
                    className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-600/20 px-2.5 py-1 text-xs font-medium"
                  >
                    {eye}
                    <span className="text-teal-600 tabular-nums">{count}</span>
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
                      ? `VisiDisc ${humanizeLabel(order.productVariant)} ${order.sizeMm}mm`
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{humanizeLabel(order.eye)}</td>
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
