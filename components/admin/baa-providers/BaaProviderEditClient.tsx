"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import SignatureCanvas from "react-signature-canvas";

import { apiGet, apiPatch } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";
import BackButton from "@/components/BackButton";
import AdminBaaAgreementPages from "./agreement/AdminBaaAgreementPages";
import { getSupabaseSignedUrl } from "@/lib/getSupabaseSignedUrl";

import type { BaaProviderDetail } from "./types";

type GetResponse = { success: true; data: BaaProviderDetail };

type PatchBody = {
  businessAssociateName: string;
  businessAssociateTitle: string;
  businessAssociateDate: string;
  businessAssociateSignature: string;
};

type BaaProviderEditClientProps = {
  id: string;
  basePath?: string;
};

export default function BaaProviderEditClient({
  id,
  basePath = "/admin/baa-providers",
}: BaaProviderEditClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = useAuthStore((s) => s.status);
  const token = useAuthStore((s) => s.jwt);
  const role = useAuthStore((s) => s.role);

  const [row, setRow] = React.useState<BaaProviderDetail | null>(null);
  const [coveredEntitySignatureUrl, setCoveredEntitySignatureUrl] =
    React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);

  const [canvasWidth, setCanvasWidth] = React.useState(500);
  const canvasContainerRef = React.useRef<HTMLDivElement>(null);
  const sigPadRef = React.useRef<SignatureCanvas>(null);

  const [form, setForm] = React.useState<PatchBody>({
    businessAssociateName: "",
    businessAssociateTitle: "",
    businessAssociateDate: new Date().toLocaleDateString("en-US", {
      timeZone: "America/New_York",
    }),
    businessAssociateSignature: "",
  });

  React.useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth");
  }, [router, status]);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    if (role !== "admin" && role !== "clinic_staff") {
      router.replace("/");
    }
  }, [role, router, status]);

  React.useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasContainerRef.current) {
        const w = canvasContainerRef.current.offsetWidth - 8;
        setCanvasWidth(w > 0 ? w : 500);
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  React.useEffect(() => {
    if (!token) return;
    if (status !== "authenticated") return;
    if (role !== "admin" && role !== "clinic_staff") return;

    setLoading(true);
    setError(null);
    void apiGet<GetResponse>(`/api/baa-providers/${id}`, { token })
      .then(async (res) => {
        setRow(res.data);

        // Always use current date for new signatures
        const currentDate = new Date().toLocaleDateString("en-US", {
          timeZone: "America/New_York",
        });

        setForm({
          businessAssociateName: res.data.businessAssociateName ?? "",
          businessAssociateTitle: res.data.businessAssociateTitle ?? "",
          businessAssociateDate: res.data.businessAssociateDate || currentDate,
          businessAssociateSignature: "",
        });

        // Covered Entity Signature: get signed URL if present. Use storage key field.
        if (res.data.coveredEntitySignature) {
          const url = await getSupabaseSignedUrl(
            "baa-signatures",
            res.data.coveredEntitySignature,
          );
          setCoveredEntitySignatureUrl(url);
        } else {
          setCoveredEntitySignatureUrl(null);
        }

        // If there is an existing business associate signature URL, draw it onto the pad so user can keep it.
        // We keep form.businessAssociateSignature empty until the user draws (or re-draws).
        if (res.data.businessAssociateSignature) {
          // best-effort; ignore failures
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = sigPadRef.current?.getCanvas();
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Fit image into canvas
            const scale = Math.min(
              canvas.width / img.width,
              canvas.height / img.height,
            );
            const x = (canvas.width - img.width * scale) / 2;
            const y = (canvas.height - img.height * scale) / 2;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          };
          // Use storage key to request a signed URL from server, then set as img.src
          const signed = await getSupabaseSignedUrl(
            "baa-signatures",
            res.data.businessAssociateSignature,
          );
          img.src = signed ?? "";
        }
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Failed to load";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id, role, status, token]);

  const onClearSignature = () => {
    sigPadRef.current?.clear();
    setForm((prev) => ({ ...prev, businessAssociateSignature: "" }));
  };

  const fromDashboard = searchParams.get("returnTo") === "dashboard";
  const viewHref = fromDashboard
    ? `${basePath}/${id}?returnTo=dashboard`
    : `${basePath}/${id}`;

  const onCancel = () => {
    router.push(viewHref);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollPercentage =
      (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;

    // Update page based on scroll position (6 pages total)
    if (scrollPercentage < 16) setCurrentPage(1);
    else if (scrollPercentage < 33) setCurrentPage(2);
    else if (scrollPercentage < 50) setCurrentPage(3);
    else if (scrollPercentage < 66) setCurrentPage(4);
    else if (scrollPercentage < 83) setCurrentPage(5);
    else setCurrentPage(6);
  };

  const onSave = async () => {
    if (!token) return;

    setSaving(true);
    setSaveError(null);

    try {
      const payload: PatchBody = {
        businessAssociateName: form.businessAssociateName.trim(),
        businessAssociateTitle: form.businessAssociateTitle.trim(),
        businessAssociateDate: form.businessAssociateDate.trim(),
        businessAssociateSignature:
          form.businessAssociateSignature.trim() ||
          sigPadRef.current?.getTrimmedCanvas().toDataURL("image/png") ||
          "",
      };

      await apiPatch<{ success: true; data: unknown }, PatchBody>(
        `/api/baa-providers/${id}`,
        payload,
        { token },
      );

      router.replace(viewHref);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full px-8 py-4">
      {/* Back Button */}
      <BackButton onClick={onCancel} />

      <div className="w-full h-full flex flex-col">
        {/* Agreement Document Card */}
        <div className="flex-1 bg-white rounded-lg flex flex-col overflow-hidden min-h-175">
          {/* Logo Section */}
          <div className="flex justify-center text-center my-4">
            <IntegrityTissueLogo />
          </div>

          {/* Title */}
          <div className="text-center mb-4">
            <h1 className="text-2xl font-semibold text-gray-800">
              Business Associate Agreement - Review & Approval
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Review the provider&apos;s information and sign as Business
              Associate
            </p>
          </div>

          {/* Error Messages */}
          {error && (
            <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
          {saveError && (
            <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {saveError}
            </div>
          )}

          {/* Document Header */}
          <div className="bg-gray-100 px-6 py-4 border-b flex items-center justify-between">
            <h3 className="text-xl font-semibold text-black">
              Business Associate Agreement
            </h3>
            <span className="text-sm text-gray-600">
              Page {currentPage} of 6
            </span>
          </div>

          {/* Scrollable Content */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-sm text-gray-500">Loading agreement...</div>
            </div>
          ) : row ? (
            <div
              className="flex-1 overflow-y-auto px-2 py-10"
              style={{ minHeight: 500, maxHeight: "calc(80vh - 120px)" }}
              onScroll={handleScroll}
            >
              <AdminBaaAgreementPages
                coveredEntity={row.coveredEntity ?? ""}
                coveredEntityName={row.coveredEntityName ?? ""}
                coveredEntitySignatureUrl={coveredEntitySignatureUrl}
                coveredEntityTitle={row.coveredEntityTitle ?? ""}
                coveredEntityDate={row.coveredEntityDate ?? ""}
                businessAssociateName={form.businessAssociateName}
                businessAssociateTitle={form.businessAssociateTitle}
                businessAssociateDate={form.businessAssociateDate}
                onBusinessAssociateNameChange={(value) =>
                  setForm((p) => ({ ...p, businessAssociateName: value }))
                }
                onBusinessAssociateTitleChange={(value) =>
                  setForm((p) => ({ ...p, businessAssociateTitle: value }))
                }
                onBusinessAssociateDateChange={(value) =>
                  setForm((p) => ({ ...p, businessAssociateDate: value }))
                }
                businessAssociateSigPad={sigPadRef}
                canvasContainerRef={canvasContainerRef}
                canvasWidth={canvasWidth}
                onClearSignature={onClearSignature}
                onSave={onSave}
                onCancel={onCancel}
                saving={saving}
                isViewMode={false}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
