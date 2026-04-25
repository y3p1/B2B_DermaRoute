"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { getSupabaseSignedUrl } from "@/lib/getSupabaseSignedUrl";
import AdminBaaAgreementPages from "@/components/admin/baa-providers/agreement/AdminBaaAgreementPages";
import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";

import type { BaaProviderDetail } from "@/components/admin/baa-providers/types";

type GetResponse = { success: true; data: BaaProviderDetail };

export default function BaaProviderViewModal({
  open,
  onOpenChange,
  baaId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baaId: string | null;
}) {
  const token = useAuthStore((s) => s.jwt);
  const [row, setRow] = React.useState<BaaProviderDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [coveredEntitySignatureUrl, setCoveredEntitySignatureUrl] =
    React.useState<string | null>(null);
  const [businessAssociateSignatureUrl, setBusinessAssociateSignatureUrl] =
    React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    if (!open || !baaId || !token) return;

    setLoading(true);
    setError(null);
    setRow(null);
    setCoveredEntitySignatureUrl(null);
    setBusinessAssociateSignatureUrl(null);

    void apiGet<GetResponse>(`/api/baa-providers/${baaId}`, { token })
      .then(async (res) => {
        setRow(res.data);

        if (res.data.coveredEntitySignature) {
          const url = await getSupabaseSignedUrl(
            "baa-signatures",
            res.data.coveredEntitySignature,
          );
          setCoveredEntitySignatureUrl(url);
        }

        if (res.data.businessAssociateSignature) {
          const url = await getSupabaseSignedUrl(
            "baa-signatures",
            res.data.businessAssociateSignature,
          );
          setBusinessAssociateSignatureUrl(url);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load agreement");
      })
      .finally(() => setLoading(false));
  }, [open, baaId, token]);

  const handleClose = () => {
    setRow(null);
    setError(null);
    setCurrentPage(1);
    onOpenChange(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const pct =
      (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
    if (pct < 16) setCurrentPage(1);
    else if (pct < 33) setCurrentPage(2);
    else if (pct < 50) setCurrentPage(3);
    else if (pct < 66) setCurrentPage(4);
    else if (pct < 83) setCurrentPage(5);
    else setCurrentPage(6);
  };

  const noOp = () => {};

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-[90vw] max-w-4xl p-0 max-h-[95vh] overflow-hidden flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 shrink-0">
          <DialogTitle className="text-2xl font-bold text-[#18192B]">
            BAA Provider Agreement
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6 pb-6">
          {error && (
            <div className="bg-red-50 rounded-lg p-3 text-sm text-red-600 mb-4 border border-red-100">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-sm text-slate-500">Loading agreement...</div>
            </div>
          ) : row ? (
            <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-lg border border-slate-200">
              {/* Logo */}
              <div className="flex justify-center py-4 shrink-0">
                <IntegrityTissueLogo />
              </div>

              {/* Document header */}
              <div className="bg-gray-100 px-6 py-4 border-b flex items-center justify-between shrink-0">
                <h3 className="text-xl font-semibold text-black">
                  Business Associate Agreement
                </h3>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of 6
                </span>
              </div>

              {/* Scrollable agreement pages */}
              <div
                className="flex-1 overflow-y-auto px-2 py-10"
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

              {/* Close button */}
              <div className="px-6 py-4 border-t shrink-0 flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
