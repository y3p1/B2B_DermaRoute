"use client";

import * as React from "react";
import { Users, RefreshCw, ChevronDown } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";

const TRACK_LABELS: Record<string, string> = {
  wound_care: "Tissue Products & PRP",
  lymphedema: "Medical Devices / Equipment",
  ocular: "Ocular Products",
};

type ProviderRow = {
  id: string;
  clinicName: string;
  email: string;
  accountPhone: string;
  npiNumber: string;
  clinicAddress: string | null;
  clinicCity: string | null;
  clinicState: string | null;
  active: boolean;
  assignedRepId: string | null;
  createdAt: string | null;
  enabledTracks: string[];
};

type RepOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
};

export function ProviderAccountsTab() {
  const token = useAuthStore((s) => s.jwt);
  const [providers, setProviders] = React.useState<ProviderRow[]>([]);
  const [reps, setReps] = React.useState<RepOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const refresh = React.useCallback(async () => {
    if (!token) { setError("Please sign in again."); return; }
    setLoading(true);
    setError(null);
    try {
      const [provRes, repRes] = await Promise.all([
        apiGet<{ success: true; data: ProviderRow[] }>("/api/admin-accounts/providers", { token }),
        apiGet<{ success: true; data: RepOption[] }>("/api/admin-accounts/clinic-staff", { token }),
      ]);
      setProviders(provRes.data);
      setReps(repRes.data.filter((r) => r.active));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const handleAssignRep = async (providerId: string, repId: string | null) => {
    if (!token) return;
    setUpdatingId(providerId);
    try {
      await apiPatch<{ success: true }, { assignedRepId: string | null }>(
        `/api/admin-accounts/providers/${providerId}`,
        { assignedRepId: repId },
        { token },
      );
      setProviders((prev) =>
        prev.map((p) => p.id === providerId ? { ...p, assignedRepId: repId } : p),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignment");
    } finally {
      setUpdatingId(null);
    }
  };

  const repName = (repId: string | null) => {
    if (!repId) return "Unassigned";
    const rep = reps.find((r) => r.id === repId);
    return rep ? `${rep.firstName} ${rep.lastName}` : "Unknown";
  };

  const filtered = providers.filter((p) => {
    if (!search) return true;
    return (
      p.clinicName.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.npiNumber.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <div className="text-base font-semibold text-[#18192B] flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Provider Accounts
          </div>
          <div className="text-sm text-slate-500">
            View all provider accounts and assign DR Representatives.
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
            {providers.length} total
          </span>
          <button
            type="button"
            onClick={() => { void refresh(); }}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
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

      <div className="mb-3">
        <input
          type="text"
          placeholder="Search by practice name, email, or NPI…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        {loading && providers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Loading provider accounts…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No providers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#18192B] text-white text-left">
                  <th className="py-3 px-4 font-medium">Practice Name</th>
                  <th className="py-3 px-4 font-medium hidden sm:table-cell">Email</th>
                  <th className="py-3 px-4 font-medium hidden md:table-cell">NPI</th>
                  <th className="py-3 px-4 font-medium">Assigned Rep</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium hidden md:table-cell">Registered</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((provider, idx) => (
                  <React.Fragment key={provider.id}>
                    <tr
                      className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-blue-50/40 transition-colors cursor-pointer`}
                      onClick={() => setExpandedId(expandedId === provider.id ? null : provider.id)}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900">{provider.clinicName}</td>
                      <td className="py-3 px-4 text-slate-600 hidden sm:table-cell">{provider.email}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs hidden md:table-cell">{provider.npiNumber}</td>
                      <td className="py-3 px-4">
                        <select
                          value={provider.assignedRepId ?? ""}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            void handleAssignRep(provider.id, e.target.value || null);
                          }}
                          disabled={updatingId === provider.id}
                          className="text-xs px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                        >
                          <option value="">— Unassigned —</option>
                          {reps.map((rep) => (
                            <option key={rep.id} value={rep.id}>
                              {rep.firstName} {rep.lastName}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${provider.active ? "bg-green-50 text-green-700 border border-green-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                          {provider.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs hidden md:table-cell">
                        {provider.createdAt ? new Date(provider.createdAt).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedId === provider.id ? "rotate-180" : ""}`} />
                      </td>
                    </tr>
                    {expandedId === provider.id && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-slate-50 text-xs text-slate-600">
                          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 mb-3">
                            <div><span className="font-medium">Phone:</span> {provider.accountPhone}</div>
                            <div><span className="font-medium">Assigned Rep:</span> {repName(provider.assignedRepId)}</div>
                            <div><span className="font-medium">Address:</span> {[provider.clinicAddress, provider.clinicCity, provider.clinicState].filter(Boolean).join(", ") || "—"}</div>
                            <div><span className="font-medium">Provider ID:</span> <span className="font-mono">{provider.id}</span></div>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">Accessible Services:</span>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {provider.enabledTracks.length === 0 ? (
                                <span className="text-slate-400 italic">No service tracks assigned</span>
                              ) : (
                                provider.enabledTracks.map((track) => (
                                  <span
                                    key={track}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                                  >
                                    {TRACK_LABELS[track] ?? track}
                                  </span>
                                ))
                              )}
                            </div>
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
    </div>
  );
}
