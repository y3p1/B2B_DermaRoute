"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/auth";
import { apiGet, apiPost } from "@/lib/apiClient";
import { Check, ChevronRight, ChevronLeft, Package, User, Truck, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

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
  proofStatus: string | null;
  createdAt: string | null;
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
  woundSizeLabel: string | null;
};

type Insurance = {
  id: string;
  name: string;
  commercial: boolean;
};

interface EnhancedOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export default function EnhancedOrderModal({
  open,
  onOpenChange,
  onCreated,
}: EnhancedOrderModalProps) {
  const token = useAuthStore((s) => s.jwt);

  // -- State --
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Data
  const [bvRequests, setBvRequests] = React.useState<BvRequest[]>([]);
  const [manufacturers, setManufacturers] = React.useState<Manufacturer[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [insurances, setInsurances] = React.useState<Insurance[]>([]);
  // Recommended manufacturer name (from insurance routing)
  const [recommendedMfg, setRecommendedMfg] = React.useState<string | null>(null);

  // Wound sizes for dropdown
  type WoundSizeOption = { key: string; label: string; category?: string };
  const [woundSizeOptions, setWoundSizeOptions] = React.useState<WoundSizeOption[]>([]);

  // Form State
  const [formData, setFormData] = React.useState({
    // Step 1: Patient + Product
    bvRequestId: "",
    initials: "",
    icd10: "",
    woundType: "",
    woundSize: "",
    woundLocation: "",
    manufacturerId: "",
    productId: "",
    // Step 2: Delivery Details
    deliveryAddress: "",
    deliveryCity: "",
    deliveryState: "",
    deliveryZip: "",
    deliveryDate: "",
    contactPhone: "",
    notes: "",
  });

  // Derived
  const selectedBv = bvRequests.find(r => r.id === formData.bvRequestId);
  const filteredProducts = formData.manufacturerId
    ? products.filter(p => p.manufacturerId === formData.manufacturerId)
    : [];

  // -- Initialization --
  React.useEffect(() => {
    if (open && token) {
      void fetchInitialData();
    } else {
      // Reset state on close
      setStep(1);
      setRecommendedMfg(null);
      setFormData({
        bvRequestId: "",
        initials: "",
        icd10: "",
        woundType: "",
        woundSize: "",
        woundLocation: "",
        manufacturerId: "",
        productId: "",
        deliveryAddress: "",
        deliveryCity: "",
        deliveryState: "",
        deliveryZip: "",
        deliveryDate: "",
        contactPhone: "",
        notes: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bvRes, insRes, wsRes] = await Promise.all([
        apiGet<{ success: true; data: BvRequest[] }>("/api/bv-requests", { token: token ?? undefined }),
        apiGet<{ success: true; data: Insurance[] }>("/api/insurances", { token: token ?? undefined }),
        apiGet<{ success: true; data: WoundSizeOption[] }>("/api/bv/wound-sizes", { token: token ?? undefined }),
      ]);

      // Filter for Approved + Proof Verified
      const eligible = (bvRes.data || []).filter(
        (bv) => bv.status === "approved" && bv.proofStatus === "verified"
      );

      setBvRequests(eligible);
      setInsurances(insRes.data || []);
      setWoundSizeOptions(wsRes.data || []);
    } catch (err) {
      console.error("[OrderWizard] Initial data fetch failed:", err);
      setError("Failed to load initial order records. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStep1ProductData = async (bv: BvRequest) => {
    setLoading(true);
    try {
      // 1. Determine if commercial
      const insName = bv.insurance?.trim().toLowerCase();
      const matched = insurances.find(i => i.name.toLowerCase() === insName);
      const isCommercial = matched ? matched.commercial : null;
      const insuranceId = matched ? matched.id : null;

      // 2. Fetch MFGs and Products (auto-recommend based on insurance routing)
      const mfgUrl = insuranceId
        ? `/api/insurance-routing/manufacturers?insuranceId=${insuranceId}`
        : "/api/manufacturers";

      // Always fetch all products. Let the manufacturer selection filter the products 
      // locally. This ensures cross-commercial routing rules don't hide products.
      const prodUrl = "/api/products";

      const [mfgRes, prodRes] = await Promise.all([
        apiGet<{ success: true; data: Manufacturer[] }>(mfgUrl, { token: token ?? undefined }),
        apiGet<{ success: true; data: Product[] }>(prodUrl, { token: token ?? undefined }),
      ]);

      const mfgList = mfgRes.data || [];
      const prodList = prodRes.data || [];

      setManufacturers(mfgList);
      setProducts(prodList);

      // Auto-recommend the first routed manufacturer (if any)
      if (mfgList.length > 0) {
        setRecommendedMfg(mfgList[0].name);
        // Pre-select the recommended manufacturer
        setFormData(prev => ({
          ...prev,
          manufacturerId: mfgList[0].id,
          productId: "", // Reset product when manufacturer changes
        }));
      } else {
        setRecommendedMfg(null);
      }
    } catch (err) {
      console.error("[OrderWizard] Product data fetch failed:", err);
      setError("Failed to load manufacturer and product lists.");
    } finally {
      setLoading(false);
    }
  };

  // -- Handlers --
  const handleBvSelect = (id: string) => {
    const bv = bvRequests.find(r => r.id === id);
    if (bv) {
      setFormData(prev => ({
        ...prev,
        bvRequestId: id,
        initials: bv.initials ?? "",
        icd10: bv.icd10 ?? "",
        woundType: bv.woundType ?? "",
        woundSize: bv.woundSize ?? "",
        woundLocation: bv.woundLocation ?? "",
        // Pre-fill delivery date from BV if available
        deliveryDate: bv.deliveryDate ?? prev.deliveryDate,
      }));
      void fetchStep1ProductData(bv);
    }
  };

  const canProceedStep1 = formData.bvRequestId && formData.manufacturerId && formData.productId;
  const canProceedStep2 = formData.deliveryAddress && formData.deliveryCity && formData.deliveryState && formData.deliveryZip;

  const handleNext = () => {
    if (step === 1 && !canProceedStep1) return;
    if (step === 2 && !canProceedStep2) return;
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiPost("/api/order-products", {
        bvRequestId: formData.bvRequestId,
        manufacturerId: formData.manufacturerId,
        productId: formData.productId,
        notes: formData.notes,
        deliveryAddress: formData.deliveryAddress,
        deliveryCity: formData.deliveryCity,
        deliveryState: formData.deliveryState,
        deliveryZip: formData.deliveryZip,
        deliveryDate: formData.deliveryDate,
        contactPhone: formData.contactPhone,
      }, { token: token ?? undefined });

      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -- Step labels --
  const stepLabels = ["Patient & Product", "Delivery Details", "Review"];

  // -- Render Helpers --
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8 gap-2">
      {stepLabels.map((label, idx) => {
        const i = idx + 1;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                step === i ? "bg-blue-600 border-blue-600 text-white" :
                  step > i ? "bg-green-500 border-green-500 text-white" : "border-gray-200 text-gray-400"
              )}>
                {step > i ? <Check className="w-5 h-5" /> : i}
              </div>
              <span className={cn(
                "text-xs font-medium hidden sm:block",
                step === i ? "text-blue-600" : step > i ? "text-green-600" : "text-gray-400"
              )}>
                {label}
              </span>
            </div>
            {i < 3 && <div className={cn("h-0.5 w-8 sm:w-12 bg-gray-200 mt-[-1rem] sm:mt-0", step > i && "bg-green-500")} />}
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl overflow-hidden p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 bg-gray-50 border-b">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Package className="text-blue-600" />
            Place New Product Order
          </DialogTitle>
          <DialogDescription>
            Complete the 3-step wizard to order products for your approved patients.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8">
          {renderStepIndicator()}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* ===== STEP 1: PATIENT INFO + PRODUCT SELECTION ===== */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 border-b pb-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Step 1: Patient Info &amp; Product Selection
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bv-select">Select Approved BV Request</Label>
                  <Select value={formData.bvRequestId} onValueChange={handleBvSelect}>
                    <SelectTrigger id="bv-select" className="h-12">
                      <SelectValue placeholder="Choose a patient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bvRequests.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">
                          No approved &amp; verified BVs found.
                        </div>
                      ) : (
                        bvRequests.map((bv, index) => (
                          <SelectItem key={bv.id} value={bv.id}>
                            {index + 1}. Patient: {bv.initials || "N/A"} • Ins: {bv.insurance || "N/A"} • Wound: {bv.woundType || "N/A"}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground italic">
                    Only BV requests that are Approved AND have Verified Manufacturer Proof are shown.
                  </p>
                </div>
              </div>

              {selectedBv && (
                <>
                  {/* Patient details (auto-populated from BV) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/50 p-6 rounded-xl border border-blue-100 mt-4">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Patient Initials</Label>
                        <Input
                          value={formData.initials}
                          onChange={e => setFormData(f => ({ ...f, initials: e.target.value }))}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-blue-700 uppercase tracking-wider">ICD-10 Code</Label>
                        <Input
                          value={formData.icd10}
                          onChange={e => setFormData(f => ({ ...f, icd10: e.target.value }))}
                          className="bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Wound Type</Label>
                        <Input
                          value={formData.woundType}
                          onChange={e => setFormData(f => ({ ...f, woundType: e.target.value }))}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Wound Size</Label>
                        {(() => {
                          const discSizes = woundSizeOptions.filter((w) => w.category === "disc");
                          const rectSizes = woundSizeOptions.filter((w) => w.category !== "disc");
                          return (
                            <Select
                              value={formData.woundSize}
                              onValueChange={val => setFormData(f => ({ ...f, woundSize: val }))}
                            >
                              <SelectTrigger className="bg-white h-10">
                                <SelectValue placeholder="Select wound size..." />
                              </SelectTrigger>
                              <SelectContent className="max-h-[60vh] overflow-auto">
                                {discSizes.length > 0 && (
                                  <SelectGroup>
                                    <SelectLabel>Discs (Round)</SelectLabel>
                                    {discSizes.map((w) => (
                                      <SelectItem key={w.key} value={w.key}>
                                        {w.label}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                )}
                                {rectSizes.length > 0 && (
                                  <SelectGroup>
                                    <SelectLabel>Square &amp; Rectangular</SelectLabel>
                                    {rectSizes.map((w) => (
                                      <SelectItem key={w.key} value={w.key}>
                                        {w.label}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                )}
                              </SelectContent>
                            </Select>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Product Selection with insurance routing recommendation */}
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center gap-2 text-base font-semibold text-gray-900 border-b pb-2">
                      <ClipboardCheck className="w-5 h-5 text-blue-500" />
                      Product Selection
                    </div>

                    {recommendedMfg && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
                        <div className="p-1 bg-emerald-500 rounded text-white mt-0.5">
                          <Check className="w-3 h-3" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-emerald-900">
                            Recommended: <span className="font-bold">{recommendedMfg}</span>
                          </p>
                          <p className="text-xs text-emerald-700">
                            Auto-recommended based on the patient&apos;s insurance type. You may select a different manufacturer if needed.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="mfg-select">Manufacturer</Label>
                        <Select
                          value={formData.manufacturerId}
                          onValueChange={val => setFormData(f => ({ ...f, manufacturerId: val, productId: "" }))}
                        >
                          <SelectTrigger id="mfg-select" className="h-12">
                            <SelectValue placeholder="Select manufacturer..." />
                          </SelectTrigger>
                          <SelectContent>
                            {manufacturers.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="prod-select">Product</Label>
                        <Select
                          value={formData.productId}
                          onValueChange={val => setFormData(f => ({ ...f, productId: val }))}
                          disabled={!formData.manufacturerId}
                        >
                          <SelectTrigger id="prod-select" className="h-12">
                            <SelectValue placeholder="Select product..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredProducts.length === 0 ? (
                              <div className="p-4 text-sm text-gray-500 text-center">
                                No products found for this manufacturer.
                              </div>
                            ) : (
                              filteredProducts.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}{p.woundSizeLabel ? ` - ${p.woundSizeLabel}` : ""} {p.qCode ? `(${p.qCode})` : ""}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ===== STEP 2: DELIVERY DETAILS ===== */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 border-b pb-2">
                <Truck className="w-5 h-5 text-blue-500" />
                Step 2: Delivery Details
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="delivery-address">Street Address *</Label>
                  <Input
                    id="delivery-address"
                    value={formData.deliveryAddress}
                    onChange={e => setFormData(f => ({ ...f, deliveryAddress: e.target.value }))}
                    placeholder="123 Main Street, Suite 4B"
                    className="h-12"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery-city">City *</Label>
                    <Input
                      id="delivery-city"
                      value={formData.deliveryCity}
                      onChange={e => setFormData(f => ({ ...f, deliveryCity: e.target.value }))}
                      placeholder="Miami"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-state">State *</Label>
                    <Input
                      id="delivery-state"
                      value={formData.deliveryState}
                      onChange={e => setFormData(f => ({ ...f, deliveryState: e.target.value.toUpperCase().slice(0, 2) }))}
                      placeholder="FL"
                      maxLength={2}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-zip">Zip Code *</Label>
                    <Input
                      id="delivery-zip"
                      value={formData.deliveryZip}
                      onChange={e => setFormData(f => ({ ...f, deliveryZip: e.target.value.slice(0, 10) }))}
                      placeholder="33101"
                      maxLength={10}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery-date">Preferred Delivery Date</Label>
                    <Input
                      id="delivery-date"
                      type="date"
                      value={formData.deliveryDate}
                      onChange={e => setFormData(f => ({ ...f, deliveryDate: e.target.value }))}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">Contact Phone</Label>
                    <Input
                      id="contact-phone"
                      type="tel"
                      value={formData.contactPhone}
                      onChange={e => setFormData(f => ({ ...f, contactPhone: e.target.value }))}
                      placeholder="(305) 555-0100"
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Special Instructions / Notes</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                    className="w-full min-h-[100px] p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    placeholder="E.g., specific shipping instructions, billing notes, or delivery contact..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP 3: REVIEW & SUBMIT ===== */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 border-b pb-2">
                <Check className="w-5 h-5 text-green-500" />
                Step 3: Final Review
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border rounded-xl p-6 bg-gray-50/50 shadow-sm">
                  {/* Left column: Patient + Product */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-800 border-b pb-1">Patient & Product</h3>
                    <div>
                      <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Patient Initials</h4>
                      <p className="font-semibold text-gray-900">{formData.initials || "N/A"}</p>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">ICD-10 Code</h4>
                      <p className="font-semibold text-gray-900">{formData.icd10 || "N/A"}</p>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Wound Details</h4>
                      <p className="text-sm text-gray-700">{formData.woundType || "N/A"} — {formData.woundSize || "N/A"}</p>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Manufacturer</h4>
                      <p className="font-semibold text-gray-900">
                        {manufacturers.find(m => m.id === formData.manufacturerId)?.name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Product</h4>
                      <p className="font-semibold text-blue-600">
                        {products.find(p => p.id === formData.productId)?.name || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Right column: Delivery */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-800 border-b pb-1">Delivery Details</h3>
                    <div>
                      <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Shipping Address</h4>
                      <p className="text-sm text-gray-900">
                        {formData.deliveryAddress || "N/A"}
                      </p>
                      <p className="text-sm text-gray-700">
                        {formData.deliveryCity}{formData.deliveryState ? `, ${formData.deliveryState}` : ""} {formData.deliveryZip}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Delivery Date</h4>
                      <p className="text-sm text-gray-900">{formData.deliveryDate || "Not specified"}</p>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Contact Phone</h4>
                      <p className="text-sm text-gray-900">{formData.contactPhone || "Not specified"}</p>
                    </div>
                    {formData.notes && (
                      <div>
                        <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Notes</h4>
                        <p className="text-sm text-gray-600 line-clamp-3 italic">&quot;{formData.notes}&quot;</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                  <div className="p-2 bg-blue-600 rounded text-white mt-0.5">
                    <ClipboardCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Everything look correct?</p>
                    <p className="text-xs text-blue-700">Once submitted, this order will be processed by the distribution team.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={step === 1 ? () => onOpenChange(false) : handleBack}
            disabled={isSubmitting}
            className="text-gray-600 font-medium"
          >
            {step === 1 ? "Cancel" : <><ChevronLeft className="w-4 h-4 mr-2" /> Back</>}
          </Button>

          {step < 3 ? (
            <Button
              onClick={handleNext}
              disabled={
                loading ||
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
            >
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[160px]"
            >
              {isSubmitting ? "Submitting..." : "Complete Order"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
