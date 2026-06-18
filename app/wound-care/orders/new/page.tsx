"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { apiPost } from "@/lib/apiClient";

type FormState = {
  initials: string;
  insurance: string;
  placeOfService: string;
  woundType: string;
  woundSize: string;
  woundLocation: string;
  icd10: string;
  conservativeTherapy: "yes" | "no" | "";
  diabetic: "yes" | "no" | "";
  a1cPercent: string;
  a1cMeasuredAt: string;
  tunneling: "yes" | "no" | "";
  infected: "yes" | "no" | "";
  applicationDate: string;
  deliveryDate: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryZip: string;
  instructions: string;
};

const INITIAL: FormState = {
  initials: "", insurance: "", placeOfService: "",
  woundType: "", woundSize: "", woundLocation: "", icd10: "",
  conservativeTherapy: "", diabetic: "", a1cPercent: "", a1cMeasuredAt: "",
  tunneling: "", infected: "",
  applicationDate: "", deliveryDate: "",
  deliveryAddress: "", deliveryCity: "", deliveryState: "", deliveryZip: "",
  instructions: "",
};

const WOUND_TYPES = ["Diabetic foot ulcer", "Venous leg ulcer", "Pressure ulcer", "MOHS (acute)"];

type InsuranceOption = { id: string; name: string; commercial: boolean };

export default function WoundCareNewRequestPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.jwt);
  const provider = useAuthStore((s) => s.provider);
  const [form, setForm] = React.useState<FormState>(INITIAL);
  const [insurancesList, setInsurancesList] = React.useState<InsuranceOption[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (provider) {
      setForm((prev) => ({
        ...prev,
        deliveryAddress: provider.clinicAddress ?? prev.deliveryAddress,
        deliveryCity: provider.clinicCity ?? prev.deliveryCity,
        deliveryState: provider.clinicState ?? prev.deliveryState,
        deliveryZip: provider.clinicZip ?? prev.deliveryZip,
      }));
    }
  }, [provider]);

  React.useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const res = await fetch("/api/insurances", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (body && Array.isArray(body.data)) {
          setInsurancesList(
            body.data.map((r: Record<string, unknown>) => ({
              id: String(r.id ?? ""),
              name: String(r.name ?? ""),
              commercial: Boolean(r.commercial),
            })),
          );
        }
      } catch { /* ignore */ }
    })();
  }, [token]);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !provider?.id) { setError("Not authenticated"); return; }
    if (!form.insurance || !form.placeOfService || !form.woundType || !form.woundSize) {
      setError("Please complete all required fields.");
      return;
    }
    if (!form.initials || !form.applicationDate || !form.deliveryDate) {
      setError("Patient initials, application date, and delivery date are required.");
      return;
    }
    if (!form.conservativeTherapy || !form.diabetic || !form.tunneling || !form.infected) {
      setError("Please answer all clinical assessment questions.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiPost<{ success: true; data: Record<string, unknown> }, Record<string, unknown>>(
        "/api/bv-requests",
        {
          provider: provider.id,
          placeOfService: form.placeOfService,
          insurance: form.insurance,
          woundType: form.woundType,
          woundSize: form.woundSize,
          woundLocation: form.woundLocation || undefined,
          icd10: form.icd10 || undefined,
          conservativeTherapy: form.conservativeTherapy === "yes",
          diabetic: form.diabetic === "yes",
          a1cPercent: form.a1cPercent ? Number(form.a1cPercent) : undefined,
          a1cMeasuredAt: form.a1cMeasuredAt || undefined,
          tunneling: form.tunneling === "yes",
          infected: form.infected === "yes",
          initials: form.initials,
          applicationDate: form.applicationDate,
          deliveryDate: form.deliveryDate,
          deliveryAddress: form.deliveryAddress || undefined,
          deliveryCity: form.deliveryCity || undefined,
          deliveryState: form.deliveryState || undefined,
          deliveryZip: form.deliveryZip || undefined,
          instructions: form.instructions || undefined,
        },
        { token },
      );
      router.push("/wound-care/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";
  const radioCls = (selected: boolean) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
      selected ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-emerald-900">New BV Request</h1>
        <p className="text-sm text-slate-500 mt-1">
          Submit a benefits verification for wound care tissue products.
        </p>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6">
        {/* Patient */}
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800">Patient Information</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-medium">
            HIPAA: Use patient INITIALS ONLY. No PHI accepted.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Patient Initials *</label>
              <input required className={inputCls} value={form.initials} onChange={(e) => set("initials", e.target.value)} placeholder="e.g., JD" />
            </div>
            <div>
              <label className={labelCls}>Ordering Provider</label>
              <div className="h-[38px] flex items-center px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">
                {provider?.clinicName ?? "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Insurance & Service */}
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800">Insurance & Service</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Insurance *</label>
              <select required className={inputCls} value={form.insurance} onChange={(e) => set("insurance", e.target.value)}>
                <option value="">Select insurance…</option>
                {insurancesList.map((ins) => (
                  <option key={ins.id} value={ins.name}>
                    {ins.name} ({ins.commercial ? "Commercial" : "Non-Commercial"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Place of Service *</label>
              <div className="flex gap-3">
                {(["office", "hospital"] as const).map((pos) => (
                  <label key={pos} className={radioCls(form.placeOfService === pos)}>
                    <input type="radio" className="sr-only" value={pos} checked={form.placeOfService === pos} onChange={() => set("placeOfService", pos)} />
                    {pos.charAt(0).toUpperCase() + pos.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Wound Assessment */}
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm space-y-5">
          <h2 className="font-semibold text-slate-800">Wound Assessment</h2>

          <div>
            <label className={labelCls}>Wound Type *</label>
            <div className="flex gap-3 flex-wrap">
              {WOUND_TYPES.map((wt) => (
                <label key={wt} className={radioCls(form.woundType === wt)}>
                  <input type="radio" className="sr-only" value={wt} checked={form.woundType === wt} onChange={() => set("woundType", wt)} />
                  {wt}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Wound Size *</label>
              <input required className={inputCls} value={form.woundSize} onChange={(e) => set("woundSize", e.target.value)} placeholder='e.g., "4x4 cm", "16 cm²"' />
              <p className="text-xs text-slate-400 mt-1">Enter dimensions (e.g., 4x4 cm, 2.5 x 3 cm)</p>
            </div>
            <div>
              <label className={labelCls}>Wound Location</label>
              <input className={inputCls} value={form.woundLocation} onChange={(e) => set("woundLocation", e.target.value)} placeholder="e.g., Left foot plantar" />
            </div>
          </div>

          <div>
            <label className={labelCls}>ICD-10 Codes</label>
            <input className={inputCls} value={form.icd10} onChange={(e) => set("icd10", e.target.value)} placeholder="Comma-separated (e.g., L97.529, E11.621)" />
          </div>
        </div>

        {/* Clinical Flags */}
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm space-y-5">
          <h2 className="font-semibold text-slate-800">Clinical Assessment</h2>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <div>
              <label className={labelCls}>4+ weeks conservative therapy? *</label>
              <div className="flex gap-3 mt-1">
                {(["yes", "no"] as const).map((v) => (
                  <label key={v} className={radioCls(form.conservativeTherapy === v)}>
                    <input type="radio" className="sr-only" checked={form.conservativeTherapy === v} onChange={() => set("conservativeTherapy", v)} />
                    {v === "yes" ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Patient diabetic? *</label>
              <div className="flex gap-3 mt-1">
                {(["yes", "no"] as const).map((v) => (
                  <label key={v} className={radioCls(form.diabetic === v)}>
                    <input type="radio" className="sr-only" checked={form.diabetic === v} onChange={() => set("diabetic", v)} />
                    {v === "yes" ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Tunneling / undermining? *</label>
              <div className="flex gap-3 mt-1">
                {(["yes", "no"] as const).map((v) => (
                  <label key={v} className={radioCls(form.tunneling === v)}>
                    <input type="radio" className="sr-only" checked={form.tunneling === v} onChange={() => set("tunneling", v)} />
                    {v === "yes" ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Currently infected? *</label>
              <div className="flex gap-3 mt-1">
                {(["yes", "no"] as const).map((v) => (
                  <label key={v} className={radioCls(form.infected === v)}>
                    <input type="radio" className="sr-only" checked={form.infected === v} onChange={() => set("infected", v)} />
                    {v === "yes" ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {form.diabetic === "yes" && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className={labelCls}>Most Recent A1C (%)</label>
                <input type="number" step="0.1" min="0" max="25" className={inputCls} value={form.a1cPercent} onChange={(e) => set("a1cPercent", e.target.value)} placeholder="e.g., 7.2" />
              </div>
              <div>
                <label className={labelCls}>A1C Measured On</label>
                <input type="date" className={inputCls} value={form.a1cMeasuredAt} onChange={(e) => set("a1cMeasuredAt", e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Scheduling & Delivery */}
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800">Scheduling & Delivery</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Proposed Application Date *</label>
              <input required type="date" className={inputCls} value={form.applicationDate} onChange={(e) => set("applicationDate", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Preferred Delivery Date *</label>
              <input required type="date" className={inputCls} value={form.deliveryDate} onChange={(e) => set("deliveryDate", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Delivery Street Address</label>
            <input className={inputCls} value={form.deliveryAddress} onChange={(e) => set("deliveryAddress", e.target.value)} placeholder="123 Medical Dr" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>City</label>
              <input className={inputCls} value={form.deliveryCity} onChange={(e) => set("deliveryCity", e.target.value)} placeholder="Miami" />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input className={inputCls} maxLength={2} value={form.deliveryState} onChange={(e) => set("deliveryState", e.target.value.toUpperCase().slice(0, 2))} placeholder="FL" />
            </div>
            <div>
              <label className={labelCls}>Zip</label>
              <input className={inputCls} maxLength={10} value={form.deliveryZip} onChange={(e) => set("deliveryZip", e.target.value)} placeholder="33101" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Special Instructions (optional)</label>
            <textarea rows={3} className={inputCls} value={form.instructions} onChange={(e) => set("instructions", e.target.value)} placeholder="Any special handling or scheduling notes…" />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/wound-care/orders")}
            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting…" : "Submit BV Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
