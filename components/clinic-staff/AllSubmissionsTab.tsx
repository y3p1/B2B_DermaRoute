"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ClipboardCheck, Wind, Eye } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";

type SubmissionType = "bv_request" | "medical_device" | "ocular";

type UnifiedRow = {
  id: string;
  type: SubmissionType;
  status: string;
  practice: string | null;
  patient: string | null;
  detail: string | null;
  createdAt: string | null;
};

const TYPE_META: Record<SubmissionType, { label: string; tab: string; icon: React.ReactNode; color: string }> = {
  bv_request: {
    label: "Wound Care",
    tab: "bv_requests",
    icon: <ClipboardCheck className="w-3.5 h-3.5" />,
    color: "bg-blue-100 text-blue-700",
  },
  medical_device: {
    label: "Medical Device",
    tab: "lymphedema_orders",
    icon: <Wind className="w-3.5 h-3.5" />,
    color: "bg-purple-100 text-purple-700",
  },
  ocular: {
    label: "Ocular",
    tab: "ocular_orders",
    icon: <Eye className="w-3.5 h-3.5" />,
    color: "bg-teal-100 text-teal-700",
  },
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  shipped: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
  downloaded: "bg-slate-100 text-slate-600",
};

type BvRow = { id: string; status: string; practice: string | null; insurance: string | null; woundType: string | null; createdAt: string | null };
type LymphedemaRow = { id: string; status: string; clinicName: string | null; insurance: string | null; device: string | null; patient: { firstName?: string; lastName?: string } | null; createdAt: string | null };
type OcularRow = { id: string; status: string; clinicName: string | null; productVariant: string | null; sizeMm: number | null; patient: { firstName?: string; lastName?: string } | null; createdAt: string | null };

function patientStr(p: { firstName?: string; lastName?: string } | null): string | null {
  if (!p) return null;
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || null;
}

export function AllSubmissionsTab() {
  const token = useAuthStore((s) => s.jwt);
  const router = useRouter();
  const [rows, setRows] = React.useState<UnifiedRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<SubmissionType | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const refresh = React.useCallback(async () => {
    if (!token) { setError("Please sign in again."); return; }
    setLoading(true);
    setError(null);
    try {
      const [bvRes, lyRes, ocRes] = await Promise.all([
        apiGet<{ success: true; data: BvRow[] }>("/api/bv-requests", { token }).catch(() => ({ data: [] as BvRow[] })),
        apiGet<{ success: true; data: LymphedemaRow[] }>("/api/lymphedema-orders", { token }).catch(() => ({ data: [] as LymphedemaRow[] })),
        apiGet<{ success: true; data: OcularRow[] }>("/api/ocular/orders", { token }).catch(() => ({ data: [] as OcularRow[] })),
      ]);

      const bvRows: UnifiedRow[] = bvRes.data.map((r) => ({
        id: r.id,
        type: "bv_request",
        status: r.status,
        practice: r.practice,
        patient: null,
        detail: [r.insurance, r.woundType].filter(Boolean).join(" · ") || null,
        createdAt: r.createdAt,
      }));

      const lyRows: UnifiedRow[] = lyRes.data.map((r) => ({
        id: r.id,
        type: "medical_device",
        status: r.status,
        practice: r.clinicName,
        patient: patientStr(r.patient),
        detail: [r.insurance, r.device].filter(Boolean).join(" · ") || null,
        createdAt: r.createdAt,
      }));

      const ocRows: UnifiedRow[] = ocRes.data.map((r) => ({
        id: r.id,
        type: "ocular",
        status: r.status,
        practice: r.clinicName,
        patient: patientStr(r.patient),
        detail: r.productVariant && r.sizeMm
          ? `VisiDisc ${r.productVariant.charAt(0).toUpperCase() + r.productVariant.slice(1)} ${r.sizeMm}mm`
          : null,
        createdAt: r.createdAt,
      }));

      const all = [...bvRows, ...lyRows, ...ocRows].sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setRows(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const allStatuses = Array.from(new Set(rows.map((r) => r.status))).sort();

  const filtered = rows.filter((r) => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  function viewTab(type: SubmissionType) {
    void router.push(`?tab=${TYPE_META[type].tab}`);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">All Submissions</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {filtered.length} of {rows.length} submissions
          </p>
        </div>
        <button
          onClick={() => { void refresh(); }}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1.5">
          {(["all", "bv_request", "medical_device", "ocular"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={[
                "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                typeFilter === t
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              {t === "all" ? "All Types" : TYPE_META[t].label}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          {allStatuses.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-slate-400 py-8 text-center">No submissions found.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Practice</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Detail</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => {
                const meta = TYPE_META[row.type];
                return (
                  <tr key={`${row.type}-${row.id}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.color}`}>
                        {meta.icon}
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{row.practice ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{row.patient ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-48 truncate">{row.detail ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[row.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => viewTab(row.type)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
                      >
                        View tab →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
