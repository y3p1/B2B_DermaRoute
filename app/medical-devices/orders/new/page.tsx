"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { apiPost } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Download,
  Loader2,
  ArrowRight,
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import {
  ReMarxOrderDocument,
  type LymphedemaFormData,
} from "@/components/dashboard/LymphedemaOrderPdf";

import imgBelowKneeStockings from "@/assets/images/BelowKnee-Stockings.jpeg";
import imgThighStockings from "@/assets/images/Thigh-Stockings.jpeg";
import imgPantyhoseStockings from "@/assets/images/Pantyhose-Stockings.jpeg";
import imgFootGarments from "@/assets/images/Foot-Garments.jpeg";
import imgCalfGarments from "@/assets/images/Calf-Garments.jpeg";
import imgKneeGarments from "@/assets/images/Knee-Garments.jpeg";
import imgThighGarments from "@/assets/images/Thigh-Garments.jpeg";
import imgFullLegGarments from "@/assets/images/FullLeg-Garments.jpeg";
import imgFullLegWFootGarments from "@/assets/images/FullLegWFoot-Garments.jpeg";
import imgGauntlet from "@/assets/images/Gauntlet-Gloves&Sleeves.jpeg";
import imgGlove from "@/assets/images/Glove-Gloves&Sleeves.jpeg";
import imgGloveSleeveCombo from "@/assets/images/GloveSleeveCombo-Gloves&Sleeves.jpeg";
import imgArmSleeve from "@/assets/images/ArmSleeve-Gloves&Sleeves.jpeg";
import imgHandVelcro from "@/assets/images/HandVelcro-Wraps.jpeg";
import imgArmWrap from "@/assets/images/ArmWrap-Wraps.jpeg";
import imgGloveGarments from "@/assets/images/Glove-Garments.jpeg";
import imgFingertipstoAxilia from "@/assets/images/FingertipstoAxilia-Garments.jpeg";
import imgWristtoAxilia from "@/assets/images/WristtoAxilia-Garments.jpeg";

import type { StaticImageData } from "next/image";

// ─── Garment catalogue ───────────────────────────────────────────────────────

type GarmentItem = { key: string; label: string; image: StaticImageData };
type GarmentSection = { title: string; items: GarmentItem[] };

const GARMENT_SECTIONS: GarmentSection[] = [
  {
    title: "Lower Extremity — Compression Stockings",
    items: [
      { key: "lowerBelowKnee", label: "Below Knee", image: imgBelowKneeStockings },
      { key: "lowerThigh", label: "Thigh", image: imgThighStockings },
      { key: "lowerPantyhose", label: "Pantyhose", image: imgPantyhoseStockings },
    ],
  },
  {
    title: "Lower Extremity — Garments",
    items: [
      { key: "lowerFoot", label: "Foot", image: imgFootGarments },
      { key: "lowerCalf", label: "Calf", image: imgCalfGarments },
      { key: "lowerKnee", label: "Knee", image: imgKneeGarments },
      { key: "lowerThighGarment", label: "Thigh", image: imgThighGarments },
      { key: "lowerFullLeg", label: "Full Leg", image: imgFullLegGarments },
      { key: "lowerFullLegWFoot", label: "Full Leg W/Foot", image: imgFullLegWFootGarments },
    ],
  },
  {
    title: "Upper Extremity — Gloves & Sleeves",
    items: [
      { key: "upperGauntlet", label: "Gauntlet", image: imgGauntlet },
      { key: "upperGlove", label: "Glove", image: imgGlove },
      { key: "upperGloveSleeve", label: "Glove Sleeve Combo", image: imgGloveSleeveCombo },
      { key: "upperArmSleeve", label: "Arm Sleeve", image: imgArmSleeve },
    ],
  },
  {
    title: "Upper Extremity — Compression Wraps",
    items: [
      { key: "upperHandVelcro", label: "Hand Velcro Wrap", image: imgHandVelcro },
      { key: "upperArmWrap", label: "Arm Wrap", image: imgArmWrap },
    ],
  },
  {
    title: "Upper Extremity — Garments",
    items: [
      { key: "upperGloveGarment", label: "Glove", image: imgGloveGarments },
      { key: "upperFingertipsAxilla", label: "Fingertips to Axilla", image: imgFingertipstoAxilia },
      { key: "upperWristAxilla", label: "Wrist to Axilla", image: imgWristtoAxilia },
    ],
  },
];

const E0651_AREAS = ["Full Leg", "Left Leg", "Right Leg", "Bilateral", "Arm Left", "Arm Right"];
const E0652_AREAS = [
  "Full Leg", "Left Leg", "Right Leg", "Bilateral", "Pant System",
  "Arm Left", "Arm Right", "Arm Plus Left", "Arm Plus Right",
];
const MMHG_OPTIONS = ["65", "60", "55", "50", "45", "40", "35", "30"];
const DIAGNOSES = [
  { code: "I89.0", label: "(I89.0) Lymphedema" },
  { code: "Q82.0", label: "(Q82.0) Hereditary Lymphedema" },
  { code: "I97.2", label: "(I97.2) Postmastectomy Lymphedema Syndrome" },
];
const MANUFACTURERS = [
  { val: "medi_usa", label: "Medi USA" },
  { val: "bsn", label: "BSN (Jobst/Farrow)" },
  { val: "l_r", label: "L&R" },
  { val: "juzo", label: "Juzo" },
  { val: "sigvaris", label: "Sigvaris" },
  { val: "no_preference", label: "No Preference" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "selector" | "remarx";
type OrderType = "pump" | "garment" | "both";

const STEP_LABELS = ["Product", "Order Info", "Pump Order", "Garment Order", "Physician", "Review"];

type FormData = {
  orderType: OrderType | "";
  patientFullName: string;
  orderDate: string;
  faxOrderTo: string;

  contraindications: "yes" | "no" | "";
  diagnosisCode: string;
  pumpType: "E0651" | "E0652" | "";
  pumpGarment: string;
  pumpGarmentE0652: string;
  mmHg: string;
  mmHgOther: string;
  timesPerDay: string;
  minutesPerSession: string;

  selectedGarments: string[];
  compressionLevel: string;
  quantityPerExtremity: string;
  customMadeGarment: "yes" | "no" | "";
  customMadeNotes: string;
  manufacturerPreference: string;
  productName: string;
  productWearTime: string;

  physicianDate: string;
  signatureMode: "draw" | "manual" | "";
  signatureData: string;
};

const EMPTY_FORM: FormData = {
  orderType: "",
  patientFullName: "",
  orderDate: new Date().toISOString().split("T")[0],
  faxOrderTo: "",
  contraindications: "",
  diagnosisCode: "",
  pumpType: "",
  pumpGarment: "",
  pumpGarmentE0652: "",
  mmHg: "",
  mmHgOther: "",
  timesPerDay: "",
  minutesPerSession: "",
  selectedGarments: [],
  compressionLevel: "",
  quantityPerExtremity: "",
  customMadeGarment: "",
  customMadeNotes: "",
  manufacturerPreference: "",
  productName: "",
  productWearTime: "",
  physicianDate: new Date().toISOString().split("T")[0],
  signatureMode: "",
  signatureData: "",
};

// ─── Small shared components ──────────────────────────────────────────────────

function SecLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 pb-2 border-b border-slate-100">
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400",
      )}
    >
      {children}
    </button>
  );
}

function RadioGroup({
  options,
  value,
  onChange,
  vertical,
}: {
  options: { val: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  vertical?: boolean;
}) {
  return (
    <div className={cn("flex gap-4 flex-wrap", vertical && "flex-col gap-2")}>
      {options.map((o) => (
        <label key={o.val} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
          <input
            type="radio"
            checked={value === o.val}
            onChange={() => onChange(o.val)}
            className="accent-slate-900"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

// ─── Product selector screen ──────────────────────────────────────────────────

const PRODUCTS = [
  {
    id: "remarx",
    name: "ReMarx — Compression Pump & Garment",
    icon: "🫀",
    desc: "Compression pump and/or garment order via ReMarx Medical Services (AIROS 6 / AIROS 8)",
    tag: "Available Now",
    tagClass: "bg-green-100 text-green-700",
    disabled: false,
  },
  {
    id: "coming_soon",
    name: "More Devices Coming Soon",
    icon: "⏳",
    desc: "Additional Medical Devices & Equipment order forms will be available here as they are added to the portal.",
    tag: "Coming Soon",
    tagClass: "bg-amber-100 text-amber-700",
    disabled: true,
  },
];

function ProductSelector({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-purple-900">+ New Order</h1>
        <p className="text-sm text-slate-500 mt-1">Select the product you would like to order.</p>
      </div>
      <div className="flex flex-col gap-4">
        {PRODUCTS.map((p) => (
          <div
            key={p.id}
            onClick={() => !p.disabled && onSelect(p.id)}
            className={cn(
              "bg-white rounded-xl border-2 p-5 flex items-center gap-5 transition-all",
              p.disabled
                ? "opacity-60 cursor-not-allowed border-slate-100"
                : "cursor-pointer border-slate-200 hover:border-purple-600 hover:shadow-md",
            )}
          >
            <span className="text-4xl shrink-0">{p.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", p.tagClass)}>
                  {p.tag}
                </span>
              </div>
              <p className="text-xs text-slate-500">{p.desc}</p>
            </div>
            {!p.disabled && <ArrowRight className="w-5 h-5 text-slate-400 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MedicalDevicesNewOrderPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.jwt);
  const provider = useAuthStore((s) => s.provider);

  const [screen, setScreen] = React.useState<Screen>("selector");
  const [step, setStep] = React.useState(0);
  const [formData, setFormData] = React.useState<FormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pdfDownloaded, setPdfDownloaded] = React.useState(false);
  const [pdfGenerating, setPdfGenerating] = React.useState(false);
  const sigCanvasRef = React.useRef<SignatureCanvas>(null);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const toggleGarment = (key: string) =>
    setFormData((prev) => ({
      ...prev,
      selectedGarments: prev.selectedGarments.includes(key)
        ? prev.selectedGarments.filter((g) => g !== key)
        : [...prev.selectedGarments, key],
    }));

  // Step 2 skipped for garment-only, step 3 skipped for pump-only
  const activeSteps = React.useMemo(() => {
    const all = [0, 1, 2, 3, 4, 5];
    if (formData.orderType === "garment") return all.filter((i) => i !== 2);
    if (formData.orderType === "pump") return all.filter((i) => i !== 3);
    return all;
  }, [formData.orderType]);

  const activeIdx = activeSteps.indexOf(step);

  const canProceed = (): boolean => {
    if (step === 0) return formData.orderType !== "";
    if (step === 1) return formData.patientFullName.trim() !== "";
    if (step === 2)
      return (
        formData.contraindications !== "" &&
        formData.diagnosisCode !== "" &&
        formData.pumpType !== "" &&
        formData.mmHg !== "" &&
        formData.timesPerDay !== "" &&
        formData.minutesPerSession !== ""
      );
    if (step === 3)
      return (
        formData.compressionLevel !== "" &&
        formData.quantityPerExtremity !== "" &&
        formData.customMadeGarment !== ""
      );
    if (step === 4)
      return (
        formData.signatureMode !== "" &&
        (formData.signatureMode === "manual" || formData.signatureData !== "")
      );
    return true;
  };

  const goNext = () => {
    if (activeIdx < activeSteps.length - 1) setStep(activeSteps[activeIdx + 1]);
  };
  const goBack = () => {
    if (activeIdx > 0) setStep(activeSteps[activeIdx - 1]);
  };

  // ─── PDF ──────────────────────────────────────────────────────────────────

  function buildPdfData(): LymphedemaFormData {
    const parts = formData.patientFullName.trim().split(/\s+/);
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ");
    const deviceName =
      formData.orderType === "garment"
        ? ""
        : formData.pumpType === "E0651"
          ? "AIROS 6"
          : formData.pumpType === "E0652"
            ? "AIROS 8"
            : "";
    const pumpArea =
      formData.pumpType === "E0651" ? formData.pumpGarment : formData.pumpGarmentE0652;
    const garmentLabels = GARMENT_SECTIONS.flatMap((s) => s.items)
      .filter((item) => formData.selectedGarments.includes(item.key))
      .map((item) => item.label);

    return {
      insurance: "",
      placeOfService: "",
      firstName,
      lastName,
      dob: "",
      mrn: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      phone: "",
      email: "",
      diagnosis: formData.diagnosisCode ? [formData.diagnosisCode] : [],
      conservativeTherapy: "yes",
      skinChanges: [],
      extremity: [],
      measurements: {},
      device: deviceName,
      hcpcs: formData.pumpType,
      deviceRecommended: true,
      garmentType: pumpArea,
      garmentStyle: garmentLabels.join(", "),
      compressionLevel: formData.compressionLevel,
      quantity: formData.quantityPerExtremity,
      customMade: formData.customMadeGarment,
      manufacturerPreference: MANUFACTURERS.find((m) => m.val === formData.manufacturerPreference)?.label ?? "",
      distalPressureMmhg: formData.mmHg === "other" ? formData.mmHgOther : formData.mmHg,
      timesPerDay: formData.timesPerDay,
      minutesPerSession: formData.minutesPerSession,
      signatureMode: formData.signatureMode === "draw" ? "digital" : "manual",
      signatureDataUrl: formData.signatureData,
      physicianName: provider?.clinicName ?? "",
      physicianPhone: provider?.clinicPhone ?? provider?.accountPhone ?? "",
      physicianNpi: provider?.npiNumber ?? "",
      selectedGarmentKeys: [...formData.selectedGarments],
      pumpArea: pumpArea,
      orderType: formData.orderType,
    };
  }

  async function handleDownloadPdf() {
    setPdfGenerating(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(<ReMarxOrderDocument data={buildPdfData()} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ReMarx_Order_${formData.patientFullName.replace(/\s+/g, "_") || "Unknown"}_${formData.orderDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setPdfDownloaded(true);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setPdfGenerating(false);
    }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    try {
      const parts = formData.patientFullName.trim().split(/\s+/);
      const firstName = parts[0] ?? "Unknown";
      const lastName = parts.slice(1).join(" ") || firstName;

      const deviceName =
        formData.orderType === "garment"
          ? "Garment Only"
          : formData.pumpType === "E0651"
            ? "AIROS 6"
            : formData.pumpType === "E0652"
              ? "AIROS 8"
              : undefined;

      const pumpArea =
        formData.pumpType === "E0651" ? formData.pumpGarment : formData.pumpGarmentE0652;

      const garmentLabels = GARMENT_SECTIONS.flatMap((s) => s.items)
        .filter((item) => formData.selectedGarments.includes(item.key))
        .map((item) => item.label);

      const mmhgVal =
        formData.mmHg === "other"
          ? formData.mmHgOther
            ? Number(formData.mmHgOther)
            : undefined
          : formData.mmHg
            ? Number(formData.mmHg)
            : undefined;

      await apiPost<{ success: true; data: { id: string } }, Record<string, unknown>>(
        "/api/lymphedema-orders",
        {
          patient: {
            firstName,
            lastName,
            fullName: formData.patientFullName,
            dob: "",
            salesRepName: provider?.clinicName ?? "",
            salesRepPhone: provider?.clinicPhone ?? provider?.accountPhone ?? "",
            faxOrderTo: formData.faxOrderTo || undefined,
            orderDate: formData.orderDate,
            orderType: formData.orderType,
            contraindications: formData.contraindications,
            physicianName: provider?.clinicName ?? "",
            physicianPhone: provider?.clinicPhone ?? "",
            physicianNPI: provider?.npiNumber ?? "",
            physicianDate: formData.physicianDate,
            signatureMode: formData.signatureMode,
            productName: formData.productName || undefined,
            productWearTime: formData.productWearTime || undefined,
            customMadeNotes: formData.customMadeNotes || undefined,
          },
          insurance: "ReMarx Order",
          diagnosis: formData.diagnosisCode ? [formData.diagnosisCode] : [],
          conservativeTherapyCompleted: false,
          skinChanges: [],
          extremity: [],
          device: deviceName,
          hcpcs: formData.pumpType || undefined,
          garmentType: pumpArea || undefined,
          garmentStyle: garmentLabels.length > 0 ? garmentLabels.join(", ") : undefined,
          compressionLevel: formData.compressionLevel || undefined,
          quantity: formData.quantityPerExtremity ? Number(formData.quantityPerExtremity) : undefined,
          customMade:
            formData.customMadeGarment === "yes"
              ? true
              : formData.customMadeGarment === "no"
                ? false
                : undefined,
          manufacturerPreference: formData.manufacturerPreference || undefined,
          distalPressureMmhg: mmhgVal,
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
  }

  // ─── Product selector ─────────────────────────────────────────────────────

  if (screen === "selector") {
    return (
      <ProductSelector
        onSelect={(id) => {
          if (id === "remarx") setScreen("remarx");
        }}
      />
    );
  }

  // ─── ReMarx form ──────────────────────────────────────────────────────────

  const isLastStep = activeIdx === activeSteps.length - 1;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Progress stepper */}
      <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-4 mb-5">
        <div className="flex items-center">
          {activeSteps.map((si, idx) => (
            <React.Fragment key={si}>
              {idx > 0 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 transition-colors",
                    idx <= activeIdx ? "bg-slate-900" : "bg-slate-200",
                  )}
                />
              )}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                    idx < activeIdx
                      ? "bg-slate-900 text-white"
                      : idx === activeIdx
                        ? "bg-purple-600 text-white"
                        : "bg-slate-100 text-slate-400",
                  )}
                >
                  {idx < activeIdx ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span
                  className={cn(
                    "text-[10px] mt-1 font-medium whitespace-nowrap",
                    idx === activeIdx ? "text-purple-700" : "text-slate-400",
                  )}
                >
                  {STEP_LABELS[si]}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-purple-100 shadow-sm">
        <div className="px-6 py-6 space-y-6">
          {/* ── Step 0: Product Type ── */}
          {step === 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Select Product Type</h2>
              <p className="text-sm text-slate-500 mb-5">What would you like to order today?</p>
              <div className="flex flex-col gap-3">
                {[
                  { val: "pump" as OrderType, label: "Compression Pump", icon: "🔧", desc: "AIROS 6 / AIROS 8 pump order only" },
                  { val: "garment" as OrderType, label: "Garment Only", icon: "🧤", desc: "Compression stockings, wraps & garments" },
                  { val: "both" as OrderType, label: "Pump + Garment", icon: "📋", desc: "Complete order — both pump and garment" },
                ].map((o) => (
                  <div
                    key={o.val}
                    onClick={() => set("orderType", o.val)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      formData.orderType === o.val
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-400",
                    )}
                  >
                    <span className="text-2xl">{o.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 text-sm">{o.label}</div>
                      <div className="text-xs text-slate-500">{o.desc}</div>
                    </div>
                    {formData.orderType === o.val && (
                      <Check className="w-5 h-5 text-slate-900 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 1: Order Info ── */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-5">Order Information</h2>
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 mb-5 text-xs text-blue-800 flex gap-2">
                <span>ℹ️</span>
                <span>
                  <strong>Sales rep info is auto-filled</strong> from your Integrity Tissue Solutions account.
                  Contact your administrator if incorrect.
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-slate-600 mb-1 block">Patient Full Name *</Label>
                  <Input
                    className="h-9 text-sm"
                    value={formData.patientFullName}
                    onChange={(e) => set("patientFullName", e.target.value)}
                    placeholder="Enter patient full name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Order Date</Label>
                    <Input
                      type="date"
                      className="h-9 text-sm"
                      value={formData.orderDate}
                      onChange={(e) => set("orderDate", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Fax Order To</Label>
                    <Input
                      className="h-9 text-sm"
                      value={formData.faxOrderTo}
                      onChange={(e) => set("faxOrderTo", e.target.value)}
                      placeholder="(888) 673-6279"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Default ReMarx fax: (888) 673-6279. Leave blank to fill before faxing.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Sales Rep Name</Label>
                    <div className="h-9 flex items-center gap-2 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-600">
                      🔒 {provider?.clinicName ?? "—"}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Auto-filled from your account</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Sales Rep Phone</Label>
                    <div className="h-9 flex items-center gap-2 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-600">
                      🔒 {provider?.clinicPhone ?? provider?.accountPhone ?? "—"}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Auto-filled from your account</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Pump Order ── */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Compression Pump Order</h2>

              <div>
                <SecLabel>Contraindications</SecLabel>
                <p className="text-xs text-slate-600 mb-3">
                  Does the patient currently present with any contraindications for the use of the device?
                </p>
                <RadioGroup
                  options={[{ val: "yes", label: "YES" }, { val: "no", label: "NO" }]}
                  value={formData.contraindications}
                  onChange={(v) => set("contraindications", v as "yes" | "no")}
                />
              </div>

              <div>
                <SecLabel>Diagnosis Code (ICD-10) *</SecLabel>
                <RadioGroup
                  options={DIAGNOSES.map((d) => ({ val: d.code, label: d.label }))}
                  value={formData.diagnosisCode}
                  onChange={(v) => set("diagnosisCode", v)}
                  vertical
                />
              </div>

              <div>
                <SecLabel>Select Pump Type *</SecLabel>
                <RadioGroup
                  options={[
                    { val: "E0651", label: "HCPCS E0651 — Gradient Sequential Pneumatic Compression Pump" },
                    { val: "E0652", label: "HCPCS E0652 — Gradient Sequential WITH Calibrated Pressure" },
                  ]}
                  value={formData.pumpType}
                  onChange={(v) => set("pumpType", v as "E0651" | "E0652")}
                  vertical
                />
                {formData.pumpType === "E0651" && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-2">Select garment area:</p>
                    <div className="flex flex-wrap gap-2">
                      {E0651_AREAS.map((a) => (
                        <Chip
                          key={a}
                          active={formData.pumpGarment === a}
                          onClick={() => set("pumpGarment", a)}
                        >
                          {a}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
                {formData.pumpType === "E0652" && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-2">Select garment area:</p>
                    <div className="flex flex-wrap gap-2">
                      {E0652_AREAS.map((a) => (
                        <Chip
                          key={a}
                          active={formData.pumpGarmentE0652 === a}
                          onClick={() => set("pumpGarmentE0652", a)}
                        >
                          {a}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <SecLabel>Treatment Protocol</SecLabel>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-slate-600 mb-2 block">mmHg Distal Pressure Setting *</Label>
                    <div className="flex flex-wrap gap-2">
                      {MMHG_OPTIONS.map((v) => (
                        <Chip key={v} active={formData.mmHg === v} onClick={() => set("mmHg", v)}>
                          {v}
                        </Chip>
                      ))}
                      <Chip active={formData.mmHg === "other"} onClick={() => set("mmHg", "other")}>
                        Other
                      </Chip>
                    </div>
                    {formData.mmHg === "other" && (
                      <Input
                        className="h-9 text-sm mt-2 max-w-[180px]"
                        value={formData.mmHgOther}
                        onChange={(e) => set("mmHgOther", e.target.value)}
                        placeholder="Enter mmHg"
                        type="number"
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-2 block">Times Per Day *</Label>
                    <div className="flex gap-2">
                      {["1", "2", "3"].map((v) => (
                        <Chip
                          key={v}
                          active={formData.timesPerDay === v}
                          onClick={() => set("timesPerDay", v)}
                        >
                          {v}×
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-2 block">Minutes Per Session *</Label>
                    <div className="flex gap-2">
                      {["15", "30", "45", "60"].map((v) => (
                        <Chip
                          key={v}
                          active={formData.minutesPerSession === v}
                          onClick={() => set("minutesPerSession", v)}
                        >
                          {v} min
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Garment Order ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Garment Order</h2>
                <p className="text-xs text-slate-500">Select all garments needed. You may choose multiple.</p>
              </div>

              {GARMENT_SECTIONS.map((section) => (
                <div key={section.title}>
                  <SecLabel>{section.title}</SecLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {section.items.map((item) => {
                      const selected = formData.selectedGarments.includes(item.key);
                      return (
                        <div
                          key={item.key}
                          onClick={() => toggleGarment(item.key)}
                          className={cn(
                            "relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all",
                            selected
                              ? "border-slate-900 shadow-md"
                              : "border-slate-200 hover:border-slate-400",
                          )}
                        >
                          <div className="aspect-square w-full bg-white overflow-hidden">
                            <NextImage
                              src={item.image}
                              alt={item.label}
                              width={200}
                              height={200}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div
                            className={cn(
                              "px-2 py-2 text-center text-xs font-semibold transition-colors",
                              selected ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700",
                            )}
                          >
                            {item.label}
                          </div>
                          {selected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div>
                <SecLabel>Garment Requirements</SecLabel>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-slate-600 mb-2 block">Compression Level *</Label>
                    <RadioGroup
                      options={[
                        { val: "CL1", label: "CL1: 20–30 mmHg (mild)" },
                        { val: "CLII", label: "CLII: 30–40 mmHg (moderate)" },
                        { val: "CLIII", label: "CLIII: 40–50 mmHg (firm)" },
                      ]}
                      value={formData.compressionLevel}
                      onChange={(v) => set("compressionLevel", v)}
                      vertical
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600 mb-2 block">Quantity per Extremity *</Label>
                    <div className="flex gap-2">
                      {["1", "2", "3"].map((v) => (
                        <Chip
                          key={v}
                          active={formData.quantityPerExtremity === v}
                          onClick={() => set("quantityPerExtremity", v)}
                        >
                          Qty {v}
                        </Chip>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      *Medicare provides 3 garments per extremity every 6 months
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600 mb-2 block">Custom Made Garment *</Label>
                    <RadioGroup
                      options={[{ val: "no", label: "No" }, { val: "yes", label: "Yes" }]}
                      value={formData.customMadeGarment}
                      onChange={(v) => set("customMadeGarment", v as "yes" | "no")}
                    />
                    {formData.customMadeGarment === "yes" && (
                      <div className="mt-3 space-y-2">
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                          ⚠️ Custom garments require a clinical explanation below.
                        </div>
                        <textarea
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-[80px]"
                          placeholder="Enter clinical explanation for custom garment..."
                          value={formData.customMadeNotes}
                          onChange={(e) => set("customMadeNotes", e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600 mb-2 block">Manufacturer Preference</Label>
                    <div className="flex flex-wrap gap-2">
                      {MANUFACTURERS.map((m) => (
                        <Chip
                          key={m.val}
                          active={formData.manufacturerPreference === m.val}
                          onClick={() => set("manufacturerPreference", m.val)}
                        >
                          {m.label}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-600 mb-1 block">Product Name</Label>
                      <p className="text-[10px] text-slate-400 mb-1">
                        Specific garment name (e.g., &quot;Jobst Opaque&quot;, &quot;Mediven Plus&quot;)
                      </p>
                      <Input
                        className="h-9 text-sm"
                        value={formData.productName}
                        onChange={(e) => set("productName", e.target.value)}
                        placeholder='e.g. Jobst Opaque'
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600 mb-1 block">Wear Time</Label>
                      <p className="text-[10px] text-slate-400 mb-2">When will patient wear this?</p>
                      <div className="flex gap-2 flex-wrap">
                        {[["daytime", "Daytime"], ["nighttime", "Nighttime"], ["both", "Both"]].map(([v, l]) => (
                          <Chip
                            key={v}
                            active={formData.productWearTime === v}
                            onClick={() => set("productWearTime", v)}
                          >
                            {l}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Physician ── */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Physician Information</h2>
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800 flex gap-2">
                <span>ℹ️</span>
                <span>
                  <strong>Physician info is auto-filled</strong> from your account profile.
                  Contact your administrator if corrections are needed.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-xs text-slate-600 mb-1 block">Physician Name</Label>
                  <div className="h-9 flex items-center gap-2 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-600">
                    🔒 {provider?.clinicName ?? "—"}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 mb-1 block">Phone</Label>
                  <div className="h-9 flex items-center gap-2 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-600">
                    🔒 {provider?.clinicPhone ?? provider?.accountPhone ?? "—"}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 mb-1 block">NPI</Label>
                  <div className="h-9 flex items-center gap-2 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-600">
                    🔒 {provider?.npiNumber ?? "—"}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 mb-1 block">Signature Date</Label>
                  <Input
                    type="date"
                    className="h-9 text-sm"
                    value={formData.physicianDate}
                    onChange={(e) => set("physicianDate", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-600 mb-2 block">Physician Signature *</Label>
                <p className="text-xs text-slate-500 mb-3">Choose how the physician will sign this order:</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div
                    onClick={() => { set("signatureMode", "draw"); set("signatureData", ""); }}
                    className={cn(
                      "p-4 rounded-xl border-2 cursor-pointer text-center transition-all",
                      formData.signatureMode === "draw"
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-400",
                    )}
                  >
                    <div className="text-2xl mb-1">✍️</div>
                    <div className="font-semibold text-xs">Sign Digitally</div>
                    <div className="text-[10px] text-slate-500">Draw with mouse or touchscreen</div>
                  </div>
                  <div
                    onClick={() => { set("signatureMode", "manual"); set("signatureData", "MANUAL"); }}
                    className={cn(
                      "p-4 rounded-xl border-2 cursor-pointer text-center transition-all",
                      formData.signatureMode === "manual"
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-400",
                    )}
                  >
                    <div className="text-2xl mb-1">🖨️</div>
                    <div className="font-semibold text-xs">Sign on Printed Copy</div>
                    <div className="text-[10px] text-slate-500">Print and sign before faxing</div>
                  </div>
                </div>

                {formData.signatureMode === "draw" && (
                  <div>
                    <div
                      className="border border-slate-300 rounded-lg bg-white relative overflow-hidden"
                      style={{ touchAction: "none" }}
                    >
                      <SignatureCanvas
                        ref={sigCanvasRef}
                        canvasProps={{ width: 600, height: 150, className: "w-full rounded-lg" }}
                        onEnd={() => {
                          if (sigCanvasRef.current) {
                            set("signatureData", sigCanvasRef.current.toDataURL("image/png"));
                          }
                        }}
                      />
                      {!formData.signatureData && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-slate-300 text-sm">Sign here with your mouse or finger</span>
                        </div>
                      )}
                    </div>
                    {formData.signatureData && (
                      <button
                        type="button"
                        className="mt-2 text-xs text-slate-500 hover:text-slate-700 underline"
                        onClick={() => {
                          sigCanvasRef.current?.clear();
                          set("signatureData", "");
                        }}
                      >
                        Clear & Redo
                      </button>
                    )}
                  </div>
                )}

                {formData.signatureMode === "manual" && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
                    ⚠️ Signature line will be left blank on the PDF. Please print and have the physician sign
                    before faxing to ReMarx at <strong>(888) 673-6279</strong>.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 5: Review ── */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Review & Confirm</h2>
              <p className="text-xs text-slate-500">Please review all information before generating the PDF.</p>

              {/* Order Info */}
              <ReviewSection title="Order Information">
                <ReviewRow label="Patient" value={formData.patientFullName} />
                <ReviewRow label="Order Date" value={formData.orderDate} />
                <ReviewRow label="Sales Rep" value={provider?.clinicName ?? "—"} />
                <ReviewRow label="Rep Phone" value={provider?.clinicPhone ?? provider?.accountPhone ?? "—"} />
                {formData.faxOrderTo && <ReviewRow label="Fax To" value={formData.faxOrderTo} />}
              </ReviewSection>

              {/* Pump */}
              {(formData.orderType === "pump" || formData.orderType === "both") && (
                <ReviewSection title="Pump Order">
                  <ReviewRow label="Contraindications" value={formData.contraindications?.toUpperCase()} />
                  <ReviewRow label="Diagnosis" value={DIAGNOSES.find((d) => d.code === formData.diagnosisCode)?.label} />
                  <ReviewRow label="Pump Type" value={formData.pumpType} />
                  <ReviewRow
                    label="Garment Area"
                    value={
                      formData.pumpType === "E0651"
                        ? formData.pumpGarment
                        : formData.pumpGarmentE0652
                    }
                  />
                  <ReviewRow
                    label="mmHg Setting"
                    value={formData.mmHg === "other" ? formData.mmHgOther : formData.mmHg}
                  />
                  <ReviewRow label="Times/Day" value={formData.timesPerDay} />
                  <ReviewRow label="Min/Session" value={formData.minutesPerSession} />
                </ReviewSection>
              )}

              {/* Garment */}
              {(formData.orderType === "garment" || formData.orderType === "both") && (
                <ReviewSection title="Garment Order">
                  {formData.selectedGarments.length > 0 && (
                    <ReviewRow
                      label="Selected Garments"
                      value={GARMENT_SECTIONS.flatMap((s) => s.items)
                        .filter((i) => formData.selectedGarments.includes(i.key))
                        .map((i) => i.label)
                        .join(", ")}
                    />
                  )}
                  <ReviewRow label="Compression Level" value={formData.compressionLevel} />
                  <ReviewRow label="Qty/Extremity" value={formData.quantityPerExtremity} />
                  <ReviewRow label="Custom Garment" value={formData.customMadeGarment} />
                  {formData.customMadeGarment === "yes" && formData.customMadeNotes && (
                    <ReviewRow label="Clinical Notes" value={formData.customMadeNotes} />
                  )}
                  {formData.manufacturerPreference && (
                    <ReviewRow
                      label="Manufacturer"
                      value={MANUFACTURERS.find((m) => m.val === formData.manufacturerPreference)?.label}
                    />
                  )}
                  {formData.productName && <ReviewRow label="Product Name" value={formData.productName} />}
                  {formData.productWearTime && <ReviewRow label="Wear Time" value={formData.productWearTime} />}
                </ReviewSection>
              )}

              {/* Physician */}
              <ReviewSection title="Physician">
                <ReviewRow label="Name" value={provider?.clinicName ?? "—"} />
                <ReviewRow label="Phone" value={provider?.clinicPhone ?? provider?.accountPhone ?? "—"} />
                <ReviewRow label="NPI" value={provider?.npiNumber ?? "—"} />
                <ReviewRow
                  label="Signature"
                  value={
                    formData.signatureMode === "draw"
                      ? "Digital signature captured ✓"
                      : "Will sign on printed copy"
                  }
                />
                <ReviewRow label="Date" value={formData.physicianDate} />
              </ReviewSection>

              {formData.signatureMode === "draw" && formData.signatureData && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Captured Signature:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.signatureData}
                    alt="Physician signature"
                    className="border border-slate-200 rounded-lg h-16 object-contain bg-white"
                  />
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          <Button
            variant="outline"
            size="sm"
            onClick={
              step === 0
                ? () => { setScreen("selector"); setFormData(EMPTY_FORM); }
                : goBack
            }
            disabled={isSubmitting}
            className="gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? "Back" : "Back"}
          </Button>

          {!isLastStep ? (
            <Button
              size="sm"
              onClick={goNext}
              disabled={!canProceed()}
              className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleDownloadPdf()}
                disabled={pdfGenerating}
                className="gap-1.5"
              >
                {pdfGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download PDF
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || !pdfDownloaded}
                title={!pdfDownloaded ? "Download the filled PDF first" : undefined}
                className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                ) : (
                  <><Check className="w-4 h-4" /> Submit Order</>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Review helpers ────────────────────────────────────────────────────────────

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{title}</p>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 text-right max-w-[55%]">{value}</span>
    </div>
  );
}
