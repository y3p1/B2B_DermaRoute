"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Download } from "lucide-react";
import { pdf } from "@react-pdf/renderer";

import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";
import BackButton from "@/components/BackButton";

import AdminBaaAgreementPages from "./agreement/AdminBaaAgreementPages";
import AgreementPDF from "@/components/auth/signup/providers/agreement/AgreementPDF";
import { getSupabaseSignedUrl } from "@/lib/getSupabaseSignedUrl";

import type { BaaProviderDetail } from "./types";

type GetResponse = { success: true; data: BaaProviderDetail };

type BaaProviderViewClientProps = {
  id: string;
  basePath?: string;
  dashboardHref?: string;
  listHref?: string;
};

export default function BaaProviderViewClient({
  id,
  basePath = "/admin/baa-providers",
  dashboardHref,
  listHref,
}: BaaProviderViewClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = useAuthStore((s) => s.status);
  const token = useAuthStore((s) => s.jwt);
  const role = useAuthStore((s) => s.role);

  const [row, setRow] = React.useState<BaaProviderDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [coveredEntitySignatureUrl, setCoveredEntitySignatureUrl] =
    React.useState<string | null>(null);
  const [businessAssociateSignatureUrl, setBusinessAssociateSignatureUrl] =
    React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);

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
    if (!token) return;
    if (status !== "authenticated") return;
    if (role !== "admin" && role !== "clinic_staff") return;

    setLoading(true);
    setError(null);
    void apiGet<GetResponse>(`/api/baa-providers/${id}`, { token })
      .then(async (res) => {
        setRow(res.data);

        // Generate signed URLs for signatures if present. Use the storage key
        // fields saved in the DB (`coveredEntitySignature` / `businessAssociateSignature`).
        if (res.data.coveredEntitySignature) {
          const url = await getSupabaseSignedUrl(
            "baa-signatures",
            res.data.coveredEntitySignature,
          );
          setCoveredEntitySignatureUrl(url);
        } else {
          setCoveredEntitySignatureUrl(null);
        }

        if (res.data.businessAssociateSignature) {
          const url = await getSupabaseSignedUrl(
            "baa-signatures",
            res.data.businessAssociateSignature,
          );
          setBusinessAssociateSignatureUrl(url);
        } else {
          setBusinessAssociateSignatureUrl(null);
        }
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Failed to load";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id, role, status, token]);

  const handleDownloadPDF = async () => {
    if (!row) return;
    setDownloading(true);
    try {
      const element = (
        <AgreementPDF
          coveredEntity={row.coveredEntity ?? ""}
          coveredEntityName={row.coveredEntityName ?? ""}
          coveredEntitySignature={coveredEntitySignatureUrl ?? ""}
          coveredEntityTitle={row.coveredEntityTitle ?? ""}
          coveredEntityDate={row.coveredEntityDate ?? ""}
          businessAssociateName={row.businessAssociateName ?? ""}
          businessAssociateSignature={businessAssociateSignatureUrl ?? undefined}
          businessAssociateTitle={row.businessAssociateTitle ?? ""}
          businessAssociateDate={row.businessAssociateDate ?? ""}
        />
      );
      const blob = await pdf(element).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Business_Associate_Agreement_${
        row.coveredEntity?.replace(/\s+/g, "_") || "document"
      }.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
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

  const fromDashboard = searchParams.get("returnTo") === "dashboard";
  const resolvedDashboardHref =
    (dashboardHref ?? role === "admin")
      ? "/admin?tab=baa_agreements"
      : "/clinic-staff?tab=baa_agreements";
  const resolvedListHref = listHref ?? basePath;
  const backHref = fromDashboard ? resolvedDashboardHref : resolvedListHref;
  const editHref = fromDashboard
    ? `${basePath}/${id}/edit?returnTo=dashboard`
    : `${basePath}/${id}/edit`;

  const onBack = () => {
    router.push(backHref);
  };

  const noOp = () => {}; // No-op functions for view mode

  return (
    <div className="w-full px-8 py-4">
      {/* Back Button */}
      <BackButton onClick={onBack} />

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
              Business Associate Agreement - View
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Completed agreement (read-only)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mb-4">
            <Button asChild variant="outline">
              <Link href={backHref}>Back to BAA Provider Agreements</Link>
            </Button>
            {row &&
              !row.businessAssociateSignatureUrl &&
              row.status !== "approved" && (
                <Button asChild>
                  <Link href={editHref}>Sign Agreement</Link>
                </Button>
              )}
            {row && row.status === "approved" && (
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={downloading}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading ? "Generating..." : "Download PDF"}
              </Button>
            )}
          </div>

          {/* Error Messages */}
          {error && (
            <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
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
                businessAssociateName={row.businessAssociateName ?? ""}
                businessAssociateTitle={row.businessAssociateTitle ?? ""}
                businessAssociateDate={row.businessAssociateDate ?? ""}
                onBusinessAssociateNameChange={noOp}
                onBusinessAssociateTitleChange={noOp}
                onBusinessAssociateDateChange={noOp}
                businessAssociateSigPad={React.createRef()}
                canvasContainerRef={React.createRef()}
                canvasWidth={500}
                onClearSignature={noOp}
                onSave={noOp}
                onCancel={noOp}
                saving={false}
                isViewMode={true}
                businessAssociateSignatureUrl={businessAssociateSignatureUrl}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
