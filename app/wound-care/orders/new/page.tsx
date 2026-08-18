"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/auth";
import { apiPost } from "@/lib/apiClient";

// Single Zod schema drives validation for the whole form. Because react-hook-form
// runs the resolver on submit, every invalid required field surfaces its message
// at once (not one native bubble at a time).
const schema = z
  .object({
    initials: z.string().trim().min(1, "Patient initials are required"),
    insurance: z.string().min(1, "Insurance is required"),
    placeOfService: z.string().min(1, "Select a place of service"),
    woundType: z.string().min(1, "Wound type is required"),
    woundSize: z.string().trim().min(1, "Wound size is required"),
    woundLocation: z.string().optional(),
    icd10: z.string().optional(),
    conservativeTherapy: z.string().min(1, "Please answer"),
    diabetic: z.string().min(1, "Please answer"),
    a1cPercent: z
      .string()
      .optional()
      .refine(
        (v) => !v || (Number(v) >= 0 && Number(v) <= 25),
        "A1C must be between 0 and 25",
      ),
    a1cMeasuredAt: z.string().optional(),
    tunneling: z.string().min(1, "Please answer"),
    infected: z.string().min(1, "Please answer"),
    applicationDate: z.string().min(1, "Application date is required"),
    deliveryDate: z.string().min(1, "Delivery date is required"),
    deliveryAddress: z.string().optional(),
    deliveryCity: z.string().optional(),
    deliveryState: z.string().optional(),
    deliveryZip: z.string().optional(),
    instructions: z.string().optional(),
  })
  // Require an A1C value once the patient is marked diabetic.
  .refine((d) => d.diabetic !== "yes" || (d.a1cPercent ?? "") !== "", {
    path: ["a1cPercent"],
    message: "A1C is required for diabetic patients",
  });

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
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
  const [insurancesList, setInsurancesList] = React.useState<InsuranceOption[]>([]);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });

  // Prefill delivery address from the provider profile once it loads.
  React.useEffect(() => {
    if (!provider) return;
    if (provider.clinicAddress) setValue("deliveryAddress", provider.clinicAddress);
    if (provider.clinicCity) setValue("deliveryCity", provider.clinicCity);
    if (provider.clinicState) setValue("deliveryState", provider.clinicState);
    if (provider.clinicZip) setValue("deliveryZip", provider.clinicZip);
  }, [provider, setValue]);

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

  async function onSubmit(form: FormValues) {
    if (!token || !provider?.id) { setServerError("Not authenticated"); return; }
    setServerError(null);
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
      setServerError(err instanceof Error ? err.message : "Submission failed");
    }
  }

  const inputCls = (err?: boolean) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white ${
      err ? "border-red-400 focus:ring-red-400" : "border-slate-300 focus:ring-emerald-400"
    }`;
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";
  const radioCls = (selected: boolean) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
      selected ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
    }`;

  const diabetic = watch("diabetic");
  const woundType = watch("woundType");
  const placeOfService = watch("placeOfService");
  const conservativeTherapy = watch("conservativeTherapy");
  const tunneling = watch("tunneling");
  const infected = watch("infected");

  // Small red error line, shown for any field the schema rejected.
  const Err = ({ msg }: { msg?: string }) =>
    msg ? <p className="text-xs text-red-600 mt-1">{msg}</p> : null;

  // Toggle-pill group helper (place of service, wound type, yes/no flags).
  const pick = (field: keyof FormValues, value: string) =>
    setValue(field, value, { shouldValidate: true });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-emerald-900">New BV Request</h1>
        <p className="text-sm text-slate-500 mt-1">
          Submit a benefits verification for wound care tissue products.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Patient */}
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800">Patient Information</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-medium">
            HIPAA: Use patient INITIALS ONLY. No PHI accepted.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Patient Initials *</label>
              <input className={inputCls(!!errors.initials)} placeholder="e.g., JD" {...register("initials")} />
              <Err msg={errors.initials?.message} />
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
              <select className={inputCls(!!errors.insurance)} {...register("insurance")}>
                <option value="">Select insurance…</option>
                {insurancesList.map((ins) => (
                  <option key={ins.id} value={ins.name}>
                    {ins.name} ({ins.commercial ? "Commercial" : "Non-Commercial"})
                  </option>
                ))}
              </select>
              <Err msg={errors.insurance?.message} />
            </div>
            <div>
              <label className={labelCls}>Place of Service *</label>
              <div className="flex gap-3">
                {(["office", "hospital"] as const).map((pos) => (
                  <button type="button" key={pos} className={radioCls(placeOfService === pos)} onClick={() => pick("placeOfService", pos)}>
                    {pos.charAt(0).toUpperCase() + pos.slice(1)}
                  </button>
                ))}
              </div>
              <Err msg={errors.placeOfService?.message} />
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
                <button type="button" key={wt} className={radioCls(woundType === wt)} onClick={() => pick("woundType", wt)}>
                  {wt}
                </button>
              ))}
            </div>
            <Err msg={errors.woundType?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Wound Size *</label>
              <input className={inputCls(!!errors.woundSize)} placeholder='e.g., "4x4 cm", "16 cm²"' {...register("woundSize")} />
              <p className="text-xs text-slate-400 mt-1">Enter dimensions (e.g., 4x4 cm, 2.5 x 3 cm)</p>
              <Err msg={errors.woundSize?.message} />
            </div>
            <div>
              <label className={labelCls}>Wound Location</label>
              <input className={inputCls()} placeholder="e.g., Left foot plantar" {...register("woundLocation")} />
            </div>
          </div>

          <div>
            <label className={labelCls}>ICD-10 Codes</label>
            <input className={inputCls()} placeholder="Comma-separated (e.g., L97.529, E11.621)" {...register("icd10")} />
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
                  <button type="button" key={v} className={radioCls(conservativeTherapy === v)} onClick={() => pick("conservativeTherapy", v)}>
                    {v === "yes" ? "Yes" : "No"}
                  </button>
                ))}
              </div>
              <Err msg={errors.conservativeTherapy?.message} />
            </div>

            <div>
              <label className={labelCls}>Patient diabetic? *</label>
              <div className="flex gap-3 mt-1">
                {(["yes", "no"] as const).map((v) => (
                  <button type="button" key={v} className={radioCls(diabetic === v)} onClick={() => pick("diabetic", v)}>
                    {v === "yes" ? "Yes" : "No"}
                  </button>
                ))}
              </div>
              <Err msg={errors.diabetic?.message} />
            </div>

            <div>
              <label className={labelCls}>Tunneling / undermining? *</label>
              <div className="flex gap-3 mt-1">
                {(["yes", "no"] as const).map((v) => (
                  <button type="button" key={v} className={radioCls(tunneling === v)} onClick={() => pick("tunneling", v)}>
                    {v === "yes" ? "Yes" : "No"}
                  </button>
                ))}
              </div>
              <Err msg={errors.tunneling?.message} />
            </div>

            <div>
              <label className={labelCls}>Currently infected? *</label>
              <div className="flex gap-3 mt-1">
                {(["yes", "no"] as const).map((v) => (
                  <button type="button" key={v} className={radioCls(infected === v)} onClick={() => pick("infected", v)}>
                    {v === "yes" ? "Yes" : "No"}
                  </button>
                ))}
              </div>
              <Err msg={errors.infected?.message} />
            </div>
          </div>

          {diabetic === "yes" && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className={labelCls}>Most Recent A1C (%)</label>
                <input type="number" step="0.1" min="0" max="25" className={inputCls(!!errors.a1cPercent)} placeholder="e.g., 7.2" {...register("a1cPercent")} />
                <Err msg={errors.a1cPercent?.message} />
              </div>
              <div>
                <label className={labelCls}>A1C Measured On</label>
                <input type="date" className={inputCls()} {...register("a1cMeasuredAt")} />
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
              <input type="date" className={inputCls(!!errors.applicationDate)} {...register("applicationDate")} />
              <Err msg={errors.applicationDate?.message} />
            </div>
            <div>
              <label className={labelCls}>Preferred Delivery Date *</label>
              <input type="date" className={inputCls(!!errors.deliveryDate)} {...register("deliveryDate")} />
              <Err msg={errors.deliveryDate?.message} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Delivery Street Address</label>
            <input className={inputCls()} placeholder="123 Medical Dr" {...register("deliveryAddress")} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>City</label>
              <input className={inputCls()} placeholder="Miami" {...register("deliveryCity")} />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input className={inputCls()} maxLength={2} placeholder="FL" {...register("deliveryState")} />
            </div>
            <div>
              <label className={labelCls}>Zip</label>
              <input className={inputCls()} maxLength={10} placeholder="33101" {...register("deliveryZip")} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Special Instructions (optional)</label>
            <textarea rows={3} className={inputCls()} placeholder="Any special handling or scheduling notes…" {...register("instructions")} />
          </div>
        </div>

        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{serverError}</div>
        )}

        {Object.keys(errors).length > 0 && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            Please fix the highlighted fields before submitting.
          </div>
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
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Submitting…" : "Submit BV Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
