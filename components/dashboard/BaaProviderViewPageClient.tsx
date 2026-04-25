"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import BackButton from "@/components/BackButton";
import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";
import { Button } from "@/components/ui/button";
import AdminBaaAgreementPages from "@/components/admin/baa-providers/agreement/AdminBaaAgreementPages";
import type { BaaProviderDetail } from "@/components/admin/baa-providers/types";
import { apiGet } from "@/lib/apiClient";
import { getSupabaseSignedUrl } from "@/lib/getSupabaseSignedUrl";
import { useAuthStore } from "@/store/auth";

type GetResponse = { success: true; data: BaaProviderDetail };

export default function BaaProviderViewPageClient({ id }: { id: string }) {
  const router = useRouter();
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

  React.useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth");
  }, [router, status]);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    if (role !== "provider") {
      router.replace("/");
    }
  }, [role, router, status]);

  React.useEffect(() => {
    if (!token) return;
    if (status !== "authenticated") return;
    if (role !== "provider") return;

    setLoading(true);
    setError(null);

    void apiGet<GetResponse>(`/api/baa-providers/${id}`, { token })
      .then(async (res) => {
        setRow(res.data);

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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollPercentage =
      (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;

    if (scrollPercentage < 16) setCurrentPage(1);
    else if (scrollPercentage < 33) setCurrentPage(2);
    else if (scrollPercentage < 50) setCurrentPage(3);
    else if (scrollPercentage < 66) setCurrentPage(4);
    else if (scrollPercentage < 83) setCurrentPage(5);
    else setCurrentPage(6);
  };

  const onBack = () => {
    router.push("/dashboard?tab=baa_agreements");
  };

  const noOp = () => {};

  return (
    <div className="w-full px-8 py-4">
      <BackButton onClick={onBack} />

      <div className="w-full h-full flex flex-col">
        <div className="flex-1 bg-white rounded-lg flex flex-col overflow-hidden min-h-175">
          <div className="flex justify-center text-center my-4">
            <IntegrityTissueLogo />
          </div>

          <div className="text-center mb-4">
            <h1 className="text-2xl font-semibold text-gray-800">
              Business Associate Agreement - View
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Completed agreement (read-only)
            </p>
          </div>

          <div className="flex justify-center gap-4 mb-4">
            <Button asChild variant="outline">
              <Link href="/dashboard?tab=baa_agreements">
                Back to BAA Provider Agreements
              </Link>
            </Button>
          </div>

          {error && (
            <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="bg-gray-100 px-6 py-4 border-b flex items-center justify-between">
            <h3 className="text-xl font-semibold text-black">
              Business Associate Agreement
            </h3>
            <span className="text-sm text-gray-600">
              Page {currentPage} of 6
            </span>
          </div>

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
