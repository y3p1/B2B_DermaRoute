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

type Manufacturer = {
  id: string;
  name: string;
  commercial: boolean;
  quarter: number;
  year: number;
  createdAt: string | null;
};

export function ManufacturersManagementTab() {
  const token = useAuthStore((s) => s.jwt);

  const [manufacturers, setManufacturers] = React.useState<Manufacturer[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingManufacturer, setEditingManufacturer] =
    React.useState<Manufacturer | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Manufacturer | null>(
    null,
  );
  const [deleting, setDeleting] = React.useState(false);
  const itemsPerPage = 10;

  const refreshManufacturers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) {
        setError("Please sign in again.");
        return;
      }

      const res = await apiGet<{ success: true; data: Manufacturer[] }>(
        "/api/manufacturers",
        { token },
      );
      setManufacturers(res.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load manufacturers";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void refreshManufacturers();
  }, [refreshManufacturers]);

  const openDeleteDialog = (manufacturer: Manufacturer) => {
    setDeleteTarget(manufacturer);
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
      const response = await fetch(`/api/manufacturers/${deleteTarget.id}`, {
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
        throw new Error(errorData?.error || "Failed to delete manufacturer");
      }

      await refreshManufacturers();
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete manufacturer";
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async (data: {
    name: string;
    commercial: boolean;
    quarter: number;
    year: number;
  }) => {
    try {
      const url = editingManufacturer
        ? `/api/manufacturers/${editingManufacturer.id}`
        : "/api/manufacturers";
      const method = editingManufacturer ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save manufacturer");
      }

      await refreshManufacturers();
      setModalOpen(false);
      setEditingManufacturer(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save manufacturer");
    }
  };

  const filtered = manufacturers.filter(
    (m) =>
      !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="text-base font-semibold text-[#18192B]">
            Manufacturers
          </div>
          <div className="text-sm text-muted-foreground">
            Manage manufacturers and their details
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingManufacturer(null);
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
          Create Manufacturer
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
        <div className="flex items-center py-4">
          <input
            type="text"
            placeholder="Search manufacturers..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="max-w-sm px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#18192B] text-white text-left">
                <th className="py-3 px-3 font-medium">Name</th>
                <th className="py-3 px-3 font-medium">Type</th>
                <th className="py-3 px-3 font-medium">Quarter</th>
                <th className="py-3 px-3 font-medium">Year</th>
                <th className="py-3 px-3 font-medium">Actions</th>
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
                    {Array.from({ length: 5 }).map((_, cIdx) => (
                      <td
                        key={`skeleton-${rIdx}-${cIdx}`}
                        className="py-4 px-3"
                      >
                        <div
                          className={`h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse ${
                            cIdx === 0 ? "w-1/2" : "w-full"
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="h-24 text-center text-gray-500">
                    No results.
                  </td>
                </tr>
              ) : (
                paginated.map((manufacturer, idx) => (
                  <tr
                    key={manufacturer.id}
                    className={`${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                    } hover:bg-gray-50`}
                  >
                    <td className="py-4 px-3 font-semibold">
                      {manufacturer.name}
                    </td>
                    <td className="py-4 px-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          manufacturer.commercial
                            ? "bg-blue-100 text-blue-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {manufacturer.commercial
                          ? "Commercial"
                          : "Non-Commercial"}
                      </span>
                    </td>
                    <td className="py-4 px-3">Q{manufacturer.quarter}</td>
                    <td className="py-4 px-3">{manufacturer.year}</td>
                    <td className="py-4 px-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingManufacturer(manufacturer);
                            setModalOpen(true);
                          }}
                          className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteDialog(manufacturer)}
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

        <div className="flex items-center justify-end space-x-2 py-4">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || filtered?.length === 0}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage >= totalPages || filtered?.length === 0}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {modalOpen && (
        <ManufacturerFormModal
          manufacturer={editingManufacturer}
          onClose={() => {
            setModalOpen(false);
            setEditingManufacturer(null);
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
            <DialogTitle>Delete manufacturer?</DialogTitle>
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

function ManufacturerFormModal({
  manufacturer,
  onClose,
  onSave,
}: {
  manufacturer: Manufacturer | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    commercial: boolean;
    quarter: number;
    year: number;
  }) => Promise<void>;
}) {
  const [formData, setFormData] = React.useState({
    name: manufacturer?.name ?? "",
    commercial: manufacturer?.commercial ?? false,
    quarter: manufacturer?.quarter ?? 1,
    year: manufacturer?.year ?? new Date().getFullYear(),
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
            {manufacturer ? "Edit Manufacturer" : "Create Manufacturer"}
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
              />
            </div>

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
