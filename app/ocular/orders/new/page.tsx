"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useAuthStore } from "@/store/auth";
import { apiPost } from "@/lib/apiClient";

/* ─── ICD-10 DATA ──────────────────────────────────────────────────────────── */
const ICD10_CODES = [
  { code: "H04.131–H04.139", label: "Lacrimal cyst" },
  { code: "H10.021–H10.029", label: "Mucopurulent conjunctivitis" },
  { code: "H16.011–H16.013", label: "Central corneal ulcer" },
  { code: "H16.121–H16.129", label: "Filamentary keratitis" },
  { code: "H16.211–H16.219", label: "Exposure keratoconjunctivitis" },
  { code: "H16.231–H16.239", label: "Neurotrophic keratoconjunctivitis" },
  { code: "H16.8", label: "Other keratitis" },
  { code: "H18.10 / H18.13", label: "Bullous keratopathy" },
  { code: "H18.421–H18.429", label: "Band keratopathy" },
  { code: "H18.52", label: "Epithelial (Juvenile) corneal dystrophy" },
  { code: "H18.831–H18.839", label: "Recurrent erosion of cornea" },
  { code: "H18.899", label: "Persistent epithelial defect" },
  { code: "L51.1", label: "Stevens-Johnson syndrome" },
  { code: "T26.10–T26.12", label: "Burn of cornea and conjunctival sac" },
];

/* ─── PRODUCTS ─────────────────────────────────────────────────────────────── */
const PRODUCTS = {
  thin: {
    label: "Thin (45µm)",
    desc: "Suture-free application with bandage contact lens technique. Ideal for surface conditions requiring a thin, conforming membrane.",
    sizes: [
      { label: "8mm disc", sizeMm: 8, sku: "VS4508" },
      { label: "10mm disc", sizeMm: 10, sku: "VS4510" },
      { label: "12mm disc", sizeMm: 12, sku: "VS4512" },
    ],
  },
  thick: {
    label: "Thick (200µm)",
    desc: "Greater tissue volume for more substantial corneal and ocular surface conditions. Same room-temperature storage and easy application.",
    sizes: [
      { label: "8mm disc", sizeMm: 8, sku: "VS20008" },
      { label: "10mm disc", sizeMm: 10, sku: "VS20010" },
      { label: "12mm disc", sizeMm: 12, sku: "VS20012" },
    ],
  },
} as const;

type Variant = keyof typeof PRODUCTS;

const STEPS = ["Patient", "Diagnosis", "Product", "Shipping", "Review"] as const;

/* ─── FORM STATE ────────────────────────────────────────────────────────────── */
type DiagnosisEntry = { code: string; label: string };

type FormState = {
  firstName: string;
  lastName: string;
  dob: string;
  mrn: string;
  primaryDiagnosis: DiagnosisEntry | null;
  secondaryDiagnosis: DiagnosisEntry | null;
  clinicalNotes: string;
  eyeTreated: "right" | "left" | "bilateral" | "";
  variant: Variant | "";
  discSku: string;
  discSizeMm: number | null;
  discSizeLabel: string;
  quantity: number;
  dateNeededBy: string;
  applicationTechnique: string;
  shipToAddress: string;
  shipToCity: string;
  shipToState: string;
  shipToZip: string;
  specialInstructions: string;
  insuranceName: string;
  insuranceId: string;
  groupNumber: string;
};

/* ─── OCULAR PRODUCTS CATALOG ──────────────────────────────────────────────── */
const OCULAR_CATALOG = [
  {
    id: "visidisc",
    name: "VisiDisc®",
    manufacturer: "Skye Biologics",
    icon: "👁",
    desc: "FastActing® amniotic membrane allograft for corneal and ocular surface conditions. Available in Thin (45µm) and Thick (200µm), sizes 8mm–12mm. Room temp storage, 5-year shelf life.",
    tag: "Available Now",
    tagColor: "#0c6e6e",
    tagBg: "#f0f9f9",
    disabled: false,
  },
  {
    id: "coming_soon",
    name: "More Ocular Products Coming Soon",
    icon: "⏳",
    desc: "Additional ocular products will be available here as they are added to the portal.",
    tag: "Coming Soon",
    tagColor: "#92400e",
    tagBg: "#fef3c7",
    disabled: true,
  },
];

/* ─── COLOUR / STYLE CONSTANTS ─────────────────────────────────────────────── */
const PRIMARY = "#0c6e6e";
const PRIMARY_LIGHT = "#f0f9f9";
const PRIMARY_BORDER = "#b2e0e0";
const PRIMARY_MED = "#7ecece";

/* ─── TOP-LEVEL PAGE ────────────────────────────────────────────────────────── */
export default function NewOcularOrderPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.jwt);
  const provider = useAuthStore((s) => s.provider);

  const [screen, setScreen] = React.useState<"selector" | "form">("selector");
  const [step, setStep] = React.useState(0);
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const [diagSearch, setDiagSearch] = React.useState("");
  const [secDiagSearch, setSecDiagSearch] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const makeInitial = React.useCallback((): FormState => ({
    firstName: "",
    lastName: "",
    dob: "",
    mrn: "",
    primaryDiagnosis: null,
    secondaryDiagnosis: null,
    clinicalNotes: "",
    eyeTreated: "",
    variant: "",
    discSku: "",
    discSizeMm: null,
    discSizeLabel: "",
    quantity: 1,
    dateNeededBy: "",
    applicationTechnique: "",
    shipToAddress: provider?.clinicAddress ?? "",
    shipToCity: provider?.clinicCity ?? "",
    shipToState: provider?.clinicState ?? "",
    shipToZip: provider?.clinicZip ?? "",
    specialInstructions: "",
    insuranceName: "",
    insuranceId: "",
    groupNumber: "",
  }), [provider]);

  const [form, setForm] = React.useState<FormState>(makeInitial);

  React.useEffect(() => {
    if (provider) {
      setForm((prev) => ({
        ...prev,
        shipToAddress: prev.shipToAddress || provider.clinicAddress || "",
        shipToCity: prev.shipToCity || provider.clinicCity || "",
        shipToState: prev.shipToState || provider.clinicState || "",
        shipToZip: prev.shipToZip || provider.clinicZip || "",
      }));
    }
  }, [provider]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    // Clear this field's validation error as soon as the user edits it.
    setErrors((e) => {
      if (!e[k as string]) return e;
      const next = { ...e };
      delete next[k as string];
      return next;
    });
  };

  // Per-step Zod schemas. Validating on "Continue" surfaces every missing
  // required field for that step at once (consistent with the BV Request form).
  const stepSchemas: Record<number, z.ZodTypeAny> = {
    0: z.object({
      firstName: z.string().trim().min(1, "First name is required"),
      lastName: z.string().trim().min(1, "Last name is required"),
      dob: z.string().min(1, "Date of birth is required"),
    }),
    1: z.object({
      primaryDiagnosis: z.any().refine((v) => !!v, "Select a primary diagnosis"),
      eyeTreated: z.string().min(1, "Select the eye to be treated"),
    }),
    2: z.object({
      variant: z.string().min(1, "Select a product variant"),
      discSku: z.string().min(1, "Select a disc size"),
      quantity: z.number().min(1, "Quantity must be at least 1"),
    }),
    3: z.object({
      shipToAddress: z.string().trim().min(1, "Ship-to address is required"),
      shipToCity: z.string().trim().min(1, "City is required"),
      shipToState: z.string().trim().min(1, "State is required"),
      shipToZip: z.string().trim().min(1, "ZIP is required"),
    }),
  };

  const validateStep = (s: number): Record<string, string> => {
    const schema = stepSchemas[s];
    if (!schema) return {};
    const res = schema.safeParse(form);
    if (res.success) return {};
    const fieldErrors = res.error.flatten().fieldErrors as Record<string, string[]>;
    const out: Record<string, string> = {};
    for (const key of Object.keys(fieldErrors)) {
      const msg = fieldErrors[key]?.[0];
      if (msg) out[key] = msg;
    }
    return out;
  };

  const handleContinue = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  };

  const reset = () => {
    setForm(makeInitial());
    setStep(0);
    setSubmitted(false);
    setSubmitError(null);
    setDiagSearch("");
    setSecDiagSearch("");
    setErrors({});
    setScreen("selector");
  };

  const handleConfirm = async () => {
    if (!token) { setSubmitError("Not authenticated"); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiPost<{ success: true; data: { id: string } }, Record<string, unknown>>(
        "/api/ocular/orders",
        {
          patient: {
            firstName: form.firstName,
            lastName: form.lastName,
            dob: form.dob,
            mrn: form.mrn || undefined,
          },
          primaryDiagnosis: form.primaryDiagnosis
            ? `${form.primaryDiagnosis.code} — ${form.primaryDiagnosis.label}`
            : "",
          secondaryDiagnosis: form.secondaryDiagnosis
            ? `${form.secondaryDiagnosis.code} — ${form.secondaryDiagnosis.label}`
            : undefined,
          eye: form.eyeTreated || undefined,
          productVariant: form.variant || undefined,
          sizeMm: form.discSizeMm ?? undefined,
          sku: form.discSku || undefined,
          quantity: form.quantity,
          dateNeededBy: form.dateNeededBy || undefined,
          shipTo: {
            address: form.shipToAddress,
            city: form.shipToCity,
            state: form.shipToState,
            zip: form.shipToZip,
          },
          specialInstructions: form.specialInstructions || undefined,
          insurancePayer: form.insuranceName || undefined,
          insuranceMemberId: form.insuranceId || undefined,
        },
        { token },
      );
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (screen === "selector") {
    return <ProductSelector onSelect={() => setScreen("form")} onBack={() => router.back()} />;
  }

  if (submitted) {
    return (
      <SuccessScreen
        form={form}
        provider={provider}
        onReset={reset}
        onBack={() => router.push("/ocular/orders")}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f7f7" }}>
      {/* Header */}
      <div style={{ background: PRIMARY, padding: "14px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={() => step === 0 ? setScreen("selector") : setStep((s) => s - 1)}
          style={{ color: "white", background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: "0 4px", opacity: 0.8 }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ color: "white", fontWeight: 700, letterSpacing: 2, fontSize: 13 }}>DermaRoute</div>
          <div style={{ color: PRIMARY_MED, fontSize: 11, letterSpacing: 1 }}>OCULAR PRODUCTS PORTAL</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "white", fontSize: 12, fontWeight: 600 }}>VisiDisc® Order Form</div>
          <div style={{ color: PRIMARY_MED, fontSize: 11 }}>CPT 65778 · Skye Biologics</div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "28px auto", padding: "0 16px" }}>
        {/* Progress bar */}
        <div style={{ background: "white", borderRadius: 12, padding: "18px 24px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex" }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  {i > 0 && <div style={{ flex: 1, height: 2, background: i <= step ? PRIMARY : "#e5e7eb" }} />}
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: i <= step ? PRIMARY : "#e5e7eb",
                    color: i <= step ? "white" : "#9ca3af",
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {i < step ? "✓" : i + 1}
                  </div>
                  {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? PRIMARY : "#e5e7eb" }} />}
                </div>
                <div style={{ fontSize: 10, marginTop: 4, color: i === step ? PRIMARY : "#9ca3af", fontWeight: i === step ? 700 : 400 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div style={{ background: "white", borderRadius: 12, padding: "28px 32px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          {step === 0 && (
            <StepPatient form={form} set={set} provider={provider} errors={errors} />
          )}
          {step === 1 && (
            <StepDiagnosis
              form={form} set={set} errors={errors}
              diagSearch={diagSearch} setDiagSearch={setDiagSearch}
              secDiagSearch={secDiagSearch} setSecDiagSearch={setSecDiagSearch}
            />
          )}
          {step === 2 && <StepProduct form={form} set={set} errors={errors} />}
          {step === 3 && <StepShipping form={form} set={set} errors={errors} />}
          {step === 4 && <StepReview form={form} provider={provider} />}

          {submitError && (
            <div style={{ margin: "16px 0 0", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#dc2626" }}>
              {submitError}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 28, paddingTop: 20, borderTop: "1px solid #f3f4f6" }}>
            {step > 0 && (
              <button onClick={() => { setErrors({}); setStep((s) => s - 1); }} style={backBtnStyle}>← Back</button>
            )}
            {step < 4 ? (
              <button onClick={handleContinue} style={nextBtnStyle}>
                Continue →
              </button>
            ) : (
              <button
                onClick={() => { void handleConfirm(); }}
                disabled={submitting}
                style={{ ...nextBtnStyle, background: PRIMARY, opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? "Submitting…" : "✓ Confirm Order"}
              </button>
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#9ca3af" }}>
          Orders reviewed by your DR representative · orders@skyebiologics.com · (310) 796-5680
        </div>
      </div>
    </div>
  );
}

/* ─── PRODUCT SELECTOR ──────────────────────────────────────────────────────── */
function ProductSelector({ onSelect, onBack }: { onSelect: () => void; onBack: () => void }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f0f7f7" }}>
      <div style={{ background: PRIMARY, padding: "14px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onBack} style={{ color: "white", background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: "0 4px", opacity: 0.8 }}>←</button>
        <div>
          <div style={{ color: "white", fontWeight: 700, letterSpacing: 2, fontSize: 13 }}>DermaRoute</div>
          <div style={{ color: PRIMARY_MED, fontSize: 11, letterSpacing: 1 }}>OCULAR PRODUCTS PORTAL</div>
        </div>
      </div>
      <div style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: PRIMARY, marginBottom: 6 }}>+ New Order</h1>
          <p style={{ fontSize: 14, color: "#6b7280" }}>Select the ocular product you would like to order.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {OCULAR_CATALOG.map((p) => (
            <div
              key={p.id}
              onClick={() => !p.disabled && onSelect()}
              style={{
                background: "white", borderRadius: 12, padding: "20px 24px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "2px solid #e5e7eb",
                cursor: p.disabled ? "not-allowed" : "pointer", opacity: p.disabled ? 0.6 : 1,
                display: "flex", alignItems: "center", gap: 18,
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => { if (!p.disabled) (e.currentTarget as HTMLDivElement).style.borderColor = PRIMARY; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e5e7eb"; }}
            >
              <div style={{ fontSize: 36, flexShrink: 0 }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{p.name}</span>
                  {"manufacturer" in p && p.manufacturer && (
                    <span style={{ fontSize: 12, color: "#6b7280" }}>by {p.manufacturer}</span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 600, color: p.tagColor, background: p.tagBg, padding: "2px 8px", borderRadius: 20 }}>{p.tag}</span>
                </div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{p.desc}</div>
              </div>
              {!p.disabled && <div style={{ fontSize: 20, color: "#9ca3af", flexShrink: 0 }}>→</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── STEP 0: PATIENT ───────────────────────────────────────────────────────── */
function StepPatient({
  form,
  set,
  provider,
  errors,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  provider: { clinicName?: string | null; clinicAddress?: string | null } | null;
  errors: Record<string, string>;
}) {
  return (
    <div>
      <SectionHeader icon="👤" title="Patient Information" />
      <div style={grid2Style}>
        <div>
          <Lbl>First Name *</Lbl>
          <Inp error={!!errors.firstName} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="First name" />
          <ErrText msg={errors.firstName} />
        </div>
        <div>
          <Lbl>Last Name *</Lbl>
          <Inp error={!!errors.lastName} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Last name" />
          <ErrText msg={errors.lastName} />
        </div>
        <div>
          <Lbl>Date of Birth *</Lbl>
          <Inp error={!!errors.dob} type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
          <ErrText msg={errors.dob} />
        </div>
        <div>
          <Lbl>MRN <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span></Lbl>
          <Inp value={form.mrn} onChange={(e) => set("mrn", e.target.value)} placeholder="Medical record number" />
        </div>
      </div>

      {provider && (
        <div style={{ marginTop: 24, background: PRIMARY_LIGHT, borderRadius: 8, padding: "12px 16px", border: `1px solid ${PRIMARY_BORDER}` }}>
          <div style={{ fontSize: 12, color: PRIMARY, fontWeight: 600, marginBottom: 6 }}>ℹ️ Auto-filled from your account</div>
          <div style={{ fontSize: 13, color: "#374151" }}>
            <strong>Practice:</strong> {provider.clinicName ?? "—"}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── STEP 1: DIAGNOSIS ─────────────────────────────────────────────────────── */
function StepDiagnosis({
  form, set, errors,
  diagSearch, setDiagSearch,
  secDiagSearch, setSecDiagSearch,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
  diagSearch: string;
  setDiagSearch: (v: string) => void;
  secDiagSearch: string;
  setSecDiagSearch: (v: string) => void;
}) {
  const filtered = (q: string) =>
    ICD10_CODES.filter(
      (c) =>
        c.label.toLowerCase().includes(q.toLowerCase()) ||
        c.code.toLowerCase().includes(q.toLowerCase()),
    );

  return (
    <div>
      <SectionHeader icon="🔍" title="Diagnosis" />

      {/* Primary */}
      <div style={{ marginBottom: 20 }}>
        <Lbl>Primary Diagnosis (ICD-10) *</Lbl>
        <Inp
          error={!!errors.primaryDiagnosis}
          value={diagSearch}
          onChange={(e) => {
            setDiagSearch(e.target.value);
            if (form.primaryDiagnosis) set("primaryDiagnosis", null);
          }}
          placeholder="Search condition or code..."
        />
        <ErrText msg={errors.primaryDiagnosis} />
        {diagSearch && !form.primaryDiagnosis && (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, marginTop: 4, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            {filtered(diagSearch).length === 0 ? (
              <div style={{ padding: "10px 14px", fontSize: 13, color: "#9ca3af" }}>No matching codes found</div>
            ) : (
              filtered(diagSearch).map((c) => (
                <div
                  key={c.code}
                  onClick={() => { set("primaryDiagnosis", c); setDiagSearch(`${c.code} — ${c.label}`); }}
                  style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #f3f4f6", display: "flex", gap: 10, background: "white" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = PRIMARY_LIGHT; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "white"; }}
                >
                  <span style={{ color: PRIMARY, fontWeight: 600, fontFamily: "monospace", fontSize: 12, minWidth: 130 }}>{c.code}</span>
                  <span style={{ color: "#374151" }}>{c.label}</span>
                </div>
              ))
            )}
          </div>
        )}
        {form.primaryDiagnosis && (
          <div style={{ marginTop: 6, background: PRIMARY_LIGHT, borderRadius: 6, padding: "8px 12px", border: `1px solid ${PRIMARY_BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: PRIMARY, fontWeight: 600 }}>{form.primaryDiagnosis.code}</span>
            <span style={{ fontSize: 13, color: "#374151" }}>{form.primaryDiagnosis.label}</span>
            <button onClick={() => { set("primaryDiagnosis", null); setDiagSearch(""); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16 }}>✕</button>
          </div>
        )}
      </div>

      {/* Secondary */}
      <div style={{ marginBottom: 20 }}>
        <Lbl>Secondary Diagnosis <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span></Lbl>
        <Inp
          value={secDiagSearch}
          onChange={(e) => {
            setSecDiagSearch(e.target.value);
            if (form.secondaryDiagnosis) set("secondaryDiagnosis", null);
          }}
          placeholder="Search condition or code..."
        />
        {secDiagSearch && !form.secondaryDiagnosis && (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, marginTop: 4, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            {filtered(secDiagSearch).map((c) => (
              <div
                key={c.code}
                onClick={() => { set("secondaryDiagnosis", c); setSecDiagSearch(`${c.code} — ${c.label}`); }}
                style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #f3f4f6", display: "flex", gap: 10, background: "white" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = PRIMARY_LIGHT; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "white"; }}
              >
                <span style={{ color: PRIMARY, fontWeight: 600, fontFamily: "monospace", fontSize: 12, minWidth: 130 }}>{c.code}</span>
                <span style={{ color: "#374151" }}>{c.label}</span>
              </div>
            ))}
          </div>
        )}
        {form.secondaryDiagnosis && (
          <div style={{ marginTop: 6, background: PRIMARY_LIGHT, borderRadius: 6, padding: "8px 12px", border: `1px solid ${PRIMARY_BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: PRIMARY, fontWeight: 600 }}>{form.secondaryDiagnosis.code}</span>
            <span style={{ fontSize: 13, color: "#374151" }}>{form.secondaryDiagnosis.label}</span>
            <button onClick={() => { set("secondaryDiagnosis", null); setSecDiagSearch(""); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16 }}>✕</button>
          </div>
        )}
      </div>

      {/* Eye */}
      <div style={{ marginBottom: 20 }}>
        <Lbl>Eye to be Treated *</Lbl>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          {(["right", "left", "bilateral"] as const).map((val) => {
            const labelMap = { right: "👁 Right Eye", left: "👁 Left Eye", bilateral: "👁👁 Bilateral" };
            const selected = form.eyeTreated === val;
            return (
              <div
                key={val}
                onClick={() => set("eyeTreated", val)}
                style={{
                  flex: 1, padding: "12px 8px", borderRadius: 10,
                  border: `2px solid ${selected ? PRIMARY : "#e5e7eb"}`,
                  background: selected ? PRIMARY_LIGHT : "white",
                  cursor: "pointer", textAlign: "center" as const, fontSize: 13,
                  fontWeight: selected ? 600 : 400,
                  color: selected ? PRIMARY : "#374151",
                }}
              >
                {labelMap[val]}
              </div>
            );
          })}
        </div>
        <ErrText msg={errors.eyeTreated} />
      </div>

      {/* Clinical Notes */}
      <div>
        <Lbl>Clinical Notes <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span></Lbl>
        <textarea
          value={form.clinicalNotes}
          onChange={(e) => set("clinicalNotes", e.target.value)}
          placeholder="Describe ocular surface condition, severity, prior treatments attempted..."
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, minHeight: 80, resize: "vertical", outline: "none", boxSizing: "border-box" as const }}
        />
      </div>

      <div style={{ marginTop: 16, background: "#fff8f0", borderRadius: 8, padding: "10px 14px", border: "1px solid #fcd34d", fontSize: 12, color: "#92400e" }}>
        ⚠️ <strong>CPT 65778</strong> — &quot;Placement of amniotic membrane on the ocular surface; without sutures.&quot; This is an <strong>in-office procedure</strong>. Billable per eye, per encounter.
      </div>
    </div>
  );
}

/* ─── STEP 2: PRODUCT ───────────────────────────────────────────────────────── */
function StepProduct({
  form,
  set,
  errors,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
}) {
  const sizes = form.variant ? PRODUCTS[form.variant].sizes : [];

  return (
    <div>
      <SectionHeader icon="🧬" title="Product Selection — VisiDisc®" />

      {/* Variant */}
      <div style={{ marginBottom: 20 }}>
        <Lbl>Select Variant *</Lbl>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
          {(Object.entries(PRODUCTS) as [Variant, (typeof PRODUCTS)[Variant]][]).map(([key, p]) => {
            const selected = form.variant === key;
            return (
              <div
                key={key}
                onClick={() => {
                  set("variant", key);
                  set("discSku", "");
                  set("discSizeMm", null);
                  set("discSizeLabel", "");
                }}
                style={{
                  padding: 16, borderRadius: 10,
                  border: `2px solid ${selected ? PRIMARY : "#e5e7eb"}`,
                  background: selected ? PRIMARY_LIGHT : "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700, color: selected ? PRIMARY : "#111827", marginBottom: 4 }}>{p.label}</div>
                <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{p.desc}</div>
                {selected && <div style={{ marginTop: 8, fontSize: 11, color: PRIMARY, fontWeight: 600 }}>✓ Selected</div>}
              </div>
            );
          })}
        </div>
        <ErrText msg={errors.variant} />
      </div>

      {/* Disc size */}
      {form.variant && (
        <div style={{ marginBottom: 20 }}>
          <Lbl>Disc Size *</Lbl>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            {sizes.map((s) => {
              const selected = form.discSku === s.sku;
              return (
                <div
                  key={s.sku}
                  onClick={() => { set("discSku", s.sku); set("discSizeMm", s.sizeMm); set("discSizeLabel", s.label); }}
                  style={{
                    flex: 1, padding: 12, borderRadius: 10,
                    border: `2px solid ${selected ? PRIMARY : "#e5e7eb"}`,
                    background: selected ? PRIMARY_LIGHT : "white",
                    cursor: "pointer", textAlign: "center" as const,
                  }}
                >
                  <div style={{ fontWeight: 700, color: selected ? PRIMARY : "#111827" }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>SKU: {s.sku}</div>
                </div>
              );
            })}
          </div>
          <ErrText msg={errors.discSku} />
          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
            💡 Select disc size to adequately cover affected area with margin.
          </div>
        </div>
      )}

      {/* Quantity */}
      <div style={grid2Style}>
        <div>
          <Lbl>Quantity *</Lbl>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => set("quantity", Math.max(1, form.quantity - 1))}
              style={qtyBtnStyle}
            >−</button>
            <span style={{ fontSize: 18, fontWeight: 700, minWidth: 30, textAlign: "center" as const }}>{form.quantity}</span>
            <button onClick={() => set("quantity", form.quantity + 1)} style={qtyBtnStyle}>+</button>
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Shipping: $40 (1–8 units) · $45 (9–20) · $65 (21+)</div>
        </div>
        <div>
          <Lbl>Date Needed By <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span></Lbl>
          <Inp type="date" value={form.dateNeededBy} onChange={(e) => set("dateNeededBy", e.target.value)} />
        </div>
      </div>

      {/* Application technique */}
      <div style={{ marginTop: 20 }}>
        <Lbl>Preferred Application Technique <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span></Lbl>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {[
            "Bandage Contact Lens Technique",
            "Application Technique with Speculum",
            "Bandage Contact Lens Technique 2 (Alternative BCL)",
          ].map((t) => (
            <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
              <input
                type="radio"
                name="technique"
                checked={form.applicationTechnique === t}
                onChange={() => set("applicationTechnique", t)}
                style={{ accentColor: PRIMARY }}
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, background: PRIMARY_LIGHT, borderRadius: 8, padding: "10px 14px", border: `1px solid ${PRIMARY_BORDER}`, fontSize: 12, color: PRIMARY }}>
        ✅ VisiDisc is ready to apply — no prep time needed. <strong>Room temp storage, 5-year shelf life.</strong>
      </div>
    </div>
  );
}

/* ─── STEP 3: SHIPPING ──────────────────────────────────────────────────────── */
function StepShipping({
  form,
  set,
  errors,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
}) {
  return (
    <div>
      <SectionHeader icon="📦" title="Shipping & Delivery" />

      <div style={{ background: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`, borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: PRIMARY }}>
        ℹ️ Shipping address pre-filled from your practice profile. Update if shipping to a different location.
      </div>

      <div style={{ marginBottom: 14 }}>
        <Lbl>Ship-to Address *</Lbl>
        <Inp error={!!errors.shipToAddress} value={form.shipToAddress} onChange={(e) => set("shipToAddress", e.target.value)} placeholder="Street address" />
        <ErrText msg={errors.shipToAddress} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
        <div>
          <Lbl>City *</Lbl>
          <Inp error={!!errors.shipToCity} value={form.shipToCity} onChange={(e) => set("shipToCity", e.target.value)} placeholder="City" />
          <ErrText msg={errors.shipToCity} />
        </div>
        <div>
          <Lbl>State *</Lbl>
          <Inp
            error={!!errors.shipToState}
            value={form.shipToState}
            onChange={(e) => set("shipToState", e.target.value.toUpperCase().slice(0, 2))}
            placeholder="GA"
            maxLength={2}
          />
          <ErrText msg={errors.shipToState} />
        </div>
        <div>
          <Lbl>ZIP *</Lbl>
          <Inp error={!!errors.shipToZip} value={form.shipToZip} onChange={(e) => set("shipToZip", e.target.value)} placeholder="30301" />
          <ErrText msg={errors.shipToZip} />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Lbl>Special Delivery Instructions <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span></Lbl>
        <textarea
          value={form.specialInstructions}
          onChange={(e) => set("specialInstructions", e.target.value)}
          placeholder="e.g. Call before delivery, leave at front desk..."
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, minHeight: 70, resize: "vertical", outline: "none", marginTop: 4, boxSizing: "border-box" as const }}
        />
      </div>

      {/* Insurance */}
      <div style={{ marginTop: 24, border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ background: "#f9fafb", padding: "12px 16px", fontWeight: 600, fontSize: 13, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>
          Insurance Information <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span>
        </div>
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <Lbl>Insurance / Payer Name</Lbl>
            <Inp value={form.insuranceName} onChange={(e) => set("insuranceName", e.target.value)} placeholder="e.g. Medicare, Blue Cross..." />
          </div>
          <div>
            <Lbl>Member ID</Lbl>
            <Inp value={form.insuranceId} onChange={(e) => set("insuranceId", e.target.value)} placeholder="Insurance member ID" />
          </div>
          <div>
            <Lbl>Group Number</Lbl>
            <Inp value={form.groupNumber} onChange={(e) => set("groupNumber", e.target.value)} placeholder="Group number" />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: "#6b7280", background: "#fff8f0", borderRadius: 8, padding: "10px 14px", border: "1px solid #fcd34d" }}>
        📋 <strong>Reimbursement estimates (CPT 65778):</strong> Medicare $1,500+ · Private $1,110–$1,700 · Medicaid ~$1,100
      </div>
    </div>
  );
}

/* ─── STEP 4: REVIEW ────────────────────────────────────────────────────────── */
function StepReview({
  form,
  provider,
}: {
  form: FormState;
  provider: { clinicName?: string | null; npiNumber?: string | null } | null;
}) {
  const productLabel = form.variant
    ? `VisiDisc® ${PRODUCTS[form.variant].label} · ${form.discSizeLabel} · SKU: ${form.discSku}`
    : "—";

  return (
    <div>
      <SectionHeader icon="✅" title="Review Order" />
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>Please confirm all details before submitting.</p>

      <RevBlock title="Patient">
        <Row label="Name" value={`${form.firstName} ${form.lastName}`} />
        <Row label="Date of Birth" value={form.dob} />
        {form.mrn && <Row label="MRN" value={form.mrn} />}
      </RevBlock>

      <RevBlock title="Ordering Physician">
        <Row label="Practice" value={provider?.clinicName ?? "—"} />
        {provider?.npiNumber && <Row label="NPI" value={provider.npiNumber} />}
      </RevBlock>

      <RevBlock title="Diagnosis">
        <Row
          label="Primary ICD-10"
          value={form.primaryDiagnosis ? `${form.primaryDiagnosis.code} — ${form.primaryDiagnosis.label}` : "—"}
        />
        {form.secondaryDiagnosis && (
          <Row label="Secondary ICD-10" value={`${form.secondaryDiagnosis.code} — ${form.secondaryDiagnosis.label}`} />
        )}
        <Row label="Eye Treated" value={form.eyeTreated ? form.eyeTreated.charAt(0).toUpperCase() + form.eyeTreated.slice(1) : "—"} />
        {form.clinicalNotes && <Row label="Clinical Notes" value={form.clinicalNotes} />}
        <Row label="CPT Code" value="65778 — Amniotic membrane placement, ocular surface, without sutures" />
      </RevBlock>

      <RevBlock title="Product">
        <Row label="Product" value={productLabel} />
        <Row label="Quantity" value={`${form.quantity} unit${form.quantity > 1 ? "s" : ""}`} />
        {form.dateNeededBy && <Row label="Needed By" value={form.dateNeededBy} />}
        {form.applicationTechnique && <Row label="Application Technique" value={form.applicationTechnique} />}
      </RevBlock>

      <RevBlock title="Shipping">
        <Row label="Ship To" value={`${form.shipToAddress}, ${form.shipToCity}, ${form.shipToState} ${form.shipToZip}`} />
        {form.specialInstructions && <Row label="Instructions" value={form.specialInstructions} />}
        {form.insuranceName && (
          <Row
            label="Insurance"
            value={`${form.insuranceName}${form.insuranceId ? ` · ID: ${form.insuranceId}` : ""}${form.groupNumber ? ` · Group: ${form.groupNumber}` : ""}`}
          />
        )}
      </RevBlock>

      <div style={{ background: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`, borderRadius: 8, padding: "12px 16px", fontSize: 13, color: PRIMARY }}>
        🔔 After confirming, your DR representative will review this order and reach out if any additional information is needed before processing.
      </div>
    </div>
  );
}

/* ─── SUCCESS SCREEN ────────────────────────────────────────────────────────── */
function SuccessScreen({
  form,
  provider,
  onReset,
  onBack,
}: {
  form: FormState;
  provider: { clinicName?: string | null } | null;
  onReset: () => void;
  onBack: () => void;
}) {
  const shippingCost = form.quantity <= 8 ? 40 : form.quantity <= 20 ? 45 : 65;
  return (
    <div style={{ minHeight: "100vh", background: "#f0f7f7", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "white", borderRadius: 16, padding: 40, maxWidth: 580, width: "100%", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: PRIMARY, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Order Submitted</h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 6 }}>
          Your VisiDisc® order for <strong>{form.firstName} {form.lastName}</strong> has been received.
        </p>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
          Your DR representative will review and process your order shortly.
        </p>
        <div style={{ background: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`, borderRadius: 10, padding: 16, marginBottom: 16, textAlign: "left" }}>
          <div style={{ fontWeight: 700, color: PRIMARY, marginBottom: 10, fontSize: 13 }}>Order Summary</div>
          <div style={{ fontSize: 13, color: "#374151", display: "flex", flexDirection: "column", gap: 6 }}>
            <div><strong>Product:</strong> VisiDisc® {form.variant ? PRODUCTS[form.variant].label : ""} · {form.discSizeLabel} · SKU: {form.discSku}</div>
            <div><strong>Qty:</strong> {form.quantity} unit{form.quantity > 1 ? "s" : ""} · Shipping: ${shippingCost}</div>
            <div><strong>Diagnosis:</strong> {form.primaryDiagnosis?.label} ({form.primaryDiagnosis?.code})</div>
            <div><strong>Eye Treated:</strong> {form.eyeTreated ? form.eyeTreated.charAt(0).toUpperCase() + form.eyeTreated.slice(1) : "—"}</div>
            <div><strong>Ship to:</strong> {form.shipToAddress}, {form.shipToCity}, {form.shipToState} {form.shipToZip}</div>
            {provider?.clinicName && <div><strong>Practice:</strong> {provider.clinicName}</div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onBack} style={{ flex: 1, ...backBtnStyle }}>View Orders</button>
          <button onClick={onReset} style={{ flex: 1, ...nextBtnStyle, background: PRIMARY }}>+ New Order</button>
        </div>
      </div>
    </div>
  );
}

/* ─── SHARED COMPONENTS ─────────────────────────────────────────────────────── */
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: PRIMARY, display: "flex", alignItems: "center", gap: 8 }}>
        <span>{icon}</span>{title}
      </h2>
    </div>
  );
}

function RevBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14, background: "#f9fafb", borderRadius: 8, padding: "12px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
      <span style={{ color: "#6b7280", minWidth: 130 }}>{label}</span>
      <span style={{ fontWeight: 500, color: "#111827", textAlign: "right" as const, maxWidth: "60%" }}>{value || "—"}</span>
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4 }}>{children}</div>;
}

function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{msg}</div>;
}

function Inp({
  style,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 8,
        border: `1px solid ${error ? "#dc2626" : "#e5e7eb"}`,
        fontSize: 14,
        outline: "none",
        boxSizing: "border-box" as const,
        ...style,
      }}
    />
  );
}

/* ─── STYLE CONSTANTS ───────────────────────────────────────────────────────── */
const grid2Style: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };

const backBtnStyle: React.CSSProperties = {
  flex: 1, padding: 12, borderRadius: 8, border: "1px solid #e5e7eb",
  background: "white", cursor: "pointer", fontWeight: 600, color: "#374151", fontSize: 14,
};

const nextBtnStyle: React.CSSProperties = {
  flex: 2, padding: 12, borderRadius: 8, border: "none",
  background: PRIMARY, color: "white", cursor: "pointer", fontWeight: 600, fontSize: 15,
};

const qtyBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb",
  background: "white", cursor: "pointer", fontSize: 18, fontWeight: 700, color: "#374151",
  display: "flex", alignItems: "center", justifyContent: "center",
};
