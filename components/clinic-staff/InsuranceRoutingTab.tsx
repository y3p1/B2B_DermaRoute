"use client";

import * as React from "react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Insurance = {
  id: string;
  name: string;
  commercial: boolean;
};

type Manufacturer = {
  id: string;
  name: string;
  commercial: boolean;
};

type RouteRow = {
  id: string;
  insuranceId: string;
  insuranceName: string;
  insuranceCommercial: boolean;
  manufacturerId: string;
  manufacturerName: string;
};

export function InsuranceRoutingTab() {
  const token = useAuthStore((s) => s.jwt);

  const [insurances, setInsurances] = React.useState<Insurance[]>([]);
  const [manufacturers, setManufacturers] = React.useState<Manufacturer[]>([]);
  const [routes, setRoutes] = React.useState<RouteRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 15;

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingInsurance, setEditingInsurance] =
    React.useState<Insurance | null>(null);
  const [selectedManufacturerIds, setSelectedManufacturerIds] = React.useState<
    Set<string>
  >(new Set());
  const [saving, setSaving] = React.useState(false);

  const refreshData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) {
        setError("Please sign in again.");
        return;
      }
      const [insRes, mfgRes, routesRes] = await Promise.all([
        apiGet<{ success: true; data: Insurance[] }>("/api/insurances", {
          token,
        }),
        apiGet<{ success: true; data: Manufacturer[] }>("/api/manufacturers", {
          token,
        }),
        apiGet<{ success: true; data: RouteRow[] }>("/api/insurance-routing", {
          token,
        }),
      ]);
      setInsurances(insRes.data);
      setManufacturers(mfgRes.data);
      setRoutes(routesRes.data);
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

  const routeCountByInsurance = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const route of routes) {
      counts[route.insuranceId] = (counts[route.insuranceId] || 0) + 1;
    }
    return counts;
  }, [routes]);

  const openEditModal = (insurance: Insurance) => {
    setEditingInsurance(insurance);
    // Pre-select currently mapped manufacturers
    const currentIds = new Set(
      routes
        .filter((r) => r.insuranceId === insurance.id)
        .map((r) => r.manufacturerId),
    );
    setSelectedManufacturerIds(currentIds);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingInsurance || !token) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/insurance-routing", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          insuranceId: editingInsurance.id,
          manufacturerIds: Array.from(selectedManufacturerIds),
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errorData?.error || "Failed to save routing rules");
      }

      await refreshData();
      setModalOpen(false);
      setEditingInsurance(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save routing rules";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleManufacturer = (id: string) => {
    setSelectedManufacturerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filtered = insurances.filter(
    (ins) =>
      !searchQuery ||
      ins.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="text-base font-semibold text-[#18192B]">
            Insurance Routing
          </div>
          <div className="text-sm text-muted-foreground">
            Configure which manufacturers are available for each insurance. When
            no routing rules exist, the commercial flag is used as a fallback.
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 rounded-lg p-3 text-sm text-red-600 mb-3">
          {error}
        </div>
      )}

      <div className="text-sm text-muted-foreground mb-3">
        {loading ? "Loading..." : `${filtered.length} insurance(s)`}
      </div>

      <div className="w-full">
        <div className="flex items-center py-4">
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
        </div>

        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#18192B] text-white text-left">
                <th className="py-3 px-3 font-medium">Insurance Name</th>
                <th className="py-3 px-3 font-medium">Type</th>
                <th className="py-3 px-3 font-medium">Mapped Manufacturers</th>
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
                    {Array.from({ length: 4 }).map((_, cIdx) => (
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
                  <td colSpan={4} className="h-24 text-center text-gray-500">
                    No results.
                  </td>
                </tr>
              ) : (
                paginated.map((insurance, idx) => {
                  const count = routeCountByInsurance[insurance.id] || 0;
                  return (
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
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {insurance.commercial
                            ? "Commercial"
                            : "Non-Commercial"}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        {count > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {count} manufacturer{count !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Using fallback (commercial flag)
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-3">
                        <button
                          type="button"
                          onClick={() => openEditModal(insurance)}
                          className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 transition-colors"
                        >
                          Edit Routing
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between py-4">
          <span className="text-sm text-gray-500">
            {filtered.length > 0
              ? `Showing ${startIdx + 1}-${Math.min(startIdx + itemsPerPage, filtered.length)} of ${filtered.length}`
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

      {/* Edit Routing Modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setEditingInsurance(null);
          }
          setModalOpen(open);
        }}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Routing: {editingInsurance?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <p className="text-sm text-gray-500 mb-4">
              Select which manufacturers should be available when this insurance
              is selected. If none are selected, the system will fall back to
              filtering by the commercial flag.
            </p>

            <div className="text-xs text-gray-400 mb-3">
              {selectedManufacturerIds.size} of {manufacturers.length} selected
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto border rounded-md p-3">
              {manufacturers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No manufacturers found.
                </p>
              ) : (
                manufacturers.map((mfg) => (
                  <label
                    key={mfg.id}
                    className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedManufacturerIds.has(mfg.id)}
                      onChange={() => toggleManufacturer(mfg.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900 flex-1">
                      {mfg.name}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        mfg.commercial
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {mfg.commercial ? "Commercial" : "Non-Commercial"}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? "Saving..." : "Save Routing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
