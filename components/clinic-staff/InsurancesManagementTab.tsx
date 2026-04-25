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

type Insurance = {
  id: string;
  name: string;
  commercial: boolean;
  createdAt: string | null;
};

export function InsurancesManagementTab() {
  const token = useAuthStore((s) => s.jwt);

  const [insurances, setInsurances] = React.useState<Insurance[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingInsurance, setEditingInsurance] =
    React.useState<Insurance | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Insurance | null>(
    null,
  );
  const [deleting, setDeleting] = React.useState(false);
  const [commercialFilter, setCommercialFilter] = React.useState<
    "all" | "commercial" | "non-commercial"
  >("all");
  const itemsPerPage = 15;

  const refreshInsurances = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) {
        setError("Please sign in again.");
        return;
      }
      const res = await apiGet<{ success: true; data: Insurance[] }>(
        "/api/insurances",
        { token },
      );
      setInsurances(res.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load insurances";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void refreshInsurances();
  }, [refreshInsurances]);

  const openDeleteDialog = (insurance: Insurance) => {
    setDeleteTarget(insurance);
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
      const response = await fetch(`/api/insurances/${deleteTarget.id}`, {
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
        throw new Error(errorData?.error || "Failed to delete insurance");
      }

      await refreshInsurances();
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete insurance";
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async (data: { name: string; commercial: boolean }) => {
    try {
      const url = editingInsurance
        ? `/api/insurances/${editingInsurance.id}`
        : "/api/insurances";
      const method = editingInsurance ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error ?? "Failed to save insurance");
      }

      await refreshInsurances();
      setModalOpen(false);
      setEditingInsurance(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save insurance");
    }
  };

  const filtered = insurances.filter((ins) => {
    const matchesSearch =
      !searchQuery ||
      ins.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCommercial =
      commercialFilter === "all" ||
      (commercialFilter === "commercial" && ins.commercial) ||
      (commercialFilter === "non-commercial" && !ins.commercial);
    return matchesSearch && matchesCommercial;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="text-base font-semibold text-[#18192B]">
            Insurances
          </div>
          <div className="text-sm text-muted-foreground">
            Manage insurance payers and their commercial status
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingInsurance(null);
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
          Add Insurance
        </button>
      </div>

      {error && (
        <div className="bg-red-50 rounded-lg p-3 text-sm text-red-600 mb-3">
          {error}
        </div>
      )}

      <div className="text-sm text-muted-foreground mb-3">
        {loading ? "Loading…" : `${filtered.length} record(s)`}
      </div>

      <div className="w-full">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 py-4">
          <input
            type="text"
            placeholder="Search insurances..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="max-w-sm px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={commercialFilter}
            onChange={(e) => {
              setCommercialFilter(
                e.target.value as "all" | "commercial" | "non-commercial",
              );
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ height: "38px" }}
          >
            <option value="all">All Types</option>
            <option value="commercial">Commercial</option>
            <option value="non-commercial">Non-Commercial</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#18192B] text-white text-left">
                <th className="py-3 px-3 font-medium">Name</th>
                <th className="py-3 px-3 font-medium">Commercial</th>
                <th className="py-3 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, rIdx) => (
                  <tr
                    key={`skeleton-${rIdx}`}
                    className={rIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                  >
                    {Array.from({ length: 3 }).map((_, cIdx) => (
                      <td
                        key={`skeleton-${rIdx}-${cIdx}`}
                        className="py-4 px-3"
                      >
                        <div
                          className={`h-4 rounded bg-slate-200 animate-pulse ${
                            cIdx === 0 ? "w-3/4" : "w-1/3"
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={3} className="h-24 text-center text-gray-500">
                    No results.
                  </td>
                </tr>
              ) : (
                paginated.map((insurance, idx) => (
                  <tr
                    key={insurance.id}
                    className={`${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                    } hover:bg-gray-50`}
                  >
                    <td className="py-4 px-3 font-semibold">
                      {insurance.name}
                    </td>
                    <td className="py-4 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          insurance.commercial
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {insurance.commercial ? "Commercial" : "Non-Commercial"}
                      </span>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingInsurance(insurance);
                            setModalOpen(true);
                          }}
                          className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteDialog(insurance)}
                          className="px-3 py-1 rounded-md bg-red-600 text-white text-sm font-medium shadow hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between py-4">
          <span className="text-sm text-gray-500">
            {filtered.length > 0
              ? `Showing ${startIdx + 1}–${Math.min(startIdx + itemsPerPage, filtered.length)} of ${filtered.length}`
              : ""}
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || filtered.length === 0}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage >= totalPages || filtered.length === 0}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <InsuranceFormModal
          insurance={editingInsurance}
          onClose={() => {
            setModalOpen(false);
            setEditingInsurance(null);
          }}
          onSave={handleSave}
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
            <DialogTitle>Delete insurance?</DialogTitle>
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

function InsuranceFormModal({
  insurance,
  onClose,
  onSave,
}: {
  insurance: Insurance | null;
  onClose: () => void;
  onSave: (data: { name: string; commercial: boolean }) => Promise<void>;
}) {
  const [formData, setFormData] = React.useState({
    name: insurance?.name ?? "",
    commercial: insurance?.commercial ?? false,
  });
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave(formData);
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
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {insurance ? "Edit Insurance" : "Add Insurance"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="e.g. Aetna, UnitedHealthcare…"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Commercial Insurance?
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, commercial: true })}
                  className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                    formData.commercial
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Commercial
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, commercial: false })
                  }
                  className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                    !formData.commercial
                      ? "bg-slate-600 text-white border-slate-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Non-Commercial
                </button>
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
