"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { apiPost } from "@/lib/apiClient";

const ICD10_OPTIONS = [
  "H16.011 – Central corneal ulcer, right eye",
  "H16.012 – Central corneal ulcer, left eye",
  "H16.013 – Central corneal ulcer, bilateral",
  "H16.121 – Filamentary keratitis, right eye",
  "H16.122 – Filamentary keratitis, left eye",
  "H16.211 – Exposure keratoconjunctivitis, right eye",
  "H16.212 – Exposure keratoconjunctivitis, left eye",
  "H16.231 – Neurotrophic keratoconjunctivitis, right eye",
  "H16.232 – Neurotrophic keratoconjunctivitis, left eye",
  "H16.8 – Other keratitis",
  "H18.831 – Recurrent erosion of cornea, right eye",
  "H18.832 – Recurrent erosion of cornea, left eye",
  "H18.833 – Recurrent erosion of cornea, bilateral",
  "H18.899 – Persistent epithelial defect (other specified)",
  "H10.021 – Mucopurulent conjunctivitis, right eye",
  "H10.022 – Mucopurulent conjunctivitis, left eye",
  "H18.10 – Bullous keratopathy, unspecified",
  "H18.421 – Band keratopathy, right eye",
  "H18.422 – Band keratopathy, left eye",
  "H04.131 – Lacrimal cyst, right lacrimal gland",
  "H18.52 – Epithelial corneal dystrophy",
  "L51.1 – Stevens-Johnson syndrome",
  "T26.10XA – Burn of cornea, unspecified eye",
  "T26.11XA – Burn of cornea, right eye",
  "T26.12XA – Burn of cornea, left eye",
];

const SKU_MAP: Record<string, Record<number, string>> = {
  thin: { 8: "VS4508", 10: "VS4510", 12: "VS4512", 15: "VS4515" },
  thick: { 8: "VS20008", 10: "VS20010", 12: "VS20012", 15: "VS20015" },
};

type FormState = {
  patientFirstName: string;
  patientLastName: string;
  patientDob: string;
  patientMrn: string;
  primaryDiagnosis: string;
  secondaryDiagnosis: string;
  eye: "right" | "left" | "bilateral" | "";
  productVariant: "thin" | "thick" | "";
  sizeMm: string;
  quantity: string;
  dateNeededBy: string;
  shipAddress: string;
  shipCity: string;
  shipState: string;
  shipZip: string;
  specialInstructions: string;
  insurancePayer: string;
  insuranceMemberId: string;
  showInsurance: boolean;
};

const INITIAL: FormState = {
  patientFirstName: "",
  patientLastName: "",
  patientDob: "",
  patientMrn: "",
  primaryDiagnosis: "",
  secondaryDiagnosis: "",
  eye: "",
  productVariant: "",
  sizeMm: "",
  quantity: "1",
  dateNeededBy: "",
  shipAddress: "",
  shipCity: "",
  shipState: "",
  shipZip: "",
  specialInstructions: "",
  insurancePayer: "",
  insuranceMemberId: "",
  showInsurance: false,
};

export default function NewOcularOrderPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.jwt);
  const provider = useAuthStore((s) => s.provider);
  const [form, setForm] = React.useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Pre-fill ship-to from provider clinic address
  React.useEffect(() => {
    if (provider) {
      setForm((prev) => ({
        ...prev,
        shipAddress: provider.clinicAddress ?? prev.shipAddress,
        shipCity: provider.clinicCity ?? prev.shipCity,
        shipState: provider.clinicState ?? prev.shipState,
        shipZip: provider.clinicZip ?? prev.shipZip,
      }));
    }
  }, [provider]);

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "productVariant") setForm((prev) => ({ ...prev, productVariant: value as "thin" | "thick", sizeMm: "" }));
  }

  const derivedSku =
    form.productVariant && form.sizeMm
      ? (SKU_MAP[form.productVariant]?.[Number(form.sizeMm)] ?? "")
      : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { setError("Not authenticated"); return; }
    if (!form.eye || !form.productVariant || !form.sizeMm || !form.primaryDiagnosis) {
      setError("Please complete all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiPost<{ success: true; data: { id: string } }, Record<string, unknown>>(
        "/api/ocular/orders",
        {
          patient: {
            firstName: form.patientFirstName,
            lastName: form.patientLastName,
            dob: form.patientDob,
            mrn: form.patientMrn || undefined,
          },
          primaryDiagnosis: form.primaryDiagnosis,
          secondaryDiagnosis: form.secondaryDiagnosis || undefined,
          eye: form.eye,
          productVariant: form.productVariant,
          sizeMm: Number(form.sizeMm),
          sku: derivedSku,
          quantity: Number(form.quantity) || 1,
          dateNeededBy: form.dateNeededBy || undefined,
          shipTo: {
            address: form.shipAddress,
            city: form.shipCity,
            state: form.shipState,
            zip: form.shipZip,
          },
          specialInstructions: form.specialInstructions || undefined,
          insurancePayer: form.insurancePayer || undefined,
          insuranceMemberId: form.insuranceMemberId || undefined,
        },
        { token },
      );
      router.push("/ocular/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";
  const radioCls = (selected: boolean) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
      selected ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-teal-900">New VisiDisc Order</h1>
        <p className="text-sm text-slate-500 mt-1">
          Complete the form below. Your order will be emailed to Integrity Tissue Solutions.
        </p>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6">
        {/* Patient Info */}
        <div className="bg-white rounded-xl border border-teal-100 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800">Patient Information</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-medium">
            HIPAA: Use only initials or de-identified information if required by your practice policy.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First Name *</label>
              <input required className={inputCls} value={form.patientFirstName} onChange={(e) => set("patientFirstName", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Last Name *</label>
              <input required className={inputCls} value={form.patientLastName} onChange={(e) => set("patientLastName", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date of Birth *</label>
              <input required type="date" className={inputCls} value={form.patientDob} onChange={(e) => set("patientDob", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>MRN (optional)</label>
              <input className={inputCls} value={form.patientMrn} onChange={(e) => set("patientMrn", e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>

        {/* Diagnosis */}
        <div className="bg-white rounded-xl border border-teal-100 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800">Diagnosis</h2>
          <div>
            <label className={labelCls}>Primary Diagnosis (ICD-10) *</label>
            <select required className={inputCls} value={form.primaryDiagnosis} onChange={(e) => set("primaryDiagnosis", e.target.value)}>
              <option value="">Select diagnosis…</option>
              {ICD10_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
              <option value="Other">Other (specify in special instructions)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Secondary Diagnosis (optional)</label>
            <select className={inputCls} value={form.secondaryDiagnosis} onChange={(e) => set("secondaryDiagnosis", e.target.value)}>
              <option value="">None</option>
              {ICD10_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Selection */}
        <div className="bg-white rounded-xl border border-teal-100 p-5 shadow-sm space-y-5">
          <h2 className="font-semibold text-slate-800">Product Selection</h2>

          <div>
            <label className={labelCls}>Eye Treated *</label>
            <div className="flex gap-3 flex-wrap">
              {(["right", "left", "bilateral"] as const).map((eye) => (
                <label key={eye} className={radioCls(form.eye === eye)}>
                  <input type="radio" className="sr-only" value={eye} checked={form.eye === eye} onChange={() => set("eye", eye)} />
                  {eye.charAt(0).toUpperCase() + eye.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Membrane Variant *</label>
            <div className="flex gap-3 flex-wrap">
              <label className={radioCls(form.productVariant === "thin")}>
                <input type="radio" className="sr-only" value="thin" checked={form.productVariant === "thin"} onChange={() => set("productVariant", "thin")} />
                <div>
                  <div>Thin</div>
                  <div className="text-xs font-normal opacity-70">45μm — bandage contact lens technique</div>
                </div>
              </label>
              <label className={radioCls(form.productVariant === "thick")}>
                <input type="radio" className="sr-only" value="thick" checked={form.productVariant === "thick"} onChange={() => set("productVariant", "thick")} />
                <div>
                  <div>Thick</div>
                  <div className="text-xs font-normal opacity-70">200μm — speculum / ring application</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className={labelCls}>Disc Size *</label>
            <div className="flex gap-3 flex-wrap">
              {([8, 10, 12, 15] as const).map((mm) => (
                <label key={mm} className={radioCls(form.sizeMm === String(mm))}>
                  <input type="radio" className="sr-only" value={mm} checked={form.sizeMm === String(mm)} onChange={() => set("sizeMm", String(mm))} />
                  {mm}mm
                </label>
              ))}
            </div>
          </div>

          {derivedSku && (
            <div className="p-3 bg-teal-50 rounded-lg text-sm text-teal-800">
              <span className="font-medium">Selected SKU:</span>{" "}
              <span className="font-mono">{derivedSku}</span>
            </div>
          )}

          <div>
            <label className={labelCls}>Quantity *</label>
            <input
              type="number"
              min={1}
              max={99}
              required
              className={`${inputCls} max-w-28`}
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
            />
          </div>
        </div>

        {/* Delivery */}
        <div className="bg-white rounded-xl border border-teal-100 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800">Delivery</h2>
          <div>
            <label className={labelCls}>Date Needed By</label>
            <input type="date" className={inputCls} value={form.dateNeededBy} onChange={(e) => set("dateNeededBy", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Ship-to Street Address</label>
            <input className={inputCls} value={form.shipAddress} onChange={(e) => set("shipAddress", e.target.value)} placeholder="123 Medical Dr" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className={labelCls}>City</label>
              <input className={inputCls} value={form.shipCity} onChange={(e) => set("shipCity", e.target.value)} placeholder="Miami" />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input
                className={inputCls}
                value={form.shipState}
                maxLength={2}
                onChange={(e) => set("shipState", e.target.value.toUpperCase().slice(0, 2))}
                placeholder="FL"
              />
            </div>
            <div>
              <label className={labelCls}>Zip</label>
              <input className={inputCls} value={form.shipZip} onChange={(e) => set("shipZip", e.target.value)} placeholder="33101" maxLength={10} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Special Instructions (optional)</label>
            <textarea
              rows={3}
              className={inputCls}
              value={form.specialInstructions}
              onChange={(e) => set("specialInstructions", e.target.value)}
              placeholder="Any special handling or scheduling notes…"
            />
          </div>
        </div>

        {/* Insurance (collapsible) */}
        <div className="bg-white rounded-xl border border-teal-100 shadow-sm overflow-hidden">
          <button
            type="button"
            className="w-full px-5 py-4 text-left flex items-center justify-between text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={() => set("showInsurance", !form.showInsurance)}
          >
            Insurance Information (optional — for reimbursement reference only)
            <span className="text-slate-400">{form.showInsurance ? "▲" : "▼"}</span>
          </button>
          {form.showInsurance && (
            <div className="px-5 pb-5 space-y-4 border-t border-slate-100">
              <div className="mt-4">
                <label className={labelCls}>Insurance Payer</label>
                <input className={inputCls} value={form.insurancePayer} onChange={(e) => set("insurancePayer", e.target.value)} placeholder="e.g., Medicare, Aetna" />
              </div>
              <div>
                <label className={labelCls}>Member ID</label>
                <input className={inputCls} value={form.insuranceMemberId} onChange={(e) => set("insuranceMemberId", e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting…" : "Submit Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
