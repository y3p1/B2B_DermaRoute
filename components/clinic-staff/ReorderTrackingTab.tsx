"use client";

import * as React from "react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";

type ReorderRow = {
  initials: string;
  clinicName: string | null;
  providerId: string;
  lastApplicationDate: string;
  daysSince: number;
  totalApplications: number;
  productNames: string[];
  healingStatus: "on_track" | "due" | "overdue";
  providerEmail?: string | null;
  providerPhone?: string | null;
};

type ReorderTrackingTabProps = {
  role: "admin" | "clinic_staff";
};

export function ReorderTrackingTab({ role }: ReorderTrackingTabProps) {
  const token = useAuthStore((s) => s.jwt);

  const [rows, setRows] = React.useState<ReorderRow[]>([]);
  const [threshold, setThreshold] = React.useState(30);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 15;

  // Threshold editing (admin only)
  const [editingThreshold, setEditingThreshold] = React.useState(false);
  const [thresholdInput, setThresholdInput] = React.useState("");
  const [savingThreshold, setSavingThreshold] = React.useState(false);
  const [saveThresholdError, setSaveThresholdError] = React.useState<string | null>(null);
  const [contactRowId, setContactRowId] = React.useState<string | null>(null);

  const refreshData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) {
        setError("Please sign in again.");
        return;
      }
      const [trackingRes, settingRes] = await Promise.all([
        apiGet<{ success: true; data: ReorderRow[]; threshold: number }>(
          "/api/reorder-tracking",
          { token },
        ),
        apiGet<{ success: true; data: { value: string } }>(
          "/api/threshold-settings?key=reorder_days_threshold",
          { token },
        ).catch(() => null),
      ]);
      setRows(trackingRes.data);
      setThreshold(trackingRes.threshold);
      if (settingRes?.data) {
        setThreshold(parseInt(settingRes.data.value, 10));
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const handleSaveThreshold = async () => {
    const val = parseInt(thresholdInput, 10);
    if (isNaN(val) || val < 1) return;
    setSavingThreshold(true);
    setSaveThresholdError(null);
    try {
      const res = await fetch("/api/threshold-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          key: "reorder_days_threshold",
          value: String(val),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          (json as { error?: string }).error ?? `Save failed (${res.status})`,
        );
      }
      setThreshold(val);
      setEditingThreshold(false);
      void refreshData();
    } catch (err) {
      setSaveThresholdError(
        err instanceof Error ? err.message : "Failed to save threshold",
      );
    } finally {
      setSavingThreshold(false);
    }
  };

  // Filter rows
  const filtered = rows.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.initials.toLowerCase().includes(q) ||
      (r.clinicName ?? "").toLowerCase().includes(q)
    );
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const statusConfig = {
    on_track: {
      label: "On Track",
      prefix: "\u2713",
      textClass: "text-green-600",
    },
    due: {
      label: "Due",
      prefix: "!",
      textClass: "text-amber-600",
    },
    overdue: {
      label: "Overdue",
      prefix: "\u2717",
      textClass: "text-red-600",
    },
  };

  const badgeClass = (daysSince: number) => {
    if (daysSince <= threshold)
      return "bg-green-50 text-green-700 border-green-200";
    if (daysSince <= threshold * 1.5)
      return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  return (
    <div className="space-y-4">
      {/* Threshold config bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-2">
        {saveThresholdError && (
          <p className="text-xs text-red-600">{saveThresholdError}</p>
        )}
        <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="font-medium">Re-Order Threshold:</span>
          {editingThreshold ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="w-20 px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveThreshold();
                  if (e.key === "Escape") setEditingThreshold(false);
                }}
              />
              <span className="text-slate-500">days</span>
              <button
                onClick={() => void handleSaveThreshold()}
                disabled={savingThreshold}
                className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {savingThreshold ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditingThreshold(false)}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">
                {threshold} days
              </span>
              {role === "admin" && (
                <button
                  onClick={() => {
                    setThresholdInput(String(threshold));
                    setEditingThreshold(true);
                  }}
                  className="px-2 py-0.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
        <div className="text-xs text-slate-400">
          Patients are flagged as &quot;due&quot; after {threshold} days,
          &quot;overdue&quot; after {Math.round(threshold * 1.5)} days
        </div>
        </div>
      </div>

      {/* Main table card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search by patient initials or clinic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-500">
            {filtered.length} patient{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading re-order data...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-500">{error}</div>
        ) : paginated.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No re-order tracking data found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-3">Patient</th>
                  <th className="py-3 px-3">Last App</th>
                  <th className="py-3 px-3">Days Since</th>
                  <th className="py-3 px-3">Apps/10</th>
                  <th className="py-3 px-3">Healing</th>
                  <th className="py-3 px-3">Suggested Products</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((row) => {
                  const status = statusConfig[row.healingStatus];
                  return (
                    <tr
                      key={`${row.initials}-${row.providerId}`}
                      className="border-b border-slate-100"
                    >
                      <td className="py-4 px-3">
                        <div className="font-semibold">{row.initials}</div>
                        <div className="text-xs text-slate-500">
                          {row.clinicName ?? "No provider record"}
                        </div>
                      </td>
                      <td className="py-4 px-3">{row.lastApplicationDate}</td>
                      <td className="py-4 px-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${badgeClass(row.daysSince)}`}
                        >
                          {row.daysSince} days
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        {row.totalApplications}/10
                      </td>
                      <td className={`py-4 px-3 font-medium ${status.textClass}`}>
                        {status.prefix} {status.label}
                      </td>
                      <td className="py-4 px-3 text-slate-500">
                        {row.productNames.length > 0
                          ? row.productNames.join(", ")
                          : "\u2014"}
                      </td>
                      <td className="py-4 px-3 text-right">
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={() => {
                              const rowKey = `${row.initials}-${row.providerId}`;
                              setContactRowId(contactRowId === rowKey ? null : rowKey);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                          >
                            View Contact
                          </button>
                          {contactRowId === `${row.initials}-${row.providerId}` && (
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 p-4 z-50">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-slate-800">Provider Contact</span>
                                <button
                                  type="button"
                                  onClick={() => setContactRowId(null)}
                                  className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                                >
                                  &times;
                                </button>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                  <span className="text-slate-500 w-20 shrink-0">Patient</span>
                                  <span className="font-medium text-slate-800">{row.initials}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-slate-500 w-20 shrink-0">Email</span>
                                  <a
                                    href={`mailto:${row.providerEmail}`}
                                    className="text-blue-600 hover:underline break-all"
                                  >
                                    {row.providerEmail || "N/A"}
                                  </a>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-slate-500 w-20 shrink-0">Phone</span>
                                  <a
                                    href={`tel:${row.providerPhone}`}
                                    className="text-blue-600 hover:underline"
                                  >
                                    {row.providerPhone || "N/A"}
                                  </a>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-sm">
            <span className="text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
