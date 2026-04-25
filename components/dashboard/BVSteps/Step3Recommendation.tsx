"use client";

import * as React from "react";
import { z } from "zod";
import { Download, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, apiPatch } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { ProductCard } from "./ProductCard";
import { ClinicalInfoForm } from "./Step1ClinicalInfo";
import { PatientDeliveryForm } from "./Step2PatientDelivery";

// ── Zod schema that gates submission ─────────────────────────────────────────
const downloadConfirmSchema = z.object({
  hasDownloadedForms: z.literal(true, {
    message:
      "You must download at least one form before submitting a BV request.",
  }),
});

interface Product {
  id: string;
  name: string;
  commercial: boolean;
}

interface BvForm {
  id: string;
  name: string;
  fileName: string;
  manufacturer: string;
  commercial: boolean | null;
}

interface Step3RecommendationProps {
  onBack: () => void;
  onClose: () => void;
  formData: Partial<ClinicalInfoForm & PatientDeliveryForm>;
  onCreated?: () => void;
  id?: string;
  mode?: "create" | "edit";
}

export function Step3Recommendation({
  onBack,
  onClose,
  formData,
  onCreated,
  id,
  mode = "create",
}: Step3RecommendationProps) {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [forms, setForms] = React.useState<BvForm[]>([]);
  const [formsLoading, setFormsLoading] = React.useState(false);
  const [formsError, setFormsError] = React.useState<string | null>(null);

  const [downloadedFormIds, setDownloadedFormIds] = React.useState<Set<string>>(new Set());
  const [downloadingFormIds, setDownloadingFormIds] = React.useState<Set<string>>(new Set());
  const [isDownloadingAll, setIsDownloadingAll] = React.useState(false);
  const [downloadValidationError, setDownloadValidationError] = React.useState<
    string | null
  >(null);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const token = useAuthStore((s) => s.jwt);

  const hasDownloadedForms = downloadedFormIds.size > 0;

  // ── Fetch products ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    const commercialParam =
      formData.insuranceCommercial !== undefined
        ? `?commercial=${formData.insuranceCommercial ? "true" : "false"}`
        : "";

    apiGet<{ success: boolean; data: Product[] }>(
      `/api/products${commercialParam}`,
    )
      .then((res) => {
        // Deduplicate by product name (multiple rows exist per size variant)
        const uniqueByName = new Map<string, Product>();
        for (const p of res.data) {
          if (!uniqueByName.has(p.name)) {
            uniqueByName.set(p.name, p);
          }
        }
        const unique = Array.from(uniqueByName.values());
        const shuffled = unique.sort(() => 0.5 - Math.random());
        setProducts(shuffled.slice(0, 5));
      })
      .catch((e) => setError(e.message));
  }, [formData.insuranceCommercial]);

  // ── Fetch BV forms filtered by commercial type ──────────────────────────────
  React.useEffect(() => {
    setFormsLoading(true);
    setFormsError(null);

    const params =
      formData.insuranceCommercial !== undefined
        ? `?commercial=${formData.insuranceCommercial ? "true" : "false"}`
        : "";

    apiGet<{ success: boolean; data: BvForm[] }>(`/api/bv-forms${params}`, {
      token: token ?? undefined,
    })
      .then((res) => setForms(res.data))
      .catch((e) => setFormsError(e.message))
      .finally(() => setFormsLoading(false));
  }, [formData.insuranceCommercial, token]);

  // ── Download a single form ──────────────────────────────────────────────────
  async function handleDownloadSingle(form: BvForm) {
    if (!token) return;
    setDownloadingFormIds((prev) => new Set(prev).add(form.id));
    setFormsError(null);

    try {
      const response = await fetch(`/api/bv-forms/${form.id}/download-file`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setFormsError(`Could not download "${form.name}". Please try again.`);
      } else {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = form.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
        setDownloadedFormIds((prev) => new Set(prev).add(form.id));
        setDownloadValidationError(null);
      }
    } catch {
      setFormsError(`Could not download "${form.name}". Please try again.`);
    } finally {
      setDownloadingFormIds((prev) => {
        const next = new Set(prev);
        next.delete(form.id);
        return next;
      });
    }
  }

  // ── Download all forms at once ──────────────────────────────────────────────
  async function handleDownloadAll() {
    if (!token || forms.length === 0) return;
    setIsDownloadingAll(true);
    setFormsError(null);

    const failed: string[] = [];

    for (const form of forms) {
      try {
        const response = await fetch(`/api/bv-forms/${form.id}/download-file`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          failed.push(form.name);
        } else {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = form.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
          setDownloadedFormIds((prev) => new Set(prev).add(form.id));
        }
      } catch {
        failed.push(form.name);
      }
      // Small delay between downloads so browsers don't block them
      await new Promise((r) => setTimeout(r, 400));
    }

    setDownloadValidationError(null);

    if (failed.length > 0) {
      setFormsError(
        `Downloaded ${forms.length - failed.length} of ${forms.length} form(s). ` +
          `The following could not be downloaded: ${failed.join(", ")}.`,
      );
    }

    setIsDownloadingAll(false);
  }

  // ── Submit BV request ───────────────────────────────────────────────────────
  async function handleCreateBv() {
    // Zod-validate that the provider has downloaded at least one form
    const validationResult = downloadConfirmSchema.safeParse({
      hasDownloadedForms,
    });
    if (!validationResult.success) {
      const msg =
        validationResult.error.issues[0]?.message ?? "Download required.";
      setDownloadValidationError(msg);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (!token) {
        setError("Please sign in again.");
        return;
      }

      const payload = {
        provider: String(formData.provider ?? ""),
        placeOfService: String(formData.placeOfService ?? ""),
        insurance: String(formData.insurance ?? ""),
        woundType: String(formData.woundType ?? ""),
        woundSize: String(formData.woundSize ?? ""),
        woundLocation: formData.woundLocation
          ? String(formData.woundLocation)
          : undefined,
        icd10: formData.icd10 ? String(formData.icd10) : undefined,
        conservativeTherapy: formData.conservativeTherapy === "yes",
        diabetic: formData.diabetic === "yes",
        a1cPercent:
          formData.diabetic === "yes" && formData.a1cPercent !== undefined
            ? Number(formData.a1cPercent)
            : undefined,
        a1cMeasuredAt:
          formData.diabetic === "yes" && formData.a1cMeasuredAt
            ? String(formData.a1cMeasuredAt)
            : undefined,
        tunneling: formData.tunneling === "yes",
        infected: formData.infected === "yes",
        initials: String(formData.initials ?? ""),
        applicationDate: String(formData.applicationDate ?? ""),
        deliveryDate: String(formData.deliveryDate ?? ""),
        instructions: formData.instructions
          ? String(formData.instructions)
          : undefined,
      };

      if (mode === "edit" && id) {
        await apiPatch<{ success: true }, typeof payload>(
          `/api/bv-requests/${id}`,
          payload,
          { token },
        );
        onCreated?.();
        onClose();
      } else {
        await apiPost<{ success: true }, typeof payload>(
          "/api/bv-requests",
          payload,
          { token },
        );
        onCreated?.();
        onClose();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create BV request";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isCommercial = formData.insuranceCommercial === true;
  const formTypeLabel = isCommercial
    ? "Commercial"
    : "Non-Commercial (Medicare/Medicaid)";
  const allDownloaded = forms.length > 0 && downloadedFormIds.size >= forms.length;

  return (
    <div className="p-8">
      <div className="flex justify-between mb-4">
        <span className="text-sm text-muted-foreground">Step 3 of 3</span>
      </div>
      <div className="mb-4 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600" style={{ width: "100%" }} />
      </div>
      <h2 className="text-2xl font-bold mb-2">Recommended Product</h2>

      {formData.insuranceCommercial !== undefined && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Showing products for:</span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${
              formData.insuranceCommercial
                ? "bg-blue-100 text-blue-800"
                : "bg-orange-100 text-orange-800"
            }`}
          >
            {formData.insuranceCommercial
              ? "Commercial Insurance"
              : "Non-Commercial (Medicare/Medicaid)"}
          </span>
          {formData.insurance && (
            <span className="text-muted-foreground">
              · {formData.insurance}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {products.map((product) => (
          <ProductCard key={product.id} name={product.name} />
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="font-bold text-blue-900 mb-2">Order Summary</div>
        <div className="text-sm">Patient: {formData.initials}</div>
        <div className="text-sm">
          Wound: {formData.woundType ?? "Diabetic Foot Ulcer"} •{" "}
          {formData.woundSize || "12.5 cm²"}
        </div>
        <div className="text-sm">
          Location: {formData.woundLocation || "Right foot"}
        </div>
        <div className="text-sm">
          Application Date: {formData.applicationDate || "2026-01-01"}
        </div>
      </div>

      {/* ── Download Forms section ─── */}
      <div
        className={`border rounded-lg p-4 mb-4 ${
          allDownloaded
            ? "bg-green-50 border-green-300"
            : hasDownloadedForms
              ? "bg-blue-50 border-blue-300"
              : "bg-amber-50 border-amber-300"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {allDownloaded ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className={`w-5 h-5 ${hasDownloadedForms ? "text-blue-600" : "text-amber-600"}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-semibold mb-1 ${
                allDownloaded
                  ? "text-green-800"
                  : hasDownloadedForms
                    ? "text-blue-800"
                    : "text-amber-800"
              }`}
            >
              {allDownloaded
                ? "All forms downloaded — you may now submit"
                : hasDownloadedForms
                  ? `${downloadedFormIds.size} of ${forms.length} form(s) downloaded — you may submit or download more`
                  : `Required: Download ${formTypeLabel} BV Form(s)`}
            </p>
            <p
              className={`text-xs mb-3 ${
                allDownloaded
                  ? "text-green-700"
                  : hasDownloadedForms
                    ? "text-blue-700"
                    : "text-amber-700"
              }`}
            >
              Here are the product recommendation forms. Click a form to download it, or use the button below to download all at once. You must download at least one form before submitting.
            </p>

            {/* Per-form download list */}
            {formsLoading ? (
              <p className="text-xs text-gray-500 italic">Loading forms…</p>
            ) : formsError ? (
              <p
                className={`text-xs mb-3 ${hasDownloadedForms ? "text-amber-700" : "text-red-600"}`}
              >
                {formsError}
              </p>
            ) : forms.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                No forms available for this insurance type.
              </p>
            ) : (
              <ul className="mb-3 space-y-2">
                {forms.map((f) => {
                  const isDownloaded = downloadedFormIds.has(f.id);
                  const isDownloadingThis = downloadingFormIds.has(f.id);
                  return (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(f)}
                        disabled={isDownloadingThis || isDownloadingAll}
                        className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm transition-colors border ${
                          isDownloaded
                            ? "bg-green-100 border-green-300 text-green-800 hover:bg-green-200"
                            : "bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300"
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {isDownloaded ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        )}
                        <span className="flex-1 truncate font-medium">{f.name}</span>
                        {isDownloadingThis ? (
                          <span className="text-xs text-blue-600 shrink-0">Downloading…</span>
                        ) : isDownloaded ? (
                          <span className="text-xs text-green-600 shrink-0">Downloaded</span>
                        ) : (
                          <Download className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Download All button */}
            {forms.length > 1 && (
              <Button
                type="button"
                size="sm"
                variant={allDownloaded ? "outline" : "default"}
                className={
                  allDownloaded
                    ? "border-green-400 text-green-700 hover:bg-green-100"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                }
                disabled={isDownloadingAll || formsLoading || forms.length === 0}
                onClick={handleDownloadAll}
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloadingAll
                  ? "Downloading…"
                  : allDownloaded
                    ? "Re-download All Forms"
                    : `Download All ${forms.length} Forms`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Zod download validation error */}
      {downloadValidationError && !hasDownloadedForms && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg p-3 mb-4 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {downloadValidationError}
        </div>
      )}

      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 text-green-800 text-sm">
        {mode === "edit"
          ? "Clicking below will update this Benefits Verification request."
          : "Clicking below will submit a Benefits Verification request for insurance verification and email notifications will be sent to clinic staff and administrators."}
      </div>

      <div className="flex gap-4 mt-6">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          className={`flex-1 text-white transition-colors ${
            hasDownloadedForms
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
          }`}
          disabled={isSubmitting || !hasDownloadedForms}
          onClick={handleCreateBv}
          title={
            !hasDownloadedForms
              ? "Download at least one form first"
              : undefined
          }
        >
          {isSubmitting
            ? mode === "edit"
              ? "Updating..."
              : "Submitting..."
            : mode === "edit"
              ? "Update BV Request"
              : "Submit BV Request"}
        </Button>
      </div>

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
    </div>
  );
}
