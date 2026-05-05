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
import { apiGet, apiDelete, apiPatch } from "@/lib/apiClient";
import { Edit2, X, AlertTriangle } from "lucide-react";

type OrderProductDetail = {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
  status: string;
  bvRequestId: string;
  practice: string | null;
  provider: string | null;
  manufacturer: string | null;
  manufacturerId: string;
  product: string | null;
  productId: string;
  productCode: string | null;
  woundSize: string | null;
  woundType: string | null;
  woundLocation: string | null;
  insurance: string | null;
  placeOfService: string | null;
  notes: string | null;
  createdBy: string | null;
  createdByType: string | null;
  patientInitials: string | null;
  // BV timeline fields
  applicationDate: string | null;
  bvDeliveryDate: string | null;
  // Delivery detail fields
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  deliveryZip: string | null;
  deliveryDate: string | null;
  contactPhone: string | null;
};

type Manufacturer = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  qCode: string | null;
  manufacturerId: string;
};

export default function ViewProductOrderModal({
  open,
  onOpenChange,
  orderId,
  onDeleted,
  onStatusUpdated,
  viewOnly = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  onDeleted?: () => void;
  onStatusUpdated?: () => void;
  viewOnly?: boolean;
}) {
  const token = useAuthStore((s) => s.jwt);
  const role = useAuthStore((s) => s.role);
  
  const [orderDetail, setOrderDetail] = React.useState<OrderProductDetail | null>(null);
  
  // States for Edit Mode
  const [isEditing, setIsEditing] = React.useState(false);
  const [manufacturers, setManufacturers] = React.useState<Manufacturer[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  
  const [editManufacturerId, setEditManufacturerId] = React.useState("");
  const filteredProducts = React.useMemo(
    () => editManufacturerId ? products.filter(p => p.manufacturerId === editManufacturerId) : products,
    [products, editManufacturerId]
  );
  const [editProductId, setEditProductId] = React.useState("");
  const [editStatus, setEditStatus] = React.useState("");
  const [editNotes, setEditNotes] = React.useState("");
  
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const isAdminOrStaff = role === "admin" || role === "clinic_staff";

  React.useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!open || !orderId || !token) return;

      setLoading(true);
      setError(null);
      setIsEditing(false);

      try {
        const response = await apiGet<{ success: true; data: OrderProductDetail }>(
          `/api/order-products/${orderId}`, 
          { token }
        );
        setOrderDetail(response.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load order product details";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchOrderDetails();
  }, [open, orderId, token]);

  const handleEditToggle = async () => {
    if (!orderDetail) return;
    
    if (!isEditing) {
      // Turn ON edit mode, initialize states and fetch dropdowns
      setEditManufacturerId(orderDetail.manufacturerId);
      setEditProductId(orderDetail.productId);
      setEditStatus(orderDetail.status);
      setEditNotes(orderDetail.notes || "");
      
      setLoading(true);
      try {
        const [mfgRes, prodRes] = await Promise.all([
          apiGet<{ success: true; data: Manufacturer[] }>("/api/manufacturers", { token: token || undefined }),
          apiGet<{ success: true; data: Product[] }>("/api/products", { token: token || undefined })
        ]);
        setManufacturers(mfgRes.data || []);
        setProducts(prodRes.data || []);
      } catch (err) {
        setError("Failed to load manufacturer data for editing.");
      } finally {
        setLoading(false);
      }
    }
    
    setIsEditing(!isEditing);
  };
  
  const handleClose = () => {
    setOrderDetail(null);
    setError(null);
    setShowDeleteConfirm(false);
    setIsEditing(false);
    onOpenChange(false);
  };

  const handleStatusQuickUpdate = async (newStatus: "approved" | "denied" | "shipped" | "completed") => {
    if (!orderId || !token) return;

    setIsUpdating(true);
    setError(null);

    try {
      const updated = await apiPatch<{ success: true; data: OrderProductDetail }, { status: string }>(
        `/api/order-products/${orderId}`, 
        { status: newStatus }, 
        { token }
      );

      setOrderDetail(updated.data);
      onStatusUpdated?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update order status";
      setError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!orderId || !token) return;

    setIsUpdating(true);
    setError(null);

    try {
      const updated = await apiPatch<{ success: true; data: OrderProductDetail }, { status: string; manufacturerId: string; productId: string; notes: string }>(
        `/api/order-products/${orderId}`, 
        { 
          status: editStatus,
          manufacturerId: editManufacturerId,
          productId: editProductId,
          notes: editNotes
        }, 
        { token }
      );

      setOrderDetail(updated.data);
      setIsEditing(false);
      onStatusUpdated?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save changes";
      setError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!orderId || !token) return;

    setIsDeleting(true);
    setError(null);

    try {
      await apiDelete<{ success: true; message: string }>(`/api/order-products/${orderId}`, { token });
      setShowDeleteConfirm(false);
      onDeleted?.();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete product order";
      setError(message);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "approved":
      case "completed":
        return "bg-green-100 text-green-800 border border-green-200";
      case "denied":
      case "cancelled":
        return "bg-red-100 text-red-800 border border-red-200";
      case "shipped":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      default:
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-[90vw] max-w-4xl p-0 max-h-[98vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 flex flex-row items-center justify-between">
          <DialogTitle className="text-2xl font-bold text-[#18192B]">
            Manage Product Order
          </DialogTitle>
          {isAdminOrStaff && !viewOnly && !loading && orderDetail && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEditToggle}
              className={`mr-4 ${isEditing ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" : ""}`}
            >
              {isEditing ? <><X className="w-4 h-4 mr-1" /> Cancel Edit</> : <><Edit2 className="w-4 h-4 mr-1" /> Edit Mode</>}
            </Button>
          )}
        </DialogHeader>

        <div className="px-6 pb-6">
          {error && (
            <div className="bg-red-50 rounded-lg p-3 text-sm text-red-600 mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && !isEditing ? (
             <div className="space-y-6 animate-pulse">
             <div className="space-y-2">
               <div className="h-4 w-32 bg-gray-200 rounded"></div>
               <div className="w-full h-10 bg-gray-200 rounded-md"></div>
             </div>
             <div className="space-y-2">
               <div className="h-4 w-24 bg-gray-200 rounded"></div>
               <div className="w-full h-10 bg-gray-200 rounded-md"></div>
             </div>
           </div>
          ) : orderDetail ? (
            <div className="space-y-6">
              
              {/* Quick Action Toolbar for Admins */}
              {!viewOnly && isAdminOrStaff && !isEditing && (
                <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700 mr-2">Quick Actions:</span>
                  
                  {orderDetail.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => handleStatusQuickUpdate("approved")} disabled={isUpdating} className="bg-green-600 hover:bg-green-700">Approve</Button>
                      <Button size="sm" onClick={() => handleStatusQuickUpdate("denied")} disabled={isUpdating} variant="destructive">Deny</Button>
                    </>
                  )}
                  {orderDetail.status === "approved" && (
                    <Button size="sm" onClick={() => handleStatusQuickUpdate("shipped")} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700">Mark as Shipped</Button>
                  )}
                  {orderDetail.status === "shipped" && (
                    <Button size="sm" onClick={() => handleStatusQuickUpdate("completed")} disabled={isUpdating} className="bg-green-600 hover:bg-green-700">Mark as Completed</Button>
                  )}
                  {["denied", "cancelled", "completed"].includes(orderDetail.status) && (
                    <span className="text-sm text-gray-500 italic">No quick actions available. Use Edit Mode to override.</span>
                  )}
                </div>
              )}

              {/* Order Information */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                <div className="text-sm font-semibold text-gray-700 mb-3">
                  Order Information
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Order ID</Label>
                    <div className="text-xs text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200 font-mono">
                      {orderDetail.id}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Status</Label>
                    {isEditing ? (
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full h-[38px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="shipped">Shipped</option>
                        <option value="completed">Completed</option>
                        <option value="denied">Denied</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    ) : (
                      <div className="px-3 py-2 bg-white rounded-md border border-gray-200">
                        <span className={`${getStatusBadgeClass(orderDetail.status)} text-xs font-medium px-3 py-1 rounded-full`}>
                          {orderDetail.status}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Created At</Label>
                    <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">
                      {orderDetail.createdAt ? new Date(orderDetail.createdAt).toLocaleString() : "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                <div className="text-sm font-semibold text-gray-700 mb-3">Product Details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Manufacturer</Label>
                    {isEditing ? (
                      <select
                        value={editManufacturerId}
                        onChange={(e) => {
                          const newMfgId = e.target.value;
                          setEditManufacturerId(newMfgId);
                          if (editProductId && !products.some(p => p.manufacturerId === newMfgId && p.id === editProductId)) {
                            setEditProductId("");
                          }
                        }}
                        className="w-full h-[38px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a manufacturer...</option>
                        {manufacturers.map((mfg) => (
                          <option key={mfg.id} value={mfg.id}>{mfg.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">
                        {orderDetail.manufacturer || "N/A"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Product</Label>
                    {isEditing ? (
                      <select
                        value={editProductId}
                        onChange={(e) => setEditProductId(e.target.value)}
                        disabled={!editManufacturerId}
                        className="w-full h-[38px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{editManufacturerId ? "Select a product..." : "Select manufacturer first..."}</option>
                        {filteredProducts.map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {prod.name} {prod.qCode ? `(${prod.qCode})` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">
                        {orderDetail.product || "N/A"}
                        {orderDetail.productCode && (
                          <span className="text-xs text-gray-500 ml-2">({orderDetail.productCode})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Patient & Clinical Details (from BV Request - Step 1) */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                <div className="text-sm font-semibold text-gray-700 mb-3">Patient & Clinical Details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Patient Initials</Label>
                    <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200 font-semibold">{orderDetail.patientInitials || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Practice</Label>
                    <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">{orderDetail.practice || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Provider</Label>
                    <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">{orderDetail.provider || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Insurance</Label>
                    <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">{orderDetail.insurance || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Wound Type</Label>
                    <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">{orderDetail.woundType || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Wound Size</Label>
                    <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">{orderDetail.woundSize || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Wound Location</Label>
                    <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">{orderDetail.woundLocation || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Place of Service</Label>
                    <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">{orderDetail.placeOfService || "N/A"}</div>
                  </div>
                  {orderDetail.applicationDate && (
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">Application Date</Label>
                      <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">{orderDetail.applicationDate}</div>
                    </div>
                  )}
                  {orderDetail.bvDeliveryDate && (
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">BV Delivery Date</Label>
                      <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">{orderDetail.bvDeliveryDate}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Details (from Step 2) */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                <div className="text-sm font-semibold text-gray-700 mb-3">Delivery Details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs font-medium text-gray-600">Delivery Address</Label>
                    <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">
                      {orderDetail.deliveryAddress || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">City</Label>
                    <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">{orderDetail.deliveryCity || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">State</Label>
                    <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">{orderDetail.deliveryState || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">ZIP Code</Label>
                    <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">{orderDetail.deliveryZip || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Requested Delivery Date</Label>
                    <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">{orderDetail.deliveryDate || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Contact Phone</Label>
                    <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200">{orderDetail.contactPhone || "N/A"}</div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                <div className="text-sm font-semibold text-gray-700">Notes</div>
                {isEditing ? (
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add manual notes here..."
                  />
                ) : (
                  <div className="text-sm text-gray-900 px-3 py-2 bg-white rounded-md border border-gray-200 whitespace-pre-wrap min-h-[60px]">
                    {orderDetail.notes || "No notes provided."}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between gap-3 pt-4 border-t">
                {!viewOnly && isAdminOrStaff ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting || isUpdating}
                    className="px-6 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
                  >
                    Delete Order
                  </Button>
                ) : <div />}
                
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleClose} disabled={isUpdating}>
                    {isEditing ? "Cancel" : "Close"}
                  </Button>
                  {isEditing && (
                    <Button type="button" onClick={handleSaveEdit} disabled={isUpdating || !editManufacturerId || !editProductId || !editStatus}>
                      {isUpdating ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700">Are you sure you want to delete this product order? This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Cancel</Button>
            <Button onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeleting ? "Deleting..." : "Delete Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </Dialog>
  );
}
