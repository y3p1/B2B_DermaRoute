"use client";

import * as React from "react";
import { Plus, RefreshCw, Archive, Pencil, X, Check } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";

type OcularProduct = {
  id: string;
  name: string;
  productVariant: string;
  sizeMm: number;
  sku: string;
  description: string | null;
  archived: boolean;
  createdAt: string | null;
};

type FormState = {
  name: string;
  productVariant: "thin" | "thick" | "";
  sizeMm: string;
  sku: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  productVariant: "",
  sizeMm: "",
  sku: "",
  description: "",
};

const VARIANT_LABELS: Record<string, string> = {
  thin: "Thin (45μm)",
  thick: "Thick (200μm)",
};

export function OcularProductsCatalogTab() {
  const token = useAuthStore((s) => s.jwt);
  const [products, setProducts] = React.useState<OcularProduct[]>([]);
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
        ? "/api/ocular/products?archived=true"
        : "/api/ocular/products";
      const res = await apiGet<{ success: true; data: OcularProduct[] }>(url, { token });
      setProducts(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [token, showArchived]);

  React.useEffect(() => { void load(); }, [load]);

  function startEdit(p: OcularProduct) {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      productVariant: p.productVariant as "thin" | "thick",
      sizeMm: String(p.sizeMm),
      sku: p.sku,
      description: p.description ?? "",
    });
  }

  async function saveEdit() {
    if (!editingId || !token) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editForm.name) payload.name = editForm.name;
      if (editForm.productVariant) payload.productVariant = editForm.productVariant;
      if (editForm.sizeMm) payload.sizeMm = parseInt(editForm.sizeMm, 10);
      if (editForm.sku) payload.sku = editForm.sku;
      payload.description = editForm.description || null;

      await apiPatch(`/api/ocular/products/${editingId}`, { body: payload, token });
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
      await apiDelete(`/api/ocular/products/${id}`, { token });
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive");
    }
  }

  async function createProduct() {
    if (!token) return;
    setSaving(true);
    try {
      await apiPost("/api/ocular/products", {
        body: {
          name: newForm.name,
          productVariant: newForm.productVariant,
          sizeMm: parseInt(newForm.sizeMm, 10),
          sku: newForm.sku,
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
    "w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500";

  function FormRow({
    form,
    onChange,
  }: {
    form: FormState;
    onChange: (k: keyof FormState, v: string) => void;
  }) {
    return (
      <tr className="bg-teal-50/40">
        <td className="px-3 py-2">
          <input className={inputCls} value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="Name*" />
        </td>
        <td className="px-3 py-2">
          <select
            className={inputCls}
            value={form.productVariant}
            onChange={(e) => onChange("productVariant", e.target.value)}
          >
            <option value="">Select variant*</option>
            <option value="thin">Thin (45μm)</option>
            <option value="thick">Thick (200μm)</option>
          </select>
        </td>
        <td className="px-3 py-2">
          <input className={inputCls} value={form.sizeMm} onChange={(e) => onChange("sizeMm", e.target.value)} placeholder="Size (mm)*" type="number" min="1" />
        </td>
        <td className="px-3 py-2">
          <input className={inputCls} value={form.sku} onChange={(e) => onChange("sku", e.target.value)} placeholder="SKU*" />
        </td>
        <td className="px-3 py-2">
          <input className={inputCls} value={form.description} onChange={(e) => onChange("description", e.target.value)} placeholder="Description" />
        </td>
        <td className="px-3 py-2" />
      </tr>
    );
  }

  const canSaveNew =
    newForm.name && newForm.productVariant && newForm.sizeMm && newForm.sku;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-slate-300"
          />
          Show archived
        </label>
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-teal-600 text-white hover:bg-teal-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Add SKU
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-teal-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-teal-50 border-b border-teal-100">
            <tr>
              <th className="text-left px-3 py-3 text-xs font-medium text-teal-800">Name</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-teal-800">Variant</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-teal-800">Size</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-teal-800">SKU</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-teal-800">Description</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {addingNew && (
              <>
                <FormRow
                  form={newForm}
                  onChange={(k, v) => setNewForm((f) => ({ ...f, [k]: v }))}
                />
                <tr className="bg-teal-50/40">
                  <td colSpan={6} className="px-3 py-2">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => void createProduct()}
                        disabled={saving || !canSaveNew}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
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
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">
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
                    <tr className="bg-teal-50/40">
                      <td colSpan={6} className="px-3 py-2">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => void saveEdit()}
                            disabled={saving}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
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
                    className={`hover:bg-teal-50/30 transition-colors ${p.archived ? "opacity-50" : ""}`}
                  >
                    <td className="px-3 py-3 font-medium text-teal-900">{p.name}</td>
                    <td className="px-3 py-3 text-slate-500">
                      {VARIANT_LABELS[p.productVariant] ?? p.productVariant}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{p.sizeMm}mm</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">{p.sku}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs max-w-48 truncate">{p.description ?? "—"}</td>
                    <td className="px-3 py-3 text-right">
                      {!p.archived && (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => startEdit(p)}
                            className="p-1.5 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
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
