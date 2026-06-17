"use client";

import * as React from "react";
import { Settings, RefreshCw, Pencil, Check, X } from "lucide-react";
import { apiGet, apiPut } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";

type SettingRow = {
  key: string;
  value: string;
  updatedAt: string | null;
};

export function SystemSettingsTab() {
  const token = useAuthStore((s) => s.jwt);
  const [rows, setRows] = React.useState<SettingRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [newKey, setNewKey] = React.useState("");
  const [newValue, setNewValue] = React.useState("");
  const [addingNew, setAddingNew] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) { setError("Please sign in again."); return; }
      const res = await apiGet<{ success: true; data: SettingRow[] }>(
        "/api/system-settings",
        { token },
      );
      setRows(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const startEdit = (row: SettingRow) => {
    setEditingKey(row.key);
    setEditValue(row.value);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue("");
  };

  const saveEdit = async (key: string) => {
    if (!token) return;
    setSaving(true);
    try {
      await apiPut<{ success: true }, { key: string; value: string }>(
        "/api/system-settings",
        { key, value: editValue },
        { token },
      );
      setEditingKey(null);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save setting");
    } finally {
      setSaving(false);
    }
  };

  const saveNew = async () => {
    if (!token || !newKey.trim()) return;
    setSaving(true);
    try {
      await apiPut<{ success: true }, { key: string; value: string }>(
        "/api/system-settings",
        { key: newKey.trim(), value: newValue },
        { token },
      );
      setNewKey("");
      setNewValue("");
      setAddingNew(false);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add setting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800">System Settings</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAddingNew(true)}
            className="px-3 py-1.5 text-sm rounded-lg text-white"
            style={{ background: "oklch(0.45 0.12 160)" }}
          >
            + Add Setting
          </button>
          <button
            onClick={() => { void refresh(); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {addingNew && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Key</label>
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="setting_key"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Value</label>
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="value"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { void saveNew(); }}
              disabled={saving || !newKey.trim()}
              className="px-3 py-2 rounded-lg text-sm text-white disabled:opacity-40"
              style={{ background: "oklch(0.45 0.12 160)" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => { setAddingNew(false); setNewKey(""); setNewValue(""); }}
              className="px-3 py-2 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading...</div>
      ) : rows.length === 0 && !addingNew ? (
        <div className="text-sm text-slate-400 py-8 text-center">No settings configured yet.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Key</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Value</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Last Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.key}</td>
                  <td className="px-4 py-3 text-slate-800">
                    {editingKey === row.key ? (
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:ring-2"
                        autoFocus
                      />
                    ) : (
                      <span className="font-mono text-xs">{row.value}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingKey === row.key ? (
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => { void saveEdit(row.key); }}
                          disabled={saving}
                          className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(row)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="w-4 h-4" />
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
  );
}
