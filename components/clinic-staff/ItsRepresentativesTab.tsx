"use client";

import * as React from "react";
import { Users, Check, X, RefreshCw } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";

type ClinicStaffRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountPhone: string;
  active: boolean;
  createdAt: string | null;
};

export function ItsRepresentativesTab() {
  const token = useAuthStore((s) => s.jwt);
  const [records, setRecords] = React.useState<ClinicStaffRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) {
        setError("Please sign in again.");
        return;
      }
      const res = await apiGet<{ success: true; data: ClinicStaffRecord[] }>(
        "/api/admin-accounts/clinic-staff",
        { token },
      );
      setRecords(res.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load ITS Representatives",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleToggleActive = async (id: string, newActive: boolean) => {
    if (!token) return;
    setUpdatingId(id);
    try {
      await apiPatch<{ success: true; data: ClinicStaffRecord }, { active: boolean }>(
        `/api/admin-accounts/clinic-staff/${id}`,
        { active: newActive },
        { token },
      );
      // Update local state
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, active: newActive } : r)),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update account status",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = records.filter((r) => !r.active).length;
  const activeCount = records.filter((r) => r.active).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <div className="text-base font-semibold text-[#18192B] flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            ITS Representatives
          </div>
          <div className="text-sm text-slate-500">
            Manage ITS Representative accounts. Approve pending registrations or deactivate existing accounts.
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium">
                {pendingCount} Pending
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-medium">
              {activeCount} Active
            </span>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 inline mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 rounded-lg p-3 text-sm text-red-600 mb-4 border border-red-100">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200">
        {loading && records.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Loading ITS Representatives...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No ITS Representatives found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#18192B] text-white text-left">
                  <th className="py-3 px-4 font-medium">Name</th>
                  <th className="py-3 px-4 font-medium">Email</th>
                  <th className="py-3 px-4 font-medium hidden sm:table-cell">Phone</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium hidden md:table-cell">Registered</th>
                  <th className="py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, idx) => (
                  <tr
                    key={record.id}
                    className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-blue-50/40 transition-colors`}
                  >
                    <td className="py-4 px-4 font-semibold text-slate-900">
                      {record.firstName} {record.lastName}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {record.email}
                    </td>
                    <td className="py-4 px-4 text-slate-600 hidden sm:table-cell">
                      {record.accountPhone}
                    </td>
                    <td className="py-4 px-4">
                      {record.active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-medium">
                          <Check className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium animate-pulse">
                          Pending Approval
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-500 hidden md:table-cell">
                      {record.createdAt
                        ? new Date(record.createdAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="py-4 px-4">
                      {record.active ? (
                        <button
                          type="button"
                          disabled={updatingId === record.id}
                          onClick={() => handleToggleActive(record.id, false)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium border border-red-200 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3 h-3 inline mr-1" />
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={updatingId === record.id}
                          onClick={() => handleToggleActive(record.id, true)}
                          className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3 h-3 inline mr-1" />
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
