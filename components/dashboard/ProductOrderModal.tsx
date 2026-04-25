"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth";
import { apiGet, apiPost } from "@/lib/apiClient";

type BvRequest = {
  id: string;
  provider: string | null;
  practice: string | null;
  woundType: string | null;
  woundSize: string | null;
  woundLocation: string | null;
  insurance: string | null;
  placeOfService: string | null;
  icd10: string | null;
  applicationDate: string | null;
  deliveryDate: string | null;
  initials: string | null;
  status: string;
  createdAt: string | null;
};

type Manufacturer = {
  id: string;
  name: string;
  commercial: boolean;
};

type Product = {
  id: string;
  name: string;
  qCode: string | null;
  manufacturerId: string;
  commercial: boolean;
};

type Insurance = {
  id: string;
  name: string;
  commercial: boolean;
};

export default function ProductOrderModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const token = useAuthStore((s) => s.jwt);

  const [bvRequests, setBvRequests] = React.useState<BvRequest[]>([]);
  const [insurances, setInsurances] = React.useState<Insurance[]>([]);
  const [manufacturers, setManufacturers] = React.useState<Manufacturer[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = React.useState<Product[]>([]);

  const [selectedBvId, setSelectedBvId] = React.useState("");
  const [selectedBvRequest, setSelectedBvRequest] =
    React.useState<BvRequest | null>(null);
  // null = not yet determined (no BV selected or insurance name not found)
  const [isCommercial, setIsCommercial] = React.useState<boolean | null>(null);
  const [matchedInsuranceId, setMatchedInsuranceId] = React.useState<
    string | null
  >(null);
  const [selectedManufacturerId, setSelectedManufacturerId] =
    React.useState("");
  const [selectedProductId, setSelectedProductId] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [isFetchingDropdowns, setIsFetchingDropdowns] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const formatBvRequestDate = React.useCallback((bv: BvRequest) => {
    const rawDate = bv.applicationDate || bv.createdAt;

    if (!rawDate) return "No date";

    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return rawDate;
    }

    return parsedDate.toLocaleDateString();
  }, []);

  const formatBvOptionLabel = React.useCallback(
    (bv: BvRequest) => {
      const practice = bv.practice || "Unknown Practice";
      const woundType = bv.woundType || "N/A";
      const woundSize = bv.woundSize || "N/A";
      const woundLocation = bv.woundLocation || "N/A";
      const requestDate = formatBvRequestDate(bv);

      return `${practice} - BV ID: ${bv.id} (type: ${woundType}, size: ${woundSize}, location: ${woundLocation}, date: ${requestDate})`;
    },
    [formatBvRequestDate],
  );

  // Fetch approved BV requests and insurances when the modal opens
  React.useEffect(() => {
    const fetchInitialData = async () => {
      if (!open || !token) return;

      setLoading(true);
      setError(null);

      try {
        const [bvRes, insRes] = await Promise.all([
          apiGet<{ success: true; data: BvRequest[] }>("/api/bv-requests", {
            token,
          }),
          apiGet<{ success: true; data: Insurance[] }>("/api/insurances", {
            token,
          }),
        ]);

        const approvedBvs = (bvRes.data || []).filter(
          (bv) => bv.status === "approved",
        );
        setBvRequests(approvedBvs);
        setInsurances(insRes.data || []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load data";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchInitialData();
  }, [open, token]);

  // Fetch manufacturers (via routing table) and products when a BV is selected
  React.useEffect(() => {
    const fetchDropdownData = async () => {
      if (!token) return;

      setIsFetchingDropdowns(true);
      setError(null);
      setSelectedManufacturerId("");
      setSelectedProductId("");
      setFilteredProducts([]);

      try {
        // Use routing endpoint if we have a matched insurance ID (handles routing table + fallback server-side)
        // Otherwise fall back to commercial flag filtering
        const mfgPromise = matchedInsuranceId
          ? apiGet<{ success: true; data: Manufacturer[] }>(
              `/api/insurance-routing/manufacturers?insuranceId=${matchedInsuranceId}`,
              { token },
            )
          : apiGet<{ success: true; data: Manufacturer[] }>(
              `/api/manufacturers`,
              { token },
            );

        const prodParams =
          isCommercial !== null ? `?commercial=${isCommercial.toString()}` : "";

        const [mfgRes, prodRes] = await Promise.all([
          mfgPromise,
          apiGet<{ success: true; data: Product[] }>(
            `/api/products${prodParams}`,
            { token },
          ),
        ]);

        setManufacturers(mfgRes.data || []);
        setProducts(prodRes.data || []);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load manufacturers/products";
        setError(message);
      } finally {
        setIsFetchingDropdowns(false);
      }
    };

    // Only fetch if a BV request has been selected
    if (selectedBvRequest) {
      void fetchDropdownData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedInsuranceId, isCommercial, selectedBvRequest?.id, token]);

  // Filter products by selected manufacturer
  React.useEffect(() => {
    if (selectedManufacturerId) {
      const filtered = products.filter(
        (p) => p.manufacturerId === selectedManufacturerId,
      );
      setFilteredProducts(filtered);

      // Reset product selection if current selection is not in filtered list
      if (
        selectedProductId &&
        !filtered.some((p) => p.id === selectedProductId)
      ) {
        setSelectedProductId("");
      }
    } else {
      setFilteredProducts([]);
    }
  }, [selectedManufacturerId, products, selectedProductId]);

  const handleClose = () => {
    setSelectedBvId("");
    setSelectedBvRequest(null);
    setIsCommercial(null);
    setMatchedInsuranceId(null);
    setSelectedManufacturerId("");
    setSelectedProductId("");
    setManufacturers([]);
    setProducts([]);
    setFilteredProducts([]);
    setError(null);
    onOpenChange(false);
  };

  const handleBvRequestChange = (bvId: string) => {
    setSelectedBvId(bvId);
    const bvRequest = bvRequests.find((bv) => bv.id === bvId) ?? null;
    setSelectedBvRequest(bvRequest);

    if (bvRequest) {
      // Look up the insurance by name to determine commercial flag and ID
      const insuranceName = bvRequest.insurance?.trim().toLowerCase();
      const matched = insurances.find(
        (ins) => ins.name.trim().toLowerCase() === insuranceName,
      );
      // If matched, use its commercial flag; otherwise null (show all)
      setIsCommercial(matched ? matched.commercial : null);
      setMatchedInsuranceId(matched ? matched.id : null);
    } else {
      setIsCommercial(null);
      setMatchedInsuranceId(null);
      setManufacturers([]);
      setProducts([]);
      setFilteredProducts([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBvId || !selectedManufacturerId || !selectedProductId) {
      setError("Please select all required fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (!token) {
        setError("Please sign in again.");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        bvRequestId: selectedBvId,
        manufacturerId: selectedManufacturerId,
        productId: selectedProductId,
      };

      await apiPost<{ success: true }, typeof payload>(
        "/api/order-products",
        payload,
        { token },
      );

      // Only close modal on success
      onCreated?.();
      handleClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create product order";
      setError(message);
      // Don't close modal on error - let user see the error and try again
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-[90vw] max-w-4xl p-0 max-h-[98vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl font-bold text-[#18192B]">
            Create Product Order
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          {error && (
            <div className="bg-red-50 rounded-lg p-3 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-6 animate-pulse">
              {/* Skeleton for Approved BV Form Dropdown */}
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                <div className="w-full h-10 bg-gray-200 rounded-md"></div>
              </div>

              {/* Skeleton for Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <div className="h-10 w-20 bg-gray-200 rounded-md"></div>
                <div className="h-10 w-20 bg-gray-200 rounded-md"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Approved BV Form Dropdown */}
              <div className="space-y-2">
                <Label
                  htmlFor="bvRequest"
                  className="text-sm font-medium text-gray-700"
                >
                  Approved BV Form <span className="text-red-500">*</span>
                </Label>
                <select
                  id="bvRequest"
                  value={selectedBvId}
                  onChange={(e) => handleBvRequestChange(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select an approved BV form...</option>
                  {bvRequests.map((bv) => (
                    <option key={bv.id} value={bv.id}>
                      {formatBvOptionLabel(bv)}
                    </option>
                  ))}
                </select>
                {bvRequests.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No approved BV forms available. Please ensure BV requests
                    are approved first.
                  </p>
                )}
              </div>

              {/* BV Request Details (Read-only) */}
              {selectedBvRequest && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                  <div className="text-sm font-semibold text-gray-700 mb-3">
                    BV Request Details
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Practice */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">
                        Practice
                      </Label>
                      <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">
                        {selectedBvRequest.practice || "N/A"}
                      </div>
                    </div>

                    {/* Provider */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">
                        Provider
                      </Label>
                      <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">
                        {selectedBvRequest.provider || "N/A"}
                      </div>
                    </div>

                    {/* Place of Service */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">
                        Place of Service
                      </Label>
                      <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">
                        {selectedBvRequest.placeOfService || "N/A"}
                      </div>
                    </div>

                    {/* Insurance */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">
                        Insurance
                      </Label>
                      <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200 flex items-center gap-2">
                        <span>{selectedBvRequest.insurance || "N/A"}</span>
                        {isCommercial !== null && (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              isCommercial
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {isCommercial ? "Commercial" : "Non-Commercial"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Wound Type */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">
                        Wound Type
                      </Label>
                      <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">
                        {selectedBvRequest.woundType || "N/A"}
                      </div>
                    </div>

                    {/* Wound Size */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">
                        Wound Size
                      </Label>
                      <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">
                        {selectedBvRequest.woundSize || "N/A"}
                      </div>
                    </div>

                    {/* Wound Location */}
                    {selectedBvRequest.woundLocation && (
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-600">
                          Wound Location
                        </Label>
                        <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">
                          {selectedBvRequest.woundLocation}
                        </div>
                      </div>
                    )}

                    {/* ICD-10 */}
                    {selectedBvRequest.icd10 && (
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-600">
                          ICD-10 Code
                        </Label>
                        <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">
                          {selectedBvRequest.icd10}
                        </div>
                      </div>
                    )}

                    {/* Patient Initials */}
                    {selectedBvRequest.initials && (
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-600">
                          Patient Initials
                        </Label>
                        <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">
                          {selectedBvRequest.initials}
                        </div>
                      </div>
                    )}

                    {/* Application Date */}
                    {selectedBvRequest.applicationDate && (
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-600">
                          Application Date
                        </Label>
                        <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">
                          {selectedBvRequest.applicationDate}
                        </div>
                      </div>
                    )}

                    {/* Delivery Date */}
                    {selectedBvRequest.deliveryDate && (
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-600">
                          Delivery Date
                        </Label>
                        <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">
                          {selectedBvRequest.deliveryDate}
                        </div>
                      </div>
                    )}

                    {/* Status */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">
                        BV Status
                      </Label>
                      <div className="text-sm px-3 py-2 bg-white rounded-md border border-gray-200">
                        <span className="inline-flex px-3 py-1 rounded-full text-xs bg-green-100 text-green-800 font-medium">
                          {selectedBvRequest.status}
                        </span>
                      </div>
                    </div>

                    {/* Created At */}
                    {selectedBvRequest.createdAt && (
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-600">
                          BV Request Date
                        </Label>
                        <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">
                          {new Date(
                            selectedBvRequest.createdAt,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Insurance type notice when insurance name not matched */}
              {selectedBvRequest &&
                isCommercial === null &&
                selectedBvRequest.insurance && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    Insurance &quot;{selectedBvRequest.insurance}&quot; was not
                    found in the system. Showing all manufacturers and products.
                  </div>
                )}

              {/* Manufacturer & Product dropdowns — only shown after a BV request is selected */}
              {selectedBvRequest && (
                <>
                  {isFetchingDropdowns ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="space-y-2">
                        <div className="h-4 w-28 bg-gray-200 rounded"></div>
                        <div className="w-full h-10 bg-gray-200 rounded-md"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-20 bg-gray-200 rounded"></div>
                        <div className="w-full h-10 bg-gray-200 rounded-md"></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Manufacturer Dropdown */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="manufacturer"
                          className="text-sm font-medium text-gray-700"
                        >
                          Manufacturer{" "}
                          {isCommercial !== null && (
                            <span
                              className={`ml-1 text-xs font-medium px-1.5 py-0.5 rounded ${
                                isCommercial
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {isCommercial ? "Commercial" : "Non-Commercial"}
                            </span>
                          )}{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <select
                          id="manufacturer"
                          value={selectedManufacturerId}
                          onChange={(e) =>
                            setSelectedManufacturerId(e.target.value)
                          }
                          className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          <option value="">Select a manufacturer...</option>
                          {manufacturers.map((mfg) => (
                            <option key={mfg.id} value={mfg.id}>
                              {mfg.name}
                            </option>
                          ))}
                        </select>
                        {manufacturers.length === 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            No manufacturers available for this insurance type.
                          </p>
                        )}
                      </div>

                      {/* Product Dropdown */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="product"
                          className="text-sm font-medium text-gray-700"
                        >
                          Product{" "}
                          {isCommercial !== null && (
                            <span
                              className={`ml-1 text-xs font-medium px-1.5 py-0.5 rounded ${
                                isCommercial
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {isCommercial ? "Commercial" : "Non-Commercial"}
                            </span>
                          )}{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <select
                          id="product"
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                          className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={!selectedManufacturerId}
                          required
                        >
                          <option value="">
                            {selectedManufacturerId
                              ? "Select a product..."
                              : "Please select a manufacturer first..."}
                          </option>
                          {filteredProducts.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.name} {prod.qCode ? `(${prod.qCode})` : ""}
                            </option>
                          ))}
                        </select>
                        {selectedManufacturerId &&
                          filteredProducts.length === 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              No products available for this manufacturer.
                            </p>
                          )}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    isFetchingDropdowns ||
                    !selectedBvId ||
                    !selectedManufacturerId ||
                    !selectedProductId
                  }
                  className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmitting ? "Creating..." : "Submit"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
