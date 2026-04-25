"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle2, FileText, ExternalLink, AlertCircle } from "lucide-react";

type BvRow = {
  id: string;
  createdAt: string | null;
  status: string;
  provider: string | null;
  practice?: string | null;
  placeOfService?: string | null;
  insurance?: string | null;
  woundType?: string | null;
  woundSize?: string | null;
  woundLocation?: string | null;
  icd10?: string | null;
  conservativeTherapy?: boolean;
  diabetic?: boolean;
  tunneling?: boolean;
  infected?: boolean;
  initials?: string | null;
  applicationDate?: string | null;
  deliveryDate?: string | null;
  instructions?: string | null;
  proofStatus?: string | null;
  approvalProofUrl?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id?: string;
  onVerified?: () => void;
  onSwitchToProductOrdersTab?: () => void;
  viewOnly?: boolean;
};

export default function BvVerificationModal({
  open,
  onOpenChange,
  id,
  onVerified,
  onSwitchToProductOrdersTab,
  viewOnly = false,
}: Props) {
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [bv, setBv] = React.useState<BvRow | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [verifying, setVerifying] = React.useState(false);
  const [verifyingProof, setVerifyingProof] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [signedProofUrl, setSignedProofUrl] = React.useState<string | null>(null);
  const token = useAuthStore((s) => s.jwt);

  React.useEffect(() => {
    if (open && id && token) {
      setLoading(true);
      setError(null);
      setIsEditing(false);
      apiGet<{ success: true; data: BvRow }>(`/api/bv-requests/${id}`, {
        token,
      })
        .then((res) => setBv(res.data))
        .catch((e) =>
          setError(
            e instanceof Error ? e.message : "Failed to load BV request",
          ),
        )
        .finally(() => setLoading(false));
    } else {
      setBv(null);
    }
  }, [open, id, token]);

  React.useEffect(() => {
    async function fetchSignedUrl() {
      if (!bv?.approvalProofUrl) {
        setSignedProofUrl(null);
        return;
      }
      
      try {
        const { data, error: signedError } = await supabase.storage
          .from("manufacturer-proofs")
          .createSignedUrl(bv.approvalProofUrl, 60 * 60);
          
        if (data?.signedUrl) {
          setSignedProofUrl(data.signedUrl);
        } else if (signedError) {
          console.error("Failed to generate signed url:", signedError);
        }
      } catch (err) {
        console.error("Error fetching signed url:", err);
      }
    }
    
    if (open) {
      fetchSignedUrl();
    }
  }, [open, bv?.approvalProofUrl]);

  const handleVerify = async (status: "approved" | "rejected") => {
    if (!id || !token) return;

    setVerifying(true);
    setError(null);

    try {
      await apiPatch(
        `/api/bv-requests/${id}/verify`,
        {
          status,
        },
        { token },
      );

      if (onVerified) onVerified();
      
      if (status === "approved" && onSwitchToProductOrdersTab) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onOpenChange(false);
          onSwitchToProductOrdersTab();
        }, 3000);
      } else {
        onOpenChange(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to verify request");
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyProof = async (status: "verified" | "rejected") => {
    if (!id || !token) return;

    setVerifyingProof(true);
    setError(null);

    try {
      await apiPatch(
        `/api/bv-requests/${id}/proof/verify`,
        { status },
        { token }
      );

      // Refresh local state without closing modal
      const res = await apiGet<{ success: true; data: BvRow }>(`/api/bv-requests/${id}`, {
        token,
      });
      setBv(res.data);
      
      if (onVerified) onVerified();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to verify proof");
    } finally {
      setVerifyingProof(false);
    }
  };

  const renderValue = (value: unknown) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-[80vw] max-w-[80vw] sm:max-w-none p-0 max-h-[98vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="w-full text-center py-4">
              <DialogTitle className="text-2xl font-extrabold text-slate-900">
                BV Request Verification
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Review and approve or deny this benefits verification request
              </DialogDescription>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="p-8">
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-gray-200 rounded w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(12)].map((_, i) => (
                    <div key={i}>
                      <div className="h-4 bg-gray-100 rounded mb-2 w-full" />
                      <div className="h-10 bg-gray-100 rounded w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : !bv ? (
            <div className="p-8 text-center text-gray-500">
              No BV request found
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b pb-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Status</div>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      bv.status === "pending"
                        ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                        : bv.status === "approved"
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : bv.status === "rejected"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {bv.status}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Request ID</div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-100 text-sm font-mono text-gray-900">
                    {id}
                  </div>
                </div>
              </div>

              {/* Provider & Practice Info */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Provider Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Clinic/Practice
                    </label>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-gray-900">
                      {renderValue(bv.practice)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provider Name
                    </label>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-gray-900">
                      {renderValue(bv.provider)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Place of Service
                    </label>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-gray-900">
                      {renderValue(bv.placeOfService)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Patient Initials
                    </label>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-gray-900">
                      {renderValue(bv.initials)}
                    </div>
                  </div>
                </div>
              </section>

              {/* Insurance & Clinical Info */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Clinical Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Insurance
                    </label>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-gray-900">
                      {renderValue(bv.insurance)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ICD-10 Code
                    </label>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-gray-900">
                      {renderValue(bv.icd10)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Wound Type
                    </label>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-gray-900">
                      {renderValue(bv.woundType)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Wound Size
                    </label>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-gray-900">
                      {renderValue(bv.woundSize)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Wound Location
                    </label>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-gray-900">
                      {renderValue(bv.woundLocation)}
                    </div>
                  </div>
                </div>
              </section>

              {/* Clinical Characteristics */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Clinical Characteristics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Conservative Therapy
                    </label>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-gray-900">
                      {renderValue(bv.conservativeTherapy)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Diabetic
                    </label>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-gray-900">
                      {renderValue(bv.diabetic)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tunneling
                    </label>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-gray-900">
                      {renderValue(bv.tunneling)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Infected
                    </label>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-gray-900">
                      {renderValue(bv.infected)}
                    </div>
                  </div>
                </div>
              </section>

              {/* Dates */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Important Dates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Application Date
                    </label>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-gray-900">
                      {renderValue(bv.applicationDate)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Date
                    </label>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-gray-900">
                      {renderValue(bv.deliveryDate)}
                    </div>
                  </div>
                </div>
              </section>

              {/* Instructions */}
              {bv.instructions && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Additional Instructions
                  </h3>
                  <div className="text-base text-gray-900 bg-gray-50 p-4 rounded-lg">
                    {bv.instructions}
                  </div>
                </section>
              )}

              {/* Manufacturer Proof Section */}
              <section className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Manufacturer Proof Review
                  </h3>
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Verification Status
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex px-4 py-1.5 rounded-full text-sm font-semibold border shadow-sm ${
                          bv.proofStatus === "verified"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : bv.proofStatus === "rejected"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : bv.proofStatus === "pending_review"
                                ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {bv.proofStatus === "pending_review" ? "Pending Review" : 
                         bv.proofStatus === "verified" ? "Verified" : 
                         bv.proofStatus === "rejected" ? "Rejected" : "Not Submitted"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {signedProofUrl ? (
                      <a
                        href={signedProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2.5 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold shadow-sm hover:shadow hover:bg-slate-50 transition-all group"
                      >
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        View Uploaded Proof
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-400 rounded-lg text-sm font-medium border border-slate-200 cursor-not-allowed">
                        <AlertCircle className="w-4 h-4" />
                        No Proof Uploaded
                      </div>
                    )}

                    {!viewOnly && bv.approvalProofUrl && (
                      <div className="flex items-center gap-2 ml-2 border-l pl-4 border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleVerifyProof("rejected")}
                          disabled={verifyingProof || bv.proofStatus === "rejected"}
                          className="px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                          {verifyingProof ? "..." : "Reject"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyProof("verified")}
                          disabled={verifyingProof || bv.proofStatus === "verified"}
                          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
                        >
                          {verifyingProof ? "Reviewing..." : "Approve Proof"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Action Buttons */}
              {bv.status === "pending" && !viewOnly && (
                <div className="flex items-center justify-end gap-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => handleVerify("rejected")}
                    disabled={verifying}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {verifying ? "Processing..." : "Deny"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerify("approved")}
                    disabled={verifying}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {verifying ? "Processing..." : "Approve"}
                  </button>
                </div>
              )}

              {bv.status !== "pending" && !isEditing && !viewOnly && (
                <div className="flex items-center justify-between pt-6 border-t">
                  <div className="text-gray-500 text-sm">
                    This request has already been {bv.status}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                </div>
              )}

              {bv.status !== "pending" && isEditing && !viewOnly && (
                <div className="flex items-center justify-between pt-6 border-t">
                  <div className="text-gray-500 text-sm">
                    This request has already been {bv.status}
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-2.5 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerify("rejected")}
                      disabled={verifying}
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {verifying ? "Processing..." : "Deny"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerify("approved")}
                      disabled={verifying}
                      className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {verifying ? "Processing..." : "Approve"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {showSuccess && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.3)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "48px 48px 40px",
              boxShadow:
                "0 8px 40px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.08)",
              textAlign: "center",
              minWidth: 340,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "#dcfce7",
                margin: "0 auto 20px",
              }}
            >
              <CheckCircle2
                size={48}
                strokeWidth={2}
                style={{ color: "#16a34a" }}
              />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              BV Approved!
            </div>
            <div style={{ fontSize: 16, color: "#555" }}>
              Redirecting to Product Orders in few seconds...
            </div>
          </div>
        </div>
      )}
    </>
  );
}
