"use client";

import * as React from "react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Product = {
  id: string;
  qCode: string | null;
  name: string;
  commercial: boolean;
  manufacturerId: string | null;
  manufacturerName: string | null;
  woundSizeId: string | null;
  woundSizeLabel: string | null;
  unitSize: number | null;
  payRatePerCm2: string | null;
  costPerCm2: string | null;
  payRatePerGraft: string | null;
  costPerGraft: string | null;
  estAoc100: string | null;
  estAoc80: string | null;
  commission: string | null;
  description: string | null;
  quarter: number;
  year: number;
  archived: boolean;
  createdAt: string | null;
};

type Manufacturer = {
  id: string;
  name: string;
  commercial: boolean;
  quarter: number;
  year: number;
};

type WoundSize = {
  id: string;
  key: string;
  label: string;
  areaCm2: string;
  category?: string;
};

export function ProductsManagementTab() {
  const token = useAuthStore((s) => s.jwt);

  const [products, setProducts] = React.useState<Product[]>([]);
  const [manufacturers, setManufacturers] = React.useState<Manufacturer[]>([]);
  const [woundSizes, setWoundSizes] = React.useState<WoundSize[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(
    null,
  );
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editGroupVariants, setEditGroupVariants] = React.useState<Product[]>([]);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Product | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const itemsPerPage = 10;

  type ProductGroup = {
    groupKey: string;
    name: string;
    qCode: string | null;
    manufacturerName: string | null;
    variants: Product[];
  };

  const [activeVariantMap, setActiveVariantMap] = React.useState<Record<string, string>>({});

  const refreshProducts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) {
        setError("Please sign in again.");
        return;
      }

      const res = await apiGet<{ success: true; data: Product[] }>(
        "/api/products",
        { token },
      );
      setProducts(res.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load products";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const refreshManufacturers = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiGet<{ success: true; data: Manufacturer[] }>(
        "/api/manufacturers",
        { token },
      );
      setManufacturers(res.data);
    } catch (err) {
      console.error("Failed to load manufacturers:", err);
    }
  }, [token]);

  const refreshWoundSizes = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiGet<{ success: true; data: WoundSize[] }>(
        "/api/wound-sizes",
        { token },
      );
      setWoundSizes(res.data);
    } catch (err) {
      console.error("Failed to load wound sizes:", err);
    }
  }, [token]);

  React.useEffect(() => {
    void refreshProducts();
    void refreshManufacturers();
    void refreshWoundSizes();
  }, [refreshProducts, refreshManufacturers, refreshWoundSizes]);

  const openDeleteDialog = (product: Product) => {
    setDeleteTarget(product);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (!token) {
      setError("Please sign in again.");
      setDeleteOpen(false);
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${deleteTarget.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errorData?.error || "Failed to delete product");
      }

      await refreshProducts();
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete product";
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async (data: {
    qCode?: string;
    name: string;
    commercial: boolean;
    manufacturerId?: string;
    woundSizeId?: string;
    woundSizeIds?: string[];
    unitSize?: number;
    payRatePerCm2?: string;
    costPerCm2?: string;
    payRatePerGraft?: string;
    costPerGraft?: string;
    estAoc100?: string;
    estAoc80?: string;
    description?: string;
    quarter: number;
    year: number;
  }) => {
    try {
      if (editingProduct) {
        // Editing: single PUT
        const response = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save product");
        }
      } else {
        // Creating: one POST per selected wound size
        const sizeIds = data.woundSizeIds && data.woundSizeIds.length > 0
          ? data.woundSizeIds
          : data.woundSizeId ? [data.woundSizeId] : [""];

        for (const sizeId of sizeIds) {
          const { woundSizeIds: _unused, ...baseData } = data as { woundSizeIds?: string[] } & typeof data;
          const payload = { ...baseData, woundSizeId: sizeId || undefined };
          const response = await fetch("/api/products", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to create product for size ${sizeId}`);
          }
        }
      }

      await refreshProducts();
      setModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save product");
    }
  };

  const filtered = products.filter(
    (p) =>
      !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Group products by name + manufacturerId
  const groupedProducts: ProductGroup[] = React.useMemo(() => {
    const groups = new Map<string, ProductGroup>();
    for (const p of filtered) {
      const key = `${p.name}_${p.manufacturerId}`;
      if (!groups.has(key)) {
        groups.set(key, {
          groupKey: key,
          name: p.name,
          qCode: p.qCode,
          manufacturerName: p.manufacturerName,
          variants: [],
        });
      }
      groups.get(key)!.variants.push(p);
    }
    // Sort variants by size label naturally within each group
    const result = Array.from(groups.values());
    for (const group of result) {
      group.variants.sort((a, b) => (a.woundSizeLabel || "").localeCompare(b.woundSizeLabel || ""));
    }
    // Sort groups alphabetically by product name
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [filtered]);

  // Ensure every group has an active variant
  React.useEffect(() => {
    setActiveVariantMap((prev) => {
      const next = { ...prev };
      let changed = false;
      groupedProducts.forEach((group) => {
        if (!next[group.groupKey] && group.variants.length > 0) {
          next[group.groupKey] = group.variants[0].id;
          changed = true;
        } else if (
          next[group.groupKey] &&
          !group.variants.some((v) => v.id === next[group.groupKey]) &&
          group.variants.length > 0
        ) {
          // Fallback if previous active variant was deleted
          next[group.groupKey] = group.variants[0].id;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [groupedProducts]);

  const totalPages = Math.ceil(groupedProducts.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedGroups = groupedProducts.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="text-base font-semibold text-[#18192B]">Products</div>
          <div className="text-sm text-muted-foreground">
            Manage products and their details
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingProduct(null);
            setModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Product
        </button>
      </div>

      {error && (
        <div className="bg-red-50 rounded-lg p-3 text-sm text-red-600 mb-3">
          {error}
        </div>
      )}

      <div className="text-sm text-muted-foreground mb-3">
        {loading ? "Loading…" : `${groupedProducts.length} product(s)`}
      </div>

      <div className="w-full">
        <div className="flex items-center py-4">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="max-w-sm px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#18192B] text-white text-left">
                <th className="py-3 px-3 font-medium whitespace-nowrap">
                  Q Code
                </th>
                <th className="py-3 px-3 font-medium whitespace-nowrap">
                  Product
                </th>
                <th className="py-3 px-3 font-medium whitespace-nowrap">
                  Manufacturer
                </th>
                <th className="py-3 px-3 font-medium whitespace-nowrap">
                  Size
                </th>
                <th className="py-3 px-3 font-medium whitespace-nowrap">
                  Unit Size
                </th>
                <th className="py-3 px-3 font-medium whitespace-nowrap">
                  Pay Rate/Cm²
                </th>
                <th className="py-3 px-3 font-medium whitespace-nowrap">
                  Cost/Cm²
                </th>
                <th className="py-3 px-3 font-medium whitespace-nowrap">
                  Pay Rate/Graft
                </th>
                <th className="py-3 px-3 font-medium whitespace-nowrap">
                  Cost/Graft
                </th>
                <th className="py-3 px-3 font-medium whitespace-nowrap">
                  Est AOC@100%
                </th>
                <th className="py-3 px-3 font-medium whitespace-nowrap">
                  Est AOC@80%
                </th>
                <th className="py-3 px-3 font-medium whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Skeleton rows to indicate table is loading
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr
                    key={`skeleton-${rIdx}`}
                    className={rIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                  >
                    {Array.from({ length: 12 }).map((_, cIdx) => (
                      <td
                        key={`skeleton-${rIdx}-${cIdx}`}
                        className="py-4 px-3"
                      >
                        <div
                          className={`h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse ${
                            cIdx === 0 ? "w-1/3" : "w-full"
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedGroups.length === 0 ? (
                <tr>
                  <td colSpan={12} className="h-24 text-center text-gray-500">
                    No results.
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((group, idx) => {
                  const activeVariantId = activeVariantMap[group.groupKey] || group.variants[0]?.id;
                  const activeVariant = group.variants.find(v => v.id === activeVariantId) || group.variants[0];

                  if (!activeVariant) return null;

                  return (
                    <tr
                      key={group.groupKey}
                      className={`${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                      } hover:bg-gray-50`}
                    >
                      <td className="py-4 px-3 whitespace-nowrap">
                        {group.qCode ?? "—"}
                      </td>
                      <td className="py-4 px-3 font-semibold whitespace-nowrap">
                        {group.name}
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        {group.manufacturerName ?? "—"}
                      </td>
                      <td className="py-3 px-3 min-w-[150px]">
                        {group.variants.length > 1 ? (
                          <select
                            value={activeVariantId}
                            onChange={(e) => {
                              setActiveVariantMap((prev) => ({
                                ...prev,
                                [group.groupKey]: e.target.value,
                              }));
                            }}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {group.variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.woundSizeLabel ?? "Unknown"}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="whitespace-nowrap">
                            {activeVariant.woundSizeLabel ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-3 text-center">
                        {activeVariant.unitSize ?? "—"}
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        {activeVariant.payRatePerCm2
                          ? `$${activeVariant.payRatePerCm2}`
                          : "—"}
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        {activeVariant.costPerCm2 ? `$${activeVariant.costPerCm2}` : "—"}
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        {activeVariant.payRatePerGraft
                          ? `$${activeVariant.payRatePerGraft}`
                          : "—"}
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        {activeVariant.costPerGraft ? `$${activeVariant.costPerGraft}` : "—"}
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        {activeVariant.estAoc100 ? `$${activeVariant.estAoc100}` : "—"}
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        {activeVariant.estAoc80 ? `$${activeVariant.estAoc80}` : "—"}
                      </td>
                      <td className="py-4 px-3">
                        <div className="flex gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setEditGroupVariants(group.variants);
                              setEditModalOpen(true);
                            }}
                            className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteDialog(activeVariant)}
                            className="px-3 py-1 rounded-md bg-red-600 text-white text-sm font-medium shadow hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end space-x-2 py-4">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || groupedProducts.length === 0}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage >= totalPages || groupedProducts.length === 0}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {modalOpen && (
        <ProductFormModal
          product={null}
          manufacturers={manufacturers}
          woundSizes={woundSizes}
          onClose={() => {
            setModalOpen(false);
            setEditingProduct(null);
          }}
          onSave={handleSave}
        />
      )}

      {editModalOpen && editGroupVariants.length > 0 && (
        <ProductEditModal
          variants={editGroupVariants}
          manufacturers={manufacturers}
          woundSizes={woundSizes}
          token={token}
          onClose={() => {
            setEditModalOpen(false);
            setEditGroupVariants([]);
          }}
          onRefresh={refreshProducts}
        />
      )}

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null);
          }
          setDeleteOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `This will permanently delete "${deleteTarget.name}".`
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductFormModal({
  product,
  manufacturers,
  woundSizes,
  onClose,
  onSave,
}: {
  product: Product | null;
  manufacturers: Manufacturer[];
  woundSizes: WoundSize[];
  onClose: () => void;
  onSave: (data: {
    qCode?: string;
    name: string;
    commercial: boolean;
    manufacturerId?: string;
    woundSizeId?: string;
    woundSizeIds?: string[];
    unitSize?: number;
    payRatePerCm2?: string;
    costPerCm2?: string;
    payRatePerGraft?: string;
    costPerGraft?: string;
    estAoc100?: string;
    estAoc80?: string;
    description?: string;
    quarter: number;
    year: number;
  }) => Promise<void>;
}) {
  const isEditing = !!product;
  const [formData, setFormData] = React.useState({
    qCode: product?.qCode ?? "",
    name: product?.name ?? "",
    commercial: product?.commercial ?? false,
    manufacturerId: product?.manufacturerId ?? "",
    woundSizeId: product?.woundSizeId ?? "",
    unitSize: product?.unitSize?.toString() ?? "",
    payRatePerCm2: product?.payRatePerCm2 ?? "",
    costPerCm2: product?.costPerCm2 ?? "",
    payRatePerGraft: product?.payRatePerGraft ?? "",
    costPerGraft: product?.costPerGraft ?? "",
    estAoc100: product?.estAoc100 ?? "",
    estAoc80: product?.estAoc80 ?? "",
    commission: product?.commission ?? "",
    autoCalc: true, // Auto-calculation on by default per user request
    description: product?.description ?? "",
    quarter: product?.quarter ?? 1,
    year: product?.year ?? new Date().getFullYear(),
  });
  // Multi-size selection for CREATE mode only
  const [selectedSizeIds, setSelectedSizeIds] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  // Filter manufacturers to only those matching the selected insurance type
  const filteredManufacturers = manufacturers.filter(
    (m) => m.commercial === formData.commercial,
  );

  const toggleSize = (id: string) => {
    setSelectedSizeIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      
      // Auto-calc logic if enabled and a relevant field changes
      if (next.autoCalc && (field === "unitSize" || field === "payRatePerCm2" || field === "commission")) {
        const commNum = parseFloat(next.commission);
        const unitSize = parseFloat(next.unitSize);
        const payRateCm2 = parseFloat(next.payRatePerCm2);
        
        if (!isNaN(payRateCm2)) {
          if (!isNaN(commNum)) {
            next.costPerCm2 = (payRateCm2 * commNum).toFixed(2);
          }
          if (!isNaN(unitSize)) {
            const payRateGraft = payRateCm2 * unitSize;
            next.payRatePerGraft = payRateGraft.toFixed(2);
            
            if (!isNaN(commNum)) {
              const costGraft = parseFloat(next.costPerCm2) * unitSize;
              next.costPerGraft = costGraft.toFixed(2);
              
              next.estAoc100 = (payRateGraft - costGraft).toFixed(2);
              next.estAoc80 = ((payRateGraft * 0.8) - costGraft).toFixed(2);
            }
          }
        }
      }
      
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing && selectedSizeIds.length === 0) {
      alert("Please select at least one wound size.");
      return;
    }
    setSubmitting(true);
    try {
      const submitData = {
        ...formData,
        unitSize:
          formData.unitSize === "" ? undefined : Number(formData.unitSize),
        ...(isEditing
          ? {}
          : { woundSizeIds: selectedSizeIds }),
      };
      await onSave(submitData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {product ? "Edit Product" : "Create Product"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Q Code</label>
                <input
                  type="text"
                  value={formData.qCode}
                  onChange={(e) =>
                    setFormData({ ...formData, qCode: e.target.value })
                  }
                  placeholder="Q4169, MUE-148, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Insurance Type must be selected first — it filters the manufacturer dropdown */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Insurance Type *
              </label>
              <select
                value={formData.commercial ? "true" : "false"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    commercial: e.target.value === "true",
                    // Reset manufacturer when type changes so stale selection is cleared
                    manufacturerId: "",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ height: "44px" }}
              >
                <option value="false">
                  Non-Commercial (Medicare / Medicaid)
                </option>
                <option value="true">Commercial</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Manufacturer
                </label>
                <select
                  value={formData.manufacturerId}
                  onChange={(e) =>
                    setFormData({ ...formData, manufacturerId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ height: "44px" }}
                >
                  <option value="">Select manufacturer...</option>
                  {filteredManufacturers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {filteredManufacturers.length === 0 && (
                  <p className="mt-1 text-xs text-orange-600">
                    No {formData.commercial ? "commercial" : "non-commercial"}{" "}
                    manufacturers found. Add one in the Manufacturers tab first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Wound Size{!isEditing && " (select multiple)"}
                </label>
                {isEditing ? (
                  <select
                    value={formData.woundSizeId}
                    onChange={(e) =>
                      setFormData({ ...formData, woundSizeId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ height: "44px" }}
                  >
                    <option value="">Select size...</option>
                    {(() => {
                      const discSizes = woundSizes.filter((ws) => ws.category === "disc");
                      const rectSizes = woundSizes.filter((ws) => ws.category !== "disc");
                      return (
                        <>
                          {discSizes.length > 0 && (
                            <optgroup label="Discs (Round)">
                              {discSizes.map((ws) => (
                                <option key={ws.id} value={ws.id}>
                                  {ws.label}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {rectSizes.length > 0 && (
                            <optgroup label="Square & Rectangular">
                              {rectSizes.map((ws) => (
                                <option key={ws.id} value={ws.id}>
                                  {ws.label}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      );
                    })()}
                  </select>
                ) : (
                  <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto p-2 space-y-1 bg-white">
                    {(() => {
                      const discSizes = woundSizes.filter((ws) => ws.category === "disc");
                      const rectSizes = woundSizes.filter((ws) => ws.category !== "disc");
                      return (
                        <>
                          {discSizes.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 py-1">Discs (Round)</div>
                              {discSizes.map((ws) => (
                                <label key={ws.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-50 cursor-pointer text-sm">
                                  <input
                                    type="checkbox"
                                    checked={selectedSizeIds.includes(ws.id)}
                                    onChange={() => toggleSize(ws.id)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  {ws.label}
                                </label>
                              ))}
                            </div>
                          )}
                          {rectSizes.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 py-1 mt-1">Square & Rectangular</div>
                              {rectSizes.map((ws) => (
                                <label key={ws.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-50 cursor-pointer text-sm">
                                  <input
                                    type="checkbox"
                                    checked={selectedSizeIds.includes(ws.id)}
                                    onChange={() => toggleSize(ws.id)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  {ws.label}
                                </label>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {selectedSizeIds.length > 0 && (
                      <div className="text-xs text-blue-600 font-medium mt-1 px-1">
                        {selectedSizeIds.length} size{selectedSizeIds.length > 1 ? "s" : ""} selected
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Unit Size *
              </label>
              <input
                type="number"
                required
                value={formData.unitSize}
                onChange={(e) => updateField("unitSize", e.target.value)}
                placeholder="2, 4, 16, 32, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Pay Rate Per Cm² *
                </label>
                <input
                  type="text"
                  required
                  value={formData.payRatePerCm2}
                  onChange={(e) => updateField("payRatePerCm2", e.target.value)}
                  placeholder="127.14"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Cost Per Cm²
                </label>
                <input
                  type="text"
                  value={formData.costPerCm2}
                  onChange={(e) => updateField("costPerCm2", e.target.value)}
                  placeholder="76.28"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Pay Rate Per Graft
                </label>
                <input
                  type="text"
                  value={formData.payRatePerGraft}
                  onChange={(e) => updateField("payRatePerGraft", e.target.value)}
                  placeholder="254.28"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Cost Per Graft
                </label>
                <input
                  type="text"
                  value={formData.costPerGraft}
                  onChange={(e) => updateField("costPerGraft", e.target.value)}
                  placeholder="178.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Est AOC @ 100%
                </label>
                <input
                  type="text"
                  value={formData.estAoc100}
                  onChange={(e) => updateField("estAoc100", e.target.value)}
                  placeholder="76.28"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Est AOC @ 80%
                </label>
                <input
                  type="text"
                  value={formData.estAoc80}
                  onChange={(e) => updateField("estAoc80", e.target.value)}
                  placeholder="25.43"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Commission & Auto-Calc Section */}
            <div className="border-t border-dashed border-gray-200 pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">Auto-Calculate Pricing</label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-gray-500">{formData.autoCalc ? "On" : "Off"}</span>
                  <div
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.autoCalc ? "bg-blue-600" : "bg-gray-300"
                    }`}
                    onClick={() => updateField("autoCalc", (!formData.autoCalc) as any)}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        formData.autoCalc ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </div>
                </label>
              </div>

              {formData.autoCalc && (
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">
                    Commission Rate (e.g. 0.6 = 60%)
                  </label>
                  <input
                    type="text"
                    value={formData.commission}
                    onChange={(e) => updateField("commission", e.target.value)}
                    placeholder="0.6"
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cost, Graft, and AOC fields are auto-calculated based on Unit Size, Pay Rate / cm², and Commission.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Quarter *
                </label>
                <select
                  required
                  value={formData.quarter}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quarter: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ height: "44px" }}
                >
                  <option value={1}>Q1</option>
                  <option value={2}>Q2</option>
                  <option value={3}>Q3</option>
                  <option value={4}>Q4</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Year *</label>
                <input
                  type="number"
                  required
                  min="2020"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ProductEditModal({
  variants,
  manufacturers,
  woundSizes,
  token,
  onClose,
  onRefresh,
}: {
  variants: Product[];
  manufacturers: Manufacturer[];
  woundSizes: WoundSize[];
  token: string | null;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  // Use the first variant for shared product info
  const firstVariant = variants[0];
  const [localVariants, setLocalVariants] = React.useState<Product[]>(variants);
  const [activeVariantId, setActiveVariantId] = React.useState(firstVariant.id);
  const [saving, setSaving] = React.useState(false);
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);
  const [showSizeManager, setShowSizeManager] = React.useState(false);
  const [addingSizes, setAddingSizes] = React.useState(false);

  // Shared product-level editable fields (apply to ALL variants)
  const [sharedData, setSharedData] = React.useState({
    qCode: firstVariant.qCode ?? "",
    manufacturerId: firstVariant.manufacturerId ?? "",
    commercial: firstVariant.commercial,
    quarter: firstVariant.quarter,
    year: firstVariant.year,
  });

  const activeVariant = localVariants.find((v) => v.id === activeVariantId) || localVariants[0];

  // Filter manufacturers based on selected insurance type
  const filteredManufacturers = manufacturers.filter(
    (m) => m.commercial === sharedData.commercial,
  );

  // Per-variant editable pricing fields
  const [perSizeData, setPerSizeData] = React.useState<
    Record<string, {
      unitSize: string;
      payRatePerCm2: string;
      costPerCm2: string;
      payRatePerGraft: string;
      costPerGraft: string;
      estAoc100: string;
      estAoc80: string;
      commission: string;
      autoCalc: boolean;
      description: string;
    }>
  >(() => {
    const map: Record<string, {
      unitSize: string;
      payRatePerCm2: string;
      costPerCm2: string;
      payRatePerGraft: string;
      costPerGraft: string;
      estAoc100: string;
      estAoc80: string;
      commission: string;
      autoCalc: boolean;
      description: string;
    }> = {};
    for (const v of variants) {
      map[v.id] = {
        unitSize: v.unitSize?.toString() ?? "",
        payRatePerCm2: v.payRatePerCm2 ?? "",
        costPerCm2: v.costPerCm2 ?? "",
        payRatePerGraft: v.payRatePerGraft ?? "",
        costPerGraft: v.costPerGraft ?? "",
        estAoc100: v.estAoc100 ?? "",
        estAoc80: v.estAoc80 ?? "",
        commission: v.commission ?? "",
        autoCalc: true, // Universally enabled by default
        description: v.description ?? "",
      };
    }
    return map;
  });

  const currentData = perSizeData[activeVariant.id] ?? {
    unitSize: "", payRatePerCm2: "", costPerCm2: "",
    payRatePerGraft: "", costPerGraft: "", estAoc100: "", estAoc80: "",
    commission: "", autoCalc: false, description: "",
  };

  const updateField = (field: string, value: string) => {
    setPerSizeData((prev) => {
      const current = prev[activeVariant.id];
      const next = { ...current, [field]: value };
      
      // Auto-calc logic if enabled and a relevant field changes
      if (next.autoCalc && (field === "unitSize" || field === "payRatePerCm2" || field === "commission")) {
        const commNum = parseFloat(next.commission);
        const unitSize = parseFloat(next.unitSize);
        const payRateCm2 = parseFloat(next.payRatePerCm2);
        
        if (!isNaN(payRateCm2)) {
          if (!isNaN(commNum)) {
            next.costPerCm2 = (payRateCm2 * commNum).toFixed(2);
          }
          if (!isNaN(unitSize)) {
            const payRateGraft = payRateCm2 * unitSize;
            next.payRatePerGraft = payRateGraft.toFixed(2);
            
            if (!isNaN(commNum)) {
              const costGraft = parseFloat(next.costPerCm2) * unitSize;
              next.costPerGraft = costGraft.toFixed(2);
              
              next.estAoc100 = (payRateGraft - costGraft).toFixed(2);
              next.estAoc80 = ((payRateGraft * 0.8) - costGraft).toFixed(2);
            }
          }
        }
      }
      
      return { ...prev, [activeVariant.id]: next };
    });
    setSaveMsg(null);
  };

  // Build payload for a single variant
  const buildPayload = (variantId: string, variant: Product) => {
    const data = perSizeData[variantId];
    if (!data) return null;
    return {
      qCode: sharedData.qCode || undefined,
      name: firstVariant.name,
      commercial: sharedData.commercial,
      manufacturerId: sharedData.manufacturerId || undefined,
      woundSizeId: variant.woundSizeId,
      unitSize: data.unitSize ? Number(data.unitSize) : undefined,
      payRatePerCm2: data.payRatePerCm2 || undefined,
      costPerCm2: data.costPerCm2 || undefined,
      payRatePerGraft: data.payRatePerGraft || undefined,
      costPerGraft: data.costPerGraft || undefined,
      estAoc100: data.estAoc100 || undefined,
      estAoc80: data.estAoc80 || undefined,
      commission: data.commission || undefined,
      description: data.description || undefined,
      quarter: sharedData.quarter,
      year: sharedData.year,
    };
  };

  // Save only the currently active variant
  const handleApplyChanges = async () => {
    if (!token) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = buildPayload(activeVariant.id, activeVariant);
      if (!payload) throw new Error("No data found for this variant");
      const response = await fetch(`/api/products/${activeVariant.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update");
      }
      setSaveMsg("Changes saved successfully!");
      await onRefresh();
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Save ALL variants at once (atomic "Save All Changes")
  const [savingAll, setSavingAll] = React.useState(false);
  const handleSaveAll = async () => {
    if (!token) return;
    setSavingAll(true);
    setSaveMsg(null);
    try {
      const errors: string[] = [];
      for (const variant of localVariants) {
        const payload = buildPayload(variant.id, variant);
        if (!payload) continue;
        const response = await fetch(`/api/products/${variant.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => null) as { error?: string } | null;
          errors.push(errorData?.error || `Failed to update variant ${variant.woundSizeLabel}`);
        }
      }
      if (errors.length > 0) {
        setSaveMsg(`${errors.length} error(s): ${errors.join("; ")}`);
      } else {
        setSaveMsg(`All ${localVariants.length} variant(s) saved successfully!`);
      }
      await onRefresh();
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Failed to save all");
    } finally {
      setSavingAll(false);
    }
  };

  // Wound sizes this product currently has
  const existingSizeIds = new Set(localVariants.map((v) => v.woundSizeId).filter(Boolean));
  // Wound sizes available to add
  const availableToAdd = woundSizes.filter((ws) => !existingSizeIds.has(ws.id));

  const [sizesToAdd, setSizesToAdd] = React.useState<string[]>([]);
  const [confirmRemoveId, setConfirmRemoveId] = React.useState<string | null>(null);

  const handleAddSizes = async () => {
    if (!token || sizesToAdd.length === 0) return;
    setAddingSizes(true);
    setSaveMsg(null);
    try {
      for (const sizeId of sizesToAdd) {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            qCode: firstVariant.qCode || undefined,
            name: firstVariant.name,
            commercial: firstVariant.commercial,
            manufacturerId: firstVariant.manufacturerId,
            woundSizeId: sizeId,
            quarter: firstVariant.quarter,
            year: firstVariant.year,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to add size");
        }
      }
      setSizesToAdd([]);
      setSaveMsg(`${sizesToAdd.length} size(s) added!`);
      await onRefresh();
      // Close and reopen to refresh variants
      onClose();
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Failed to add sizes");
    } finally {
      setAddingSizes(false);
    }
  };

  const handleRemoveSize = async (variantId: string) => {
    if (!token) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const response = await fetch(`/api/products/${variantId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove size");
      }
      // Remove from local state
      const updated = localVariants.filter((v) => v.id !== variantId);
      setLocalVariants(updated);
      if (activeVariantId === variantId && updated.length > 0) {
        setActiveVariantId(updated[0].id);
      }
      // Initialize per-size data for remaining
      setPerSizeData((prev) => {
        const next = { ...prev };
        delete next[variantId];
        return next;
      });
      setConfirmRemoveId(null);
      setSaveMsg("Size removed.");
      await onRefresh();
      if (updated.length === 0) {
        onClose();
      }
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Failed to remove size");
    } finally {
      setSaving(false);
    }
  };

  // filteredManufacturers is now computed above with sharedData.commercial

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">
              Edit Product — {firstVariant.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Shared Product Info (editable) */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 space-y-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Product Details</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Q Code</label>
                <input
                  type="text"
                  value={sharedData.qCode}
                  onChange={(e) => {
                    setSharedData({ ...sharedData, qCode: e.target.value });
                    setSaveMsg(null);
                  }}
                  placeholder="Q4169, MUE-148, etc."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Insurance Type</label>
                <select
                  value={sharedData.commercial ? "true" : "false"}
                  onChange={(e) => {
                    setSharedData({
                      ...sharedData,
                      commercial: e.target.value === "true",
                      manufacturerId: "",
                    });
                    setSaveMsg(null);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ height: "38px" }}
                >
                  <option value="false">Non-Commercial (Medicare / Medicaid)</option>
                  <option value="true">Commercial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Manufacturer</label>
                <select
                  value={sharedData.manufacturerId}
                  onChange={(e) => {
                    setSharedData({ ...sharedData, manufacturerId: e.target.value });
                    setSaveMsg(null);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ height: "38px" }}
                >
                  <option value="">Select manufacturer...</option>
                  {filteredManufacturers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quarter</label>
                  <select
                    value={sharedData.quarter}
                    onChange={(e) => {
                      setSharedData({ ...sharedData, quarter: Number(e.target.value) });
                      setSaveMsg(null);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ height: "38px" }}
                  >
                    <option value={1}>Q1</option>
                    <option value={2}>Q2</option>
                    <option value={3}>Q3</option>
                    <option value={4}>Q4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                  <input
                    type="number"
                    min="2020"
                    value={sharedData.year}
                    onChange={(e) => {
                      setSharedData({ ...sharedData, year: Number(e.target.value) });
                      setSaveMsg(null);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Wound Size Tabs */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wound Size Variant
            </label>
            <div className="flex flex-wrap gap-2">
              {localVariants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setActiveVariantId(v.id);
                    setSaveMsg(null);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                    activeVariantId === v.id
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {v.woundSizeLabel ?? "Unknown"}
                </button>
              ))}
            </div>
          </div>

          {/* Per-Size Pricing Fields */}
          <div className="space-y-4 border border-gray-200 rounded-lg p-4 bg-white">
            <div className="text-sm font-semibold text-gray-700 border-b pb-2">
              Pricing for: <span className="text-blue-600">{activeVariant.woundSizeLabel ?? "Unknown"}</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit Size</label>
              <input
                type="number"
                value={currentData.unitSize}
                onChange={(e) => updateField("unitSize", e.target.value)}
                placeholder="2, 4, 16..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pay Rate / cm²</label>
                <input
                  type="text"
                  value={currentData.payRatePerCm2}
                  onChange={(e) => updateField("payRatePerCm2", e.target.value)}
                  placeholder="127.14"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cost / cm²</label>
                <input
                  type="text"
                  value={currentData.costPerCm2}
                  onChange={(e) => updateField("costPerCm2", e.target.value)}
                  placeholder="76.28"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pay Rate / Graft</label>
                <input
                  type="text"
                  value={currentData.payRatePerGraft}
                  onChange={(e) => updateField("payRatePerGraft", e.target.value)}
                  placeholder="254.28"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cost / Graft</label>
                <input
                  type="text"
                  value={currentData.costPerGraft}
                  onChange={(e) => updateField("costPerGraft", e.target.value)}
                  placeholder="178.00"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Est AOC @ 100%</label>
                <input
                  type="text"
                  value={currentData.estAoc100}
                  onChange={(e) => updateField("estAoc100", e.target.value)}
                  placeholder="1500.00"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Est AOC @ 80%</label>
                <input
                  type="text"
                  value={currentData.estAoc80}
                  onChange={(e) => updateField("estAoc80", e.target.value)}
                  placeholder="1200.00"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea
                value={currentData.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Commission & Auto-Calc Section */}
            <div className="border-t border-dashed border-gray-200 pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Auto-Calculate Pricing</label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500">{currentData.autoCalc ? "On" : "Off"}</span>
                  <div
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      currentData.autoCalc ? "bg-blue-600" : "bg-gray-300"
                    }`}
                    onClick={() => {
                      const newVal = !currentData.autoCalc;
                      setPerSizeData((prev) => ({
                        ...prev,
                        [activeVariant.id]: { ...prev[activeVariant.id], autoCalc: newVal },
                      }));
                      setSaveMsg(null);
                    }}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        currentData.autoCalc ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </label>
              </div>

              {currentData.autoCalc && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Commission Rate (e.g. 0.6 = 60%)
                  </label>
                  <input
                    type="text"
                    value={currentData.commission}
                    onChange={(e) => updateField("commission", e.target.value)}
                    placeholder="0.6"
                    className="w-full px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Cost, Graft, and AOC fields are auto-calculated based on Unit Size, Pay Rate / cm², and Commission. Toggle off to enter manually.
                  </p>
                </div>
              )}
            </div>

            {/* Save This Size / Save All Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleApplyChanges}
                disabled={saving || savingAll}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Save This Size"}
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving || savingAll}
                className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {savingAll ? "Saving All..." : `Save All Changes (${localVariants.length})`}
              </button>
              {saveMsg && (
                <span className={`text-sm font-medium ${saveMsg.includes("success") || saveMsg.includes("saved") ? "text-green-600" : "text-red-500"}`}>
                  {saveMsg}
                </span>
              )}
            </div>
          </div>

          {/* Add / Remove Wound Sizes Section */}
          <div className="mt-4 border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => setShowSizeManager(!showSizeManager)}
              className="w-full px-4 py-3 text-sm font-semibold text-left text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <span>Add / Remove Wound Sizes</span>
              <span className="text-gray-400">{showSizeManager ? "▲" : "▼"}</span>
            </button>

            {showSizeManager && (
              <div className="px-4 pb-4 space-y-4">
                {/* Current sizes with remove option */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Current Sizes ({localVariants.length})
                  </div>
                  <div className="space-y-1">
                    {localVariants.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-md text-sm"
                      >
                        <span className="font-medium text-green-800">
                          {v.woundSizeLabel ?? "Unknown"}
                        </span>
                        {localVariants.length > 1 ? (
                          confirmRemoveId === v.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600">Remove?</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSize(v.id)}
                                disabled={saving}
                                className="px-2 py-0.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRemoveId(null)}
                                className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveId(v.id)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium"
                            >
                              Remove
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-gray-400 italic">Last size</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add new sizes */}
                {availableToAdd.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Add Sizes
                    </div>
                    <div className="border border-gray-300 rounded-md max-h-40 overflow-y-auto p-2 space-y-1 bg-white">
                      {(() => {
                        const discSizes = availableToAdd.filter((ws) => ws.category === "disc");
                        const rectSizes = availableToAdd.filter((ws) => ws.category !== "disc");
                        return (
                          <>
                            {discSizes.length > 0 && (
                              <div>
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 py-0.5">
                                  Discs
                                </div>
                                {discSizes.map((ws) => (
                                  <label
                                    key={ws.id}
                                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-50 cursor-pointer text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={sizesToAdd.includes(ws.id)}
                                      onChange={() =>
                                        setSizesToAdd((prev) =>
                                          prev.includes(ws.id)
                                            ? prev.filter((s) => s !== ws.id)
                                            : [...prev, ws.id],
                                        )
                                      }
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    {ws.label}
                                  </label>
                                ))}
                              </div>
                            )}
                            {rectSizes.length > 0 && (
                              <div>
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 py-0.5 mt-1">
                                  Square & Rectangular
                                </div>
                                {rectSizes.map((ws) => (
                                  <label
                                    key={ws.id}
                                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-50 cursor-pointer text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={sizesToAdd.includes(ws.id)}
                                      onChange={() =>
                                        setSizesToAdd((prev) =>
                                          prev.includes(ws.id)
                                            ? prev.filter((s) => s !== ws.id)
                                            : [...prev, ws.id],
                                        )
                                      }
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    {ws.label}
                                  </label>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    {sizesToAdd.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAddSizes}
                        disabled={addingSizes}
                        className="mt-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {addingSizes ? "Adding..." : `Add ${sizesToAdd.length} Size(s)`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
