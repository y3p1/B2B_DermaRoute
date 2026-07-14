"use client";

import * as React from "react";
import Link from "next/link";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { isClientDemoMode } from "@/lib/demoMode";
import { StatusBadge } from "@/components/ui/status-badge";

type BaaRow = {
  id: string;
  createdAt: string | null;
  status: string;
  clinicName: string | null;
  providerEmail: string | null;
  coveredEntity: string;
  coveredEntityName: string;
  businessAssociateName: string | null;
};

export default function WoundCareBaaAgreementsPage() {
  const token = useAuthStore((s) => s.jwt);
  const [rows, setRows] = React.useState<BaaRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (!token && !isClientDemoMode()) return;
    setLoading(true);
    void apiGet<{ success: true; data: BaaRow[] }>("/api/baa-providers", { token: token ?? "" })
      .then((res) => setRows(res.data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = rows.filter(
    (r) =>
      !search ||
      (r.clinicName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      r.status.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-emerald-900">BAA Provider Agreements</h1>
        <p className="text-sm text-emerald-600 mt-1">View your Business Associate Agreement status.</p>
      </div>

      <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Search clinic name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          />
          <span className="text-sm text-slate-500">{loading ? "Loading…" : `${filtered.length} record(s)`}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No BAA agreements found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Created</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Clinic</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 hidden sm:table-cell">Signer Name</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 hidden md:table-cell">Business Associate</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Status</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-600 text-xs">
                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-800">{row.clinicName ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600 hidden sm:table-cell">{row.coveredEntityName ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600 hidden md:table-cell">{row.businessAssociateName ?? "—"}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/baa-providers/${row.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors"
                    >
                      View
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
