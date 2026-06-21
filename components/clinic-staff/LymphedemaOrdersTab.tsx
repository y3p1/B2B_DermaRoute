"use client";

import * as React from "react";
import { Wind, RefreshCw, ChevronDown } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";

type Patient = {
  firstName?: string;
  lastName?: string;
  dob?: string;
};

type LymphedemaOrderRow = {
  id: string;
  status: string;
  insurance: string | null;
  device: string | null;
  patient: Patient | null;
  extremity: string[] | null;
  submittedAt: string | null;
  createdAt: string | null;
  providerId: string | null;
  clinicName: string | null;
  compressionLevel: string | null;
  garmentType: string | null;
  garmentStyle: string | null;
  quantity: number | null;
  manufacturerPreference: string | null;
  distalPressureMmhg: number | null;
  timesPerDay: number | null;
  minutesPerSession: number | null;
  diagnosis: unknown;
  hcpcs: string | null;
  placeOfService: string | null;
};

const STATUS_OPTIONS = ["pending_review", "pending", "approved", "shipped", "completed", "denied", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  pending_review: "bg-orange-100 text-orange-700",
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function patientName(patient: Patient | null): string {
  if (!patient) return "—";
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ") || "—";
}

export function LymphedemaOrdersTab() {
  const token = useAuthStore((s) => s.jwt);
  const [rows, setRows] = React.useState<LymphedemaOrderRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) { setError("Please sign in again."); return; }
      const res = await apiGet<{ success: true; data: LymphedemaOrderRow[] }>(
        "/api/lymphedema-orders",
        { token },
      );
      setRows(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lymphedema orders");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const handleSendEmail = async (id: string) => {
    if (!token) return;
    setSendingEmailId(id);
    try {
      await fetch(`/api/lymphedema-orders/${id}/send-email`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (!token) return;
    setUpdatingId(id);
    try {
      await apiPatch<{ success: true }, { status: string }>(
        `/api/lymphedema-orders/${id}`,
        { status },
        { token },
      );
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800">Lymphedema Orders</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {rows.length} total
          </span>
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

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-slate-400 py-8 text-center">No lymphedema orders yet.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Practice</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Insurance</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Device</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Extremity</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {patientName(row.patient)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{row.clinicName ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{row.insurance ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{row.device ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{Array.isArray(row.extremity) ? row.extremity.join(", ") : "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={row.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => { void handleStatusChange(row.id, e.target.value); }}
                        disabled={updatingId === row.id}
                        className={[
                          "text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer",
                          STATUS_COLORS[row.status] ?? "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${expandedId === row.id ? "rotate-180" : ""}`}
                      />
                    </td>
                  </tr>
                  {expandedId === row.id && (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 bg-slate-50 text-xs text-slate-600">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 mb-3">
                          <div><span className="font-medium">DOB:</span> {(row.patient as { dob?: string } | null)?.dob ?? "—"}</div>
                          <div><span className="font-medium">Submitted:</span> {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "Pending"}</div>
                          <div><span className="font-medium">Diagnosis:</span> {Array.isArray(row.diagnosis) ? (row.diagnosis as string[]).join(", ") : "—"}</div>
                          <div><span className="font-medium">Place of Service:</span> {row.placeOfService ?? "—"}</div>
                          <div><span className="font-medium">HCPCS:</span> {row.hcpcs ?? "—"}</div>
                          <div><span className="font-medium">Garment Type:</span> {row.garmentType ?? "—"}</div>
                          <div><span className="font-medium">Garment Style:</span> {row.garmentStyle ?? "—"}</div>
                          <div><span className="font-medium">Compression Level:</span> {row.compressionLevel ?? "—"}</div>
                          <div><span className="font-medium">Quantity:</span> {row.quantity ?? "—"}</div>
                          <div><span className="font-medium">Manufacturer:</span> {row.manufacturerPreference ?? "—"}</div>
                          <div><span className="font-medium">Distal Pressure:</span> {row.distalPressureMmhg ? `${row.distalPressureMmhg} mmHg` : "—"}</div>
                          <div><span className="font-medium">Times/Day:</span> {row.timesPerDay ? `${row.timesPerDay}×` : "—"}</div>
                          <div><span className="font-medium">Min/Session:</span> {row.minutesPerSession ? `${row.minutesPerSession} min` : "—"}</div>
                          <div><span className="font-medium">Extremity:</span> {Array.isArray(row.extremity) ? row.extremity.join(", ") : "—"}</div>
                          <div><span className="font-medium">Order ID:</span> <span className="font-mono">{row.id}</span></div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                          <button
                            onClick={(e) => { e.stopPropagation(); void handleSendEmail(row.id); }}
                            disabled={sendingEmailId === row.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                          >
                            {sendingEmailId === row.id ? "Sending…" : "📧 Send to Central Palms Medical"}
                          </button>
                          <span className="text-slate-400">Lb@centralpalmsmedical.com</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
