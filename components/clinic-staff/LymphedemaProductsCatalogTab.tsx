"use client";

import * as React from "react";
import { Plus, RefreshCw, Archive, Pencil, X, Check } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";

type LymphedemaProduct = {
  id: string;
  name: string;
  device: string | null;
  hcpcs: string | null;
  garmentType: string | null;
  garmentStyle: string | null;
  compressionLevel: string | null;
  manufacturer: string | null;
  extremityType: string | null;
  description: string | null;
  archived: boolean;
  createdAt: string | null;
};

type FormState = {
  name: string;
  device: string;
  hcpcs: string;
  garmentType: string;
  garmentStyle: string;
  compressionLevel: string;
  manufacturer: string;
  extremityType: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  device: "",
  hcpcs: "",
  garmentType: "",
  garmentStyle: "",
  compressionLevel: "",
  manufacturer: "",
  extremityType: "",
  description: "",
};

export function LymphedemaProductsCatalogTab() {
  const token = useAuthStore((s) => s.jwt);
  const [products, setProducts] = React.useState<LymphedemaProduct[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showArchived, setShowArchived] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<FormState>(EMPTY_FORM);
  const [addingNew, setAddingNew] = React.useState(false);
  const [newForm, setNewForm] = React.useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const url = showArchived
        ? "/api/lymphedema/products?archived=true"
        : "/api/lymphedema/products";
      const res = await apiGet<{ success: true; data: LymphedemaProduct[] }>(url, { token });
      setProducts(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [token, showArchived]);

  React.useEffect(() => { void load(); }, [load]);

  function startEdit(p: LymphedemaProduct) {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      device: p.device ?? "",
      hcpcs: p.hcpcs ?? "",
      garmentType: p.garmentType ?? "",
      garmentStyle: p.garmentStyle ?? "",
      compressionLevel: p.compressionLevel ?? "",
      manufacturer: p.manufacturer ?? "",
      extremityType: p.extremityType ?? "",
      description: p.description ?? "",
    });
  }

  async function saveEdit() {
    if (!editingId || !token) return;
    setSaving(true);
    try {
      await apiPatch(`/api/lymphedema/products/${editingId}`, {
        body: {
          name: editForm.name || undefined,
          device: editForm.device || null,
          hcpcs: editForm.hcpcs || null,
          garmentType: editForm.garmentType || null,
          garmentStyle: editForm.garmentStyle || null,
          compressionLevel: editForm.compressionLevel || null,
          manufacturer: editForm.manufacturer || null,
          extremityType: editForm.extremityType || null,
          description: editForm.description || null,
        },
        token,
      });
      setEditingId(null);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function archiveProduct(id: string) {
    if (!token) return;
    try {
      await apiDelete(`/api/lymphedema/products/${id}`, { token });
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive");
    }
  }

  async function createProduct() {
    if (!token) return;
    setSaving(true);
    try {
      await apiPost("/api/lymphedema/products", {
        body: {
          name: newForm.name,
          device: newForm.device || null,
          hcpcs: newForm.hcpcs || null,
          garmentType: newForm.garmentType || null,
          garmentStyle: newForm.garmentStyle || null,
          compressionLevel: newForm.compressionLevel || null,
          manufacturer: newForm.manufacturer || null,
          extremityType: newForm.extremityType || null,
          description: newForm.description || null,
        },
        token,
      });
      setAddingNew(false);
      setNewForm(EMPTY_FORM);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500";

  function FormRow({
    form,
    onChange,
  }: {
    form: FormState;
    onChange: (k: keyof FormState, v: string) => void;
  }) {
    return (
      <tr className="bg-blue-50/40">
        <td className="px-3 py-2">
          <input className={inputCls} value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="Name*" />
        </td>
        <td className="px-3 py-2">
          <input className={inputCls} value={form.device} onChange={(e) => onChange("device", e.target.value)} placeholder="Device" />
        </td>
        <td className="px-3 py-2">
          <input className={inputCls} value={form.hcpcs} onChange={(e) => onChange("hcpcs", e.target.value)} placeholder="HCPCS" />
        </td>
        <td className="px-3 py-2">
          <input className={inputCls} value={form.manufacturer} onChange={(e) => onChange("manufacturer", e.target.value)} placeholder="Manufacturer" />
        </td>
        <td className="px-3 py-2">
          <input className={inputCls} value={form.extremityType} onChange={(e) => onChange("extremityType", e.target.value)} placeholder="Extremity" />
        </td>
        <td className="px-3 py-2">
          <input className={inputCls} value={form.description} onChange={(e) => onChange("description", e.target.value)} placeholder="Description" />
        </td>
        <td className="px-3 py-2" />
      </tr>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-slate-300"
            />
            Show archived
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => { setAddingNew(true); setNewForm(EMPTY_FORM); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-3 py-3 text-xs font-medium text-slate-600">Name</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-slate-600">Device</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-slate-600">HCPCS</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-slate-600">Manufacturer</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-slate-600">Extremity</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-slate-600">Description</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {addingNew && (
              <>
                <FormRow
                  form={newForm}
                  onChange={(k, v) => setNewForm((f) => ({ ...f, [k]: v }))}
                />
                <tr className="bg-blue-50/40">
                  <td colSpan={7} className="px-3 py-2">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => void createProduct()}
                        disabled={saving || !newForm.name}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" /> Save
                      </button>
                      <button
                        onClick={() => setAddingNew(false)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              </>
            )}
            {loading && products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((p) =>
                editingId === p.id ? (
                  <React.Fragment key={p.id}>
                    <FormRow
                      form={editForm}
                      onChange={(k, v) => setEditForm((f) => ({ ...f, [k]: v }))}
                    />
                    <tr className="bg-blue-50/40">
                      <td colSpan={7} className="px-3 py-2">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => void saveEdit()}
                            disabled={saving}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" /> Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ) : (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50 transition-colors ${p.archived ? "opacity-50" : ""}`}
                  >
                    <td className="px-3 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-3 py-3 text-slate-500">{p.device ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-500 font-mono text-xs">{p.hcpcs ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-500">{p.manufacturer ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-500 capitalize">{p.extremityType ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs max-w-48 truncate">{p.description ?? "—"}</td>
                    <td className="px-3 py-3 text-right">
                      {!p.archived && (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => startEdit(p)}
                            className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => void archiveProduct(p.id)}
                            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Archive"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
