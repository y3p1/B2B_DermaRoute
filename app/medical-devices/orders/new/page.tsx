"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/auth";
import { apiPost } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, ChevronLeft, Wind } from "lucide-react";

type FormData = {
  insurance: string;
  placeOfService: string;
  firstName: string;
  lastName: string;
  dob: string;
  mrn: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  diagnosis: string[];
  conservativeTherapy: "yes" | "no" | "";
  skinChanges: string[];
  extremity: string[];
  measurements: Record<string, string>;
  device: string;
  hcpcs: string;
  deviceRecommended: boolean;
  garmentType: string;
  garmentStyle: string;
  compressionLevel: string;
  quantity: string;
  customMade: "yes" | "no" | "";
  manufacturerPreference: string;
  distalPressureMmhg: string;
  timesPerDay: string;
  minutesPerSession: string;
};

const EMPTY_FORM: FormData = {
  insurance: "", placeOfService: "", firstName: "", lastName: "", dob: "", mrn: "",
  address: "", city: "", state: "", zip: "", phone: "", email: "",
  diagnosis: [], conservativeTherapy: "", skinChanges: [], extremity: [], measurements: {},
  device: "", hcpcs: "", deviceRecommended: true, garmentType: "", garmentStyle: "",
  compressionLevel: "", quantity: "", customMade: "", manufacturerPreference: "",
  distalPressureMmhg: "", timesPerDay: "", minutesPerSession: "",
};

const STEP_LABELS = ["Patient & Eligibility", "Device & Garment", "Review & Submit"];

const DIAGNOSES = [
  { code: "i89.0", label: "I89.0 — Lymphedema" },
  { code: "q82.0", label: "Q82.0 — Hereditary Lymphedema" },
  { code: "i97.2", label: "I97.2 — Post-mastectomy Lymphedema" },
];

const SKIN_CHANGES = ["Hyperpigmentation", "Hyperplasia", "Elephantiasis", "Lymphorrhea", "Papillomas"];
const EXTREMITIES = ["Left Leg", "Right Leg", "Bilateral Legs", "Left Arm", "Right Arm"];
const LEG_EXTREMITIES = new Set(["Left Leg", "Right Leg", "Bilateral Legs"]);
const ARM_EXTREMITIES = new Set(["Left Arm", "Right Arm"]);
const LEG_MEASUREMENTS = ["Ankle", "Calf", "Knee", "Thigh"];
const ARM_MEASUREMENTS = ["Wrist", "Forearm", "Elbow", "Upper Arm"];

function getRecommendedDevice(fd: FormData): { device: string; hcpcs: string } {
  const hasArm = fd.extremity.some((e) => ARM_EXTREMITIES.has(e));
  const isAdvOrComm = fd.insurance === "Medicare Advantage" || fd.insurance === "Commercial";
  if (hasArm || isAdvOrComm) return { device: "AIROS 8", hcpcs: "E0652" };
  return { device: "AIROS 6", hcpcs: "E0651" };
}

function hcpcsForDevice(device: string): string {
  return device === "AIROS 8" ? "E0652" : "E0651";
}

function toggleArray(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">{children}</h3>;
}

function FieldRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-4", className)}>{children}</div>;
}

function Field({ label, children, fullWidth }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <Label className="text-xs text-slate-600 mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 w-40 shrink-0">{label}</span>
      <span className="text-xs text-slate-800 font-medium">{String(value)}</span>
    </div>
  );
}

export default function MedicalDevicesNewOrderPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.jwt);
  const [step, setStep] = React.useState(1);
  const [formData, setFormData] = React.useState<FormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (step === 2 && !formData.device) {
      const rec = getRecommendedDevice(formData);
      setFormData((prev) => ({ ...prev, device: rec.device, hcpcs: rec.hcpcs, deviceRecommended: true }));
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key: keyof FormData, value: FormData[typeof key]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const hasLeg = formData.extremity.some((e) => LEG_EXTREMITIES.has(e));
  const hasArm = formData.extremity.some((e) => ARM_EXTREMITIES.has(e));

  const step1Valid =
    formData.insurance.trim() !== "" &&
    formData.firstName.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    formData.dob.trim() !== "" &&
    formData.diagnosis.length > 0 &&
    formData.conservativeTherapy === "yes" &&
    formData.skinChanges.length > 0 &&
    formData.extremity.length > 0;

  const step2Valid = formData.device !== "";

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const measEntries = Object.entries(formData.measurements)
        .filter(([, v]) => v !== "")
        .map(([k, v]) => [k, Number(v)] as [string, number]);

      await apiPost<{ success: true; data: { id: string } }, Record<string, unknown>>(
        "/api/lymphedema-orders",
        {
          patient: {
            firstName: formData.firstName, lastName: formData.lastName, dob: formData.dob,
            mrn: formData.mrn || undefined, address: formData.address || undefined,
            city: formData.city || undefined, state: formData.state || undefined,
            zip: formData.zip || undefined, phone: formData.phone || undefined,
            email: formData.email || undefined,
          },
          insurance: formData.insurance,
          placeOfService: formData.placeOfService || undefined,
          diagnosis: formData.diagnosis,
          conservativeTherapyCompleted: formData.conservativeTherapy === "yes",
          skinChanges: formData.skinChanges,
          extremity: formData.extremity,
          measurements: measEntries.length ? Object.fromEntries(measEntries) : undefined,
          device: formData.device || undefined,
          hcpcs: formData.hcpcs || undefined,
          deviceRecommended: formData.deviceRecommended,
          garmentType: formData.garmentType || undefined,
          garmentStyle: formData.garmentStyle || undefined,
          compressionLevel: formData.compressionLevel || undefined,
          quantity: formData.quantity ? Number(formData.quantity) : undefined,
          customMade: formData.customMade === "yes" ? true : formData.customMade === "no" ? false : undefined,
          manufacturerPreference: formData.manufacturerPreference || undefined,
          distalPressureMmhg: formData.distalPressureMmhg ? Number(formData.distalPressureMmhg) : undefined,
          timesPerDay: formData.timesPerDay ? Number(formData.timesPerDay) : undefined,
          minutesPerSession: formData.minutesPerSession ? Number(formData.minutesPerSession) : undefined,
        },
        { token: token ?? undefined },
      );
      router.push("/medical-devices/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit order");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
          <Wind className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-purple-900">New AIROS Order</h1>
          <p className="text-xs text-slate-500">Complete all 3 steps to submit</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEP_LABELS.map((label, idx) => {
          const num = idx + 1;
          const done = step > num;
          const active = step === num;
          return (
            <React.Fragment key={num}>
              <div className="flex items-center gap-2">
                <div
                  className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                    done || active ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-400")}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : num}
                </div>
                <span className={cn("text-xs font-medium whitespace-nowrap", active ? "text-slate-800" : "text-slate-400")}>
                  {label}
                </span>
              </div>
              {idx < STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-3" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Form content */}
      <div className="bg-white rounded-xl border border-purple-100 shadow-sm">
        <div className="px-6 py-5 space-y-6">
          {step === 1 && (
            <>
              <div>
                <SectionHeader>Insurance & Service</SectionHeader>
                <FieldRow>
                  <Field label="Insurance *">
                    <Select value={formData.insurance} onValueChange={(v) => set("insurance", v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Medicare (Standard)">Medicare (Standard)</SelectItem>
                        <SelectItem value="Medicare Advantage">Medicare Advantage</SelectItem>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Place of Service">
                    <Select value={formData.placeOfService} onValueChange={(v) => set("placeOfService", v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POS 11 – Office">POS 11 – Office</SelectItem>
                        <SelectItem value="POS 12 – Home">POS 12 – Home</SelectItem>
                        <SelectItem value="POS 32 – SNF">POS 32 – SNF</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldRow>
              </div>

              <div>
                <SectionHeader>Patient Demographics</SectionHeader>
                <div className="space-y-3">
                  <FieldRow>
                    <Field label="First Name *"><Input className="h-9 text-sm" value={formData.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
                    <Field label="Last Name *"><Input className="h-9 text-sm" value={formData.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
                  </FieldRow>
                  <FieldRow>
                    <Field label="Date of Birth *"><Input type="date" className="h-9 text-sm" value={formData.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
                    <Field label="MRN (optional)"><Input className="h-9 text-sm" value={formData.mrn} onChange={(e) => set("mrn", e.target.value)} /></Field>
                  </FieldRow>
                  <Field label="Address" fullWidth><Input className="h-9 text-sm" value={formData.address} onChange={(e) => set("address", e.target.value)} /></Field>
                  <FieldRow>
                    <Field label="City"><Input className="h-9 text-sm" value={formData.city} onChange={(e) => set("city", e.target.value)} /></Field>
                    <FieldRow className="gap-2">
                      <Field label="State"><Input className="h-9 text-sm" maxLength={2} value={formData.state} onChange={(e) => set("state", e.target.value.toUpperCase())} /></Field>
                      <Field label="Zip"><Input className="h-9 text-sm" value={formData.zip} onChange={(e) => set("zip", e.target.value)} /></Field>
                    </FieldRow>
                  </FieldRow>
                  <FieldRow>
                    <Field label="Phone"><Input type="tel" className="h-9 text-sm" value={formData.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
                    <Field label="Email"><Input type="email" className="h-9 text-sm" value={formData.email} onChange={(e) => set("email", e.target.value)} /></Field>
                  </FieldRow>
                </div>
              </div>

              <div>
                <SectionHeader>Clinical Eligibility</SectionHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-slate-600 mb-2 block">Diagnosis (select all that apply) *</Label>
                    <div className="space-y-2">
                      {DIAGNOSES.map((d) => (
                        <label key={d.code} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={formData.diagnosis.includes(d.code)} onChange={() => set("diagnosis", toggleArray(formData.diagnosis, d.code))} className="rounded border-slate-300" />
                          <span className="text-sm text-slate-700">{d.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600 mb-2 block">Has patient completed 4+ weeks of conservative therapy? *</Label>
                    <div className="flex gap-4">
                      {(["yes", "no"] as const).map((v) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="conservativeTherapy" value={v} checked={formData.conservativeTherapy === v} onChange={() => set("conservativeTherapy", v)} />
                          <span className="text-sm text-slate-700">{v === "yes" ? "Yes" : "No"}</span>
                        </label>
                      ))}
                    </div>
                    {formData.conservativeTherapy === "no" && (
                      <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                        Patient must have completed at least 4 weeks of conservative therapy to qualify. Cannot proceed.
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600 mb-2 block">Skin changes present (select all) *</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {SKIN_CHANGES.map((sc) => (
                        <label key={sc} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={formData.skinChanges.includes(sc)} onChange={() => set("skinChanges", toggleArray(formData.skinChanges, sc))} className="rounded border-slate-300" />
                          <span className="text-sm text-slate-700">{sc}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600 mb-2 block">Affected extremity (select all) *</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {EXTREMITIES.map((ex) => (
                        <label key={ex} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={formData.extremity.includes(ex)} onChange={() => set("extremity", toggleArray(formData.extremity, ex))} className="rounded border-slate-300" />
                          <span className="text-sm text-slate-700">{ex}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {hasLeg && (
                    <div>
                      <Label className="text-xs text-slate-600 mb-2 block">Leg measurements (cm)</Label>
                      <FieldRow>
                        {LEG_MEASUREMENTS.map((m) => (
                          <Field key={m} label={`${m} (cm)`}>
                            <Input type="number" className="h-9 text-sm" value={formData.measurements[m] ?? ""} onChange={(e) => set("measurements", { ...formData.measurements, [m]: e.target.value })} />
                          </Field>
                        ))}
                      </FieldRow>
                    </div>
                  )}

                  {hasArm && (
                    <div>
                      <Label className="text-xs text-slate-600 mb-2 block">Arm measurements (cm)</Label>
                      <FieldRow>
                        {ARM_MEASUREMENTS.map((m) => (
                          <Field key={m} label={`${m} (cm)`}>
                            <Input type="number" className="h-9 text-sm" value={formData.measurements[m] ?? ""} onChange={(e) => set("measurements", { ...formData.measurements, [m]: e.target.value })} />
                          </Field>
                        ))}
                      </FieldRow>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <SectionHeader>Device Selection</SectionHeader>
                <div className="space-y-3">
                  {formData.deviceRecommended && formData.device && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs text-emerald-800">
                        Recommended: <strong>{formData.device}</strong> ({hcpcsForDevice(formData.device)}) based on clinical inputs
                      </span>
                    </div>
                  )}
                  <FieldRow>
                    <Field label="Device *">
                      <Select value={formData.device} onValueChange={(v) => { const rec = getRecommendedDevice(formData); set("device", v); set("hcpcs", hcpcsForDevice(v)); set("deviceRecommended", v === rec.device); }}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select device…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AIROS 6">AIROS 6 — E0651</SelectItem>
                          <SelectItem value="AIROS 8">AIROS 8 — E0652</SelectItem>
                          <SelectItem value="AIROS 6P">AIROS 6P — E0651</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="HCPCS Code">
                      <div className="h-9 flex items-center px-3 rounded-md border border-slate-200 bg-slate-50 text-sm font-mono text-slate-700">{formData.hcpcs || "—"}</div>
                    </Field>
                  </FieldRow>
                </div>
              </div>

              <div>
                <SectionHeader>Garment Selection</SectionHeader>
                <div className="space-y-3">
                  <FieldRow>
                    <Field label="Garment Type">
                      <Select value={formData.garmentType} onValueChange={(v) => set("garmentType", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Stocking">Stocking</SelectItem>
                          <SelectItem value="Gloves/Sleeves">Gloves/Sleeves</SelectItem>
                          <SelectItem value="Compression Wraps">Compression Wraps</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Garment Style">
                      <Input className="h-9 text-sm" placeholder="e.g. Below Knee, Arm Sleeve…" value={formData.garmentStyle} onChange={(e) => set("garmentStyle", e.target.value)} />
                    </Field>
                  </FieldRow>
                  <FieldRow>
                    <Field label="Compression Level">
                      <Select value={formData.compressionLevel} onValueChange={(v) => set("compressionLevel", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CL1 (20–30 mmHg)">CL1 (20–30 mmHg)</SelectItem>
                          <SelectItem value="CLII (30–40 mmHg)">CLII (30–40 mmHg)</SelectItem>
                          <SelectItem value="CLIII (40–50 mmHg)">CLIII (40–50 mmHg)</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Quantity">
                      <Select value={formData.quantity} onValueChange={(v) => set("quantity", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldRow>
                  <FieldRow>
                    <Field label="Custom Made Garment">
                      <div className="flex gap-4 mt-1">
                        {(["yes", "no"] as const).map((v) => (
                          <label key={v} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="customMade" value={v} checked={formData.customMade === v} onChange={() => set("customMade", v)} />
                            <span className="text-sm text-slate-700">{v === "yes" ? "Yes" : "No"}</span>
                          </label>
                        ))}
                      </div>
                    </Field>
                    <Field label="Manufacturer Preference">
                      <Select value={formData.manufacturerPreference} onValueChange={(v) => set("manufacturerPreference", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Medi USA">Medi USA</SelectItem>
                          <SelectItem value="BSN Jobst/Farrow">BSN Jobst/Farrow</SelectItem>
                          <SelectItem value="L&R">L&R</SelectItem>
                          <SelectItem value="Juzo">Juzo</SelectItem>
                          <SelectItem value="Sigvaris">Sigvaris</SelectItem>
                          <SelectItem value="No Preference">No Preference</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldRow>
                </div>
              </div>

              <div>
                <SectionHeader>Treatment Protocol</SectionHeader>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Distal Pressure (mmHg)">
                    <Select value={formData.distalPressureMmhg} onValueChange={(v) => set("distalPressureMmhg", v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {["65", "60", "55", "50", "45", "40", "35", "30"].map((v) => (
                          <SelectItem key={v} value={v}>{v} mmHg</SelectItem>
                        ))}
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Times per Day">
                    <Select value={formData.timesPerDay} onValueChange={(v) => set("timesPerDay", v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1×</SelectItem>
                        <SelectItem value="2">2×</SelectItem>
                        <SelectItem value="3">3×</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Minutes per Session">
                    <Select value={formData.minutesPerSession} onValueChange={(v) => set("minutesPerSession", v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {["15", "30", "45", "60"].map((v) => (
                          <SelectItem key={v} value={v}>{v} min</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 p-4 space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Patient</p>
                <SummaryRow label="Name" value={`${formData.firstName} ${formData.lastName}`} />
                <SummaryRow label="Date of Birth" value={formData.dob} />
                <SummaryRow label="MRN" value={formData.mrn} />
                <SummaryRow label="Address" value={[formData.address, formData.city, formData.state, formData.zip].filter(Boolean).join(", ")} />
                <SummaryRow label="Phone" value={formData.phone} />
                <SummaryRow label="Email" value={formData.email} />
              </div>
              <div className="rounded-xl border border-slate-200 p-4 space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Insurance & Service</p>
                <SummaryRow label="Insurance" value={formData.insurance} />
                <SummaryRow label="Place of Service" value={formData.placeOfService} />
              </div>
              <div className="rounded-xl border border-slate-200 p-4 space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Clinical</p>
                <SummaryRow label="Diagnosis" value={formData.diagnosis.join(", ")} />
                <SummaryRow label="Conservative therapy" value={formData.conservativeTherapy === "yes" ? "Yes (≥4 weeks)" : "No"} />
                <SummaryRow label="Skin changes" value={formData.skinChanges.join(", ")} />
                <SummaryRow label="Extremity" value={formData.extremity.join(", ")} />
                {Object.entries(formData.measurements).filter(([, v]) => v).map(([k, v]) => (
                  <SummaryRow key={k} label={`${k} measurement`} value={`${v} cm`} />
                ))}
              </div>
              <div className="rounded-xl border border-slate-200 p-4 space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Device & Garment</p>
                <SummaryRow label="Device" value={`${formData.device} (${formData.hcpcs})`} />
                <SummaryRow label="Garment type" value={formData.garmentType} />
                <SummaryRow label="Garment style" value={formData.garmentStyle} />
                <SummaryRow label="Compression level" value={formData.compressionLevel} />
                <SummaryRow label="Quantity" value={formData.quantity} />
                <SummaryRow label="Custom made" value={formData.customMade === "yes" ? "Yes" : formData.customMade === "no" ? "No" : undefined} />
                <SummaryRow label="Manufacturer pref." value={formData.manufacturerPreference} />
              </div>
              <div className="rounded-xl border border-slate-200 p-4 space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Treatment Protocol</p>
                <SummaryRow label="Distal pressure" value={formData.distalPressureMmhg ? `${formData.distalPressureMmhg} mmHg` : undefined} />
                <SummaryRow label="Times per day" value={formData.timesPerDay ? `${formData.timesPerDay}×` : undefined} />
                <SummaryRow label="Minutes per session" value={formData.minutesPerSession ? `${formData.minutesPerSession} min` : undefined} />
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
                Note: Insurance processing can take up to 4 weeks. The submitted order will be forwarded for fulfillment.
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          <Button
            variant="outline"
            size="sm"
            onClick={step === 1 ? () => router.push("/medical-devices/orders") : () => { setStep((s) => s - 1); setError(null); }}
            disabled={isSubmitting}
            className="gap-1.5"
          >
            {step === 1 ? "Cancel" : <><ChevronLeft className="w-4 h-4" />Back</>}
          </Button>
          {step < 3 ? (
            <Button
              size="sm"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 ? !step1Valid : !step2Valid}
              className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => { void handleSubmit(); }}
              disabled={isSubmitting}
              className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSubmitting ? "Submitting…" : "Submit Order"}
              {!isSubmitting && <Check className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
