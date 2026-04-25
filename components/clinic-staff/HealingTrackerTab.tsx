"use client";

import * as React from "react";
import { apiGet, apiPost } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";

type HealingStatus = "on_track" | "below_target" | "pending" | "tracking_only" | "healed";

type WoundCase = {
  bvRequestId: string;
  initials: string | null;
  clinicName: string | null;
  providerId: string | null;
  woundType: string | null;
  benchmarkKey: "DFU" | "VLU" | "PRESSURE" | "MOHS" | "OTHER";
  benchmarkLabel: string;
  baselineSize: number | null;
  baselineDate: string | null;
  currentSize: number | null;
  currentDate: string | null;
  pctReduction: number | null;
  weeksElapsed: number | null;
  target: number | null;
  status: HealingStatus;
  applicationsUsed: number;
  applicationsRemaining: number;
  measurementCount: number;
};

type WoundCaseOption = {
  bvRequestId: string;
  initials: string | null;
  clinicName: string | null;
  woundType: string | null;
};

type MeasurementHistoryRow = {
  id: string;
  bvRequestId: string;
  sizeCm2: number;
  measuredAt: string;
  notes: string | null;
};

type AlternativeProduct = {
  id: string;
  qCode: string | null;
  name: string;
  manufacturer: string | null;
  marginPerCm2: number | null;
};

type ListResponse = {
  success: true;
  data: { cases: WoundCase[]; options: WoundCaseOption[] };
};

const BENCHMARK_CARDS: Array<{
  label: string;
  target: string;
  blurb: string;
  accent: string;
}> = [
  {
    label: "Diabetic Foot Ulcer (DFU)",
    target: "50% at Week 4",
    blurb: "Primary endpoint in most studies",
    accent: "text-blue-600",
  },
  {
    label: "Venous Leg Ulcer (VLU)",
    target: "40% at Week 4",
    blurb: "Primary endpoint in most studies",
    accent: "text-purple-600",
  },
  {
    label: "Pressure Ulcer",
    target: "10% per week",
    blurb: "Cumulative target evaluated at Week 4",
    accent: "text-rose-600",
  },
  {
    label: "MOHS (acute)",
    target: "Tracked only",
    blurb: "No standardized healing benchmark",
    accent: "text-slate-500",
  },
];

const STATUS_LABELS: Record<HealingStatus, { label: string; classes: string }> =
  {
    on_track: {
      label: "On Track",
      classes: "bg-green-50 text-green-700 border-green-200",
    },
    below_target: {
      label: "Below Target",
      classes: "bg-red-50 text-red-700 border-red-200",
    },
    pending: {
      label: "Pending",
      classes: "bg-amber-50 text-amber-700 border-amber-200",
    },
    tracking_only: {
      label: "Tracking",
      classes: "bg-slate-100 text-slate-600 border-slate-200",
    },
    healed: {
      label: "Healed",
      classes: "bg-teal-50 text-teal-700 border-teal-200",
    },
  };

function formatPct(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatSize(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)} cm²`;
}

function formatWeeks(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)} wk`;
}

export function HealingTrackerTab() {
  const token = useAuthStore((s) => s.jwt);

  const [cases, setCases] = React.useState<WoundCase[]>([]);
  const [options, setOptions] = React.useState<WoundCaseOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Entry form state
  const [selectedBv, setSelectedBv] = React.useState<string>("");
  const [sizeInput, setSizeInput] = React.useState("");
  const [dateInput, setDateInput] = React.useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [submitMsg, setSubmitMsg] = React.useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = React.useState<"all" | HealingStatus>(
    "all",
  );

  // Expandable detail state
  const [expandedBv, setExpandedBv] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<MeasurementHistoryRow[]>([]);
  const [alternatives, setAlternatives] = React.useState<AlternativeProduct[]>(
    [],
  );
  const [detailLoading, setDetailLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!token) {
      setError("Please sign in again.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<ListResponse>(`/api/healing-tracker?_t=${Date.now()}`, { token });
      setCases(res.data.cases);
      setOptions(res.data.options);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMsg(null);
    if (!selectedBv) {
      setSubmitMsg({ type: "error", text: "Select a patient." });
      return;
    }
    const size = parseFloat(sizeInput);
    if (!Number.isFinite(size) || size < 0) {
      setSubmitMsg({ type: "error", text: "Enter a valid wound size in cm² (0 = healed)." });
      return;
    }

    setSubmitting(true);
    try {
      await apiPost(
        "/api/healing-tracker",
        {
          bvRequestId: selectedBv,
          sizeCm2: size,
          measuredAt: dateInput || undefined,
        },
        { token: token ?? undefined },
      );
      setSubmitMsg({ type: "ok", text: "Measurement recorded." });
      setSizeInput("");
      void refresh();
    } catch (err) {
      setSubmitMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to record",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpanded = async (bvRequestId: string) => {
    if (expandedBv === bvRequestId) {
      setExpandedBv(null);
      setHistory([]);
      setAlternatives([]);
      return;
    }
    setExpandedBv(bvRequestId);
    setDetailLoading(true);
    try {
      const [historyRes, altRes] = await Promise.all([
        apiGet<{ success: true; data: MeasurementHistoryRow[] }>(
          `/api/healing-tracker/${bvRequestId}/history`,
          { token: token ?? undefined },
        ),
        apiGet<{ success: true; data: AlternativeProduct[] }>(
          `/api/healing-tracker/${bvRequestId}/alternatives`,
          { token: token ?? undefined },
        ),
      ]);
      setHistory(historyRes.data);
      setAlternatives(altRes.data);
    } catch {
      setHistory([]);
      setAlternatives([]);
    } finally {
      setDetailLoading(false);
    }
  };
  // Delete wound case state
  const [deleteConfirmBv, setDeleteConfirmBv] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const handleDeleteWoundCase = async (bvRequestId: string) => {
    if (!token) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/healing-tracker/${bvRequestId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || "Failed to delete wound case");
      }
      setDeleteConfirmBv(null);
      if (expandedBv === bvRequestId) {
        setExpandedBv(null);
        setHistory([]);
        setAlternatives([]);
      }
      void refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = cases.filter((c) =>
    statusFilter === "all" ? true : c.status === statusFilter,
  );

  const belowTargetCases = cases.filter((c) => c.status === "below_target");

  return (
    <div className="space-y-5">
      {/* Benchmarks */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-5 bg-linear-to-r from-indigo-50 to-blue-50 rounded-xl">
          <div className="text-sm font-semibold text-[#18192B] mb-3">
            Healing Rate Benchmarks (Grafts/Tissue Only)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENCHMARK_CARDS.map((b) => (
              <div
                key={b.label}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <div className="text-xs text-slate-500">{b.label}</div>
                <div className={`text-lg font-bold ${b.accent}`}>{b.target}</div>
                <div className="text-xs text-slate-500">{b.blurb}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live entry */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="text-sm font-semibold text-[#18192B] mb-3">
          Record Wound Measurement
        </div>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <select
            value={selectedBv}
            onChange={(e) => setSelectedBv(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select patient / wound case…</option>
            {options.map((o) => (
              <option key={o.bvRequestId} value={o.bvRequestId}>
                {o.initials ?? "—"} • {o.clinicName ?? "—"}
                {o.woundType ? ` (${o.woundType})` : ""}
              </option>
            ))}
          </select>
          <input
            value={sizeInput}
            onChange={(e) => setSizeInput(e.target.value)}
            inputMode="decimal"
            placeholder="Wound size (cm²)"
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="h-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {submitting ? "Recording…" : "Record Measurement"}
          </button>
        </form>
        {submitMsg && (
          <div
            className={`mt-3 text-xs ${submitMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}
          >
            {submitMsg.text}
          </div>
        )}
      </div>

      {/* All cases table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm font-semibold text-[#18192B]">
            Wound Cases
          </div>
          <div className="flex items-center gap-2 text-xs">
            {(
              [
                ["all", "All"],
                ["below_target", "Below Target"],
                ["pending", "Pending"],
                ["on_track", "On Track"],
                ["tracking_only", "Tracking"],
                ["healed", "Healed"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`px-2.5 py-1 rounded-full border ${
                  statusFilter === key
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading wound cases…
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No wound cases to display.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-3">Patient</th>
                  <th className="py-3 px-3">Wound Type</th>
                  <th className="py-3 px-3">Baseline</th>
                  <th className="py-3 px-3">Current</th>
                  <th className="py-3 px-3">Reduction</th>
                  <th className="py-3 px-3">Weeks</th>
                  <th className="py-3 px-3">Target</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Apps</th>
                  <th className="py-3 px-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const status = STATUS_LABELS[row.status];
                  const isExpanded = expandedBv === row.bvRequestId;
                  return (
                    <React.Fragment key={row.bvRequestId}>
                      <tr className="border-b border-slate-100">
                        <td className="py-4 px-3">
                          <div className="font-semibold">
                            {row.initials ?? "—"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {row.clinicName ?? "—"}
                          </div>
                        </td>
                        <td className="py-4 px-3 text-slate-700">
                          {row.benchmarkLabel}
                        </td>
                        <td className="py-4 px-3">
                          {formatSize(row.baselineSize)}
                          {row.baselineDate && (
                            <div className="text-xs text-slate-400">
                              {row.baselineDate}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-3">
                          {formatSize(row.currentSize)}
                          {row.currentDate && (
                            <div className="text-xs text-slate-400">
                              {row.currentDate}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-3 font-medium">
                          {formatPct(row.pctReduction)}
                        </td>
                        <td className="py-4 px-3">
                          {formatWeeks(row.weeksElapsed)}
                        </td>
                        <td className="py-4 px-3 text-slate-500">
                          {formatPct(row.target)}
                        </td>
                        <td className="py-4 px-3">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${status.classes}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="py-4 px-3">
                          {row.applicationsUsed}/10
                        </td>
                        <td className="py-4 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void toggleExpanded(row.bvRequestId)}
                              className="text-blue-600 hover:underline text-xs font-medium"
                            >
                              {isExpanded ? "Hide" : "View"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmBv(row.bvRequestId)}
                              className="text-red-500 hover:text-red-700 text-xs font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <td colSpan={10} className="py-4 px-5">
                            {detailLoading ? (
                              <div className="text-xs text-slate-500">
                                Loading…
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                <div>
                                  <div className="text-xs font-semibold text-slate-700 mb-2">
                                    Measurement History
                                  </div>
                                  {history.length === 0 ? (
                                    <div className="text-xs text-slate-500">
                                      No measurements yet.
                                    </div>
                                  ) : (
                                    <ul className="space-y-1 text-xs">
                                      {history.map((h, idx) => (
                                        <li
                                          key={h.id}
                                          className="flex justify-between border-b border-slate-200 pb-1"
                                        >
                                          <span>
                                            {h.measuredAt}
                                            {idx === 0 && (
                                              <span className="ml-1 text-[10px] text-slate-400">
                                                (baseline)
                                              </span>
                                            )}
                                          </span>
                                          <span className="font-medium">
                                            {h.sizeCm2.toFixed(1)} cm²
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-slate-700 mb-2">
                                    {row.status === "below_target"
                                      ? "Higher-margin alternatives"
                                      : "Top-margin products (insurance match)"}
                                  </div>
                                  {alternatives.length === 0 ? (
                                    <div className="text-xs text-slate-500">
                                      No alternatives found.
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      {alternatives.map((p) => (
                                        <div
                                          key={p.id}
                                          className="border border-slate-200 rounded-lg p-2 text-xs bg-white"
                                        >
                                          <div className="font-semibold truncate">
                                            {p.name}
                                          </div>
                                          <div className="text-slate-500">
                                            {p.qCode ?? "—"}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Below-benchmark alerts summary */}
      {belowTargetCases.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-red-100 border-l-4 border-l-red-400 p-5">
          <div className="text-sm font-semibold text-red-800 mb-3">
            Patients Not Meeting Healing Benchmark ({belowTargetCases.length})
          </div>
          <ul className="space-y-2 text-sm">
            {belowTargetCases.map((c) => (
              <li
                key={c.bvRequestId}
                className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg p-3"
              >
                <div>
                  <div className="font-semibold">
                    {c.initials ?? "—"} • {c.clinicName ?? "—"}
                  </div>
                  <div className="text-xs text-slate-600">
                    {c.benchmarkLabel} • {formatPct(c.pctReduction)} reduction
                    (target {formatPct(c.target)}) • {formatWeeks(c.weeksElapsed)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleExpanded(c.bvRequestId)}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  {expandedBv === c.bvRequestId ? "Hide" : "View alternatives"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmBv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirmBv(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Delete Wound Case
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              This will permanently remove all wound measurements for this case.
              The BV request itself will not be affected. Are you sure?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmBv(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeleteWoundCase(deleteConfirmBv)}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
