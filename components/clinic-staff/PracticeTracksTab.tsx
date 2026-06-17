"use client";

import * as React from "react";
import { Layers, RefreshCw, Check } from "lucide-react";
import { apiGet, apiPut } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";

type TrackKey = "wound_care" | "lymphedema" | "ocular";

const TRACK_LABELS: Record<TrackKey, string> = {
  wound_care: "Wound Care",
  lymphedema: "Compression Equipment",
  ocular: "Ocular Surface",
};

const ALL_TRACKS: TrackKey[] = ["wound_care", "lymphedema", "ocular"];

type ProviderTrackRow = {
  id: string;
  clinicName: string;
  npiNumber: string;
  email: string;
  enabledTracks: TrackKey[];
};

export function PracticeTracksTab() {
  const token = useAuthStore((s) => s.jwt);
  const [rows, setRows] = React.useState<ProviderTrackRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [localTracks, setLocalTracks] = React.useState<Record<string, TrackKey[]>>({});

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) { setError("Please sign in again."); return; }
      const res = await apiGet<{ success: true; data: ProviderTrackRow[] }>(
        "/api/practice-tracks",
        { token },
      );
      setRows(res.data);
      const map: Record<string, TrackKey[]> = {};
      res.data.forEach((r) => { map[r.id] = r.enabledTracks; });
      setLocalTracks(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load practice tracks");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const toggleTrack = (providerId: string, track: TrackKey) => {
    setLocalTracks((prev) => {
      const current = prev[providerId] ?? [];
      const has = current.includes(track);
      return {
        ...prev,
        [providerId]: has ? current.filter((t) => t !== track) : [...current, track],
      };
    });
  };

  const save = async (providerId: string) => {
    if (!token) return;
    setSavingId(providerId);
    try {
      await apiPut<{ success: true }, { tracks: TrackKey[] }>(
        `/api/practice-tracks/${providerId}`,
        { tracks: localTracks[providerId] ?? [] },
        { token },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tracks");
    } finally {
      setSavingId(null);
    }
  };

  const isDirty = (providerId: string) => {
    const original = rows.find((r) => r.id === providerId)?.enabledTracks ?? [];
    const local = localTracks[providerId] ?? [];
    if (original.length !== local.length) return true;
    return !original.every((t) => local.includes(t));
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800">Practice Tracks</h2>
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
        <div className="text-sm text-slate-400 py-8 text-center">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-slate-400 py-8 text-center">No active providers found.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Practice</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">NPI</th>
                {ALL_TRACKS.map((t) => (
                  <th key={t} className="text-center px-4 py-3 font-medium text-slate-600">
                    {TRACK_LABELS[t]}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.clinicName}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{row.npiNumber}</td>
                  {ALL_TRACKS.map((track) => {
                    const enabled = (localTracks[row.id] ?? []).includes(track);
                    return (
                      <td key={track} className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleTrack(row.id, track)}
                          className={[
                            "w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors",
                            enabled
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-slate-100 text-slate-300 hover:bg-slate-200",
                          ].join(" ")}
                          title={enabled ? "Disable" : "Enable"}
                        >
                          {enabled ? <Check className="w-4 h-4" /> : <span className="text-lg leading-none">·</span>}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { void save(row.id); }}
                      disabled={!isDirty(row.id) || savingId === row.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40 transition-colors"
                      style={{ background: "oklch(0.45 0.12 160)" }}
                    >
                      {savingId === row.id ? "Saving…" : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
