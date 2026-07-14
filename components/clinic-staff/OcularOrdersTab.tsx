"use client";

import * as React from "react";
import { Eye, RefreshCw, ChevronDown } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { statusMeta } from "@/components/ui/status-badge";
import { humanizeLabel } from "@/lib/format";

type Patient = {
  firstName?: string;
  lastName?: string;
  dob?: string;
};

type OcularOrderRow = {
  id: string;
  status: string;
  eye: string | null;
  productVariant: string | null;
  sizeMm: number | null;
  sku: string | null;
  quantity: number | null;
  patient: Patient | null;
  primaryDiagnosis: string | null;
  submittedAt: string | null;
  createdAt: string | null;
  providerId: string | null;
  clinicName: string | null;
  secondaryDiagnosis: string | null;
  shipTo: { address?: string; city?: string; state?: string; zip?: string } | null;
  specialInstructions: string | null;
  insurancePayer: string | null;
  dateNeededBy: string | null;
};

const STATUS_OPTIONS = ["pending_review", "pending", "approved", "shipped", "completed", "denied", "cancelled"];

function patientName(patient: Patient | null): string {
  if (!patient) return "—";
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ") || "—";
}

export function OcularOrdersTab() {
  const token = useAuthStore((s) => s.jwt);
  const [rows, setRows] = React.useState<OcularOrderRow[]>([]);
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
      const res = await apiGet<{ success: true; data: OcularOrderRow[] }>(
        "/api/ocular/orders",
        { token },
      );
      setRows(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ocular orders");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const handleSendEmail = async (id: string) => {
    if (!token) return;
    setSendingEmailId(id);
    try {
      await fetch(`/api/ocular/orders/${id}/send-email`, {
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
        `/api/ocular/orders/${id}`,
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
          <Eye className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Ocular Orders</h2>
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
        <div className="text-sm text-slate-400 py-8 text-center">No ocular orders yet.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Practice</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Product</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Eye</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Qty</th>
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
                    <td className="px-4 py-3 text-slate-500">
                      {row.productVariant && row.sizeMm
                        ? `VisiDisc ${humanizeLabel(row.productVariant)} ${row.sizeMm}mm`
                        : row.sku ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{humanizeLabel(row.eye)}</td>
                    <td className="px-4 py-3 text-slate-500">{row.quantity ?? "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={row.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => { void handleStatusChange(row.id, e.target.value); }}
                        disabled={updatingId === row.id}
                        className={[
                          "text-xs font-medium px-2 py-1 rounded-full border-0 ring-1 ring-inset cursor-pointer",
                          statusMeta(row.status, "staff").classes,
                        ].join(" ")}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{statusMeta(s, "staff").label}</option>
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
                          <div><span className="font-medium">Primary Diagnosis:</span> {row.primaryDiagnosis ?? "—"}</div>
                          <div><span className="font-medium">Secondary Diagnosis:</span> {row.secondaryDiagnosis ?? "—"}</div>
                          <div><span className="font-medium">DOB:</span> {row.patient?.dob ?? "—"}</div>
                          <div><span className="font-medium">Date Needed By:</span> {row.dateNeededBy ?? "—"}</div>
                          <div><span className="font-medium">SKU:</span> <span className="font-mono">{row.sku ?? "—"}</span></div>
                          <div><span className="font-medium">Insurance:</span> {row.insurancePayer ?? "—"}</div>
                          <div><span className="font-medium">Ship To:</span> {row.shipTo ? [row.shipTo.address, row.shipTo.city, row.shipTo.state, row.shipTo.zip].filter(Boolean).join(", ") : "—"}</div>
                          <div><span className="font-medium">Special Instructions:</span> {row.specialInstructions ?? "—"}</div>
                          <div><span className="font-medium">Submitted:</span> {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "Pending"}</div>
                          <div className="col-span-2"><span className="font-medium">Order ID:</span> <span className="font-mono">{row.id}</span></div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                          <button
                            onClick={(e) => { e.stopPropagation(); void handleSendEmail(row.id); }}
                            disabled={sendingEmailId === row.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 disabled:opacity-50 transition-colors"
                          >
                            {sendingEmailId === row.id ? "Sending…" : "📧 Send to Skye Biologics"}
                          </button>
                          <span className="text-slate-400">orders@skyebiologics.com</span>
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
