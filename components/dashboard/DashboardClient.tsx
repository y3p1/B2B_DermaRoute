"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { isClientDemoMode } from "@/lib/demoMode";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import NewBVModal from "@/components/dashboard/BvModal";
import BvDataTable from "@/components/dashboard/BvDataTable";
import BvDetailModal from "./BvDetailModal";
import type { BVFormData } from "@/components/dashboard/BvModal";

type BvRequestRow = {
  id: string;
  createdAt: string | null;
  status: string;
  provider: string | null;
  practice: string | null;
  woundSize: string | null;
  applicationDate: string | null;
  deliveryDate: string | null;
  proofStatus: string | null;
  approvalProofUrl: string | null;
  initials: string | null;
  placeOfService: string | null;
  insurance: string | null;
  woundType: string | null;
  woundLocation: string | null;
};

const DashboardClient: React.FC = () => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [detailEdit, setDetailEdit] = React.useState(false);
  const [detailInitialData, setDetailInitialData] =
    React.useState<BVFormData | null>(null);
  const [bvRequests, setBvRequests] = React.useState<BvRequestRow[]>([]);
  const [bvError, setBvError] = React.useState<string | null>(null);
  const [bvLoading, setBvLoading] = React.useState(false);
  const router = useRouter();

  const authStatus = useAuthStore((s) => s.status);
  const token = useAuthStore((s) => s.jwt);
  const role = useAuthStore((s) => s.role);

  const refreshBvRequests = React.useCallback(async () => {
    setBvLoading(true);
    setBvError(null);
    try {
      if (!token) {
        setBvError("Please sign in again.");
        return;
      }

      const res = await apiGet<{ success: true; data: BvRequestRow[] }>(
        "/api/bv-requests",
        { token },
      );
      setBvRequests(res.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load BV requests";
      setBvError(message);
    } finally {
      setBvLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (isClientDemoMode()) return;
    if (authStatus === "unauthenticated") {
      router.replace("/auth");
    }
  }, [authStatus, router, token]);

  React.useEffect(() => {
    if (authStatus !== "authenticated") return;
    if (role === "admin") {
      router.replace("/admin");
    } else if (role === "clinic_staff") {
      router.replace("/clinic-staff");
    }
  }, [authStatus, role, router]);

  React.useEffect(() => {
    if (authStatus !== "authenticated") return;
    if (role === "admin" || role === "clinic_staff") return;
    void refreshBvRequests();
  }, [authStatus, refreshBvRequests, role]);

  if (authStatus === "idle" || authStatus === "loading") {
    return <div className="min-h-screen bg-[#F8F9FB]" />;
  }

  if (authStatus === "error") {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 text-sm text-red-600">
          Failed to load session. Please sign in again.
        </div>
      </div>
    );
  }

  const total = bvRequests.length;
  const pending = bvRequests.filter((r) => r.status === "pending").length;
  const approved = bvRequests.filter((r) => r.status === "approved").length;

  const roleLabel = (r: string | null) => {
    if (r === "admin") return "Admin";
    if (r === "clinic_staff") return "Clinic Staff";
    if (r === "provider") return "Provider";
    return "";
  };

  const titleRole = roleLabel(role);

  return authStatus === "authenticated" ? (
    <div className="min-h-screen bg-[#F8F9FB]">
      <DashboardNavbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="w-full text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#18192B]">
            {titleRole ? `${titleRole} Dashboard` : "Dashboard"}
          </h1>
        </div>
        {bvError && (
          <div className="mb-4">
            <div className="bg-white rounded-lg shadow p-3 text-sm text-red-600">
              {bvError}
            </div>
          </div>
        )}
        {/* Header Row with Title and New BV Button */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <h2 className="text-2xl font-bold text-[#18192B]">BV Requests</h2>
          <button
            type="button"
            className="flex items-center gap-2 bg-[#00C48C] hover:bg-[#00a06c] text-white font-semibold rounded-lg px-6 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00C48C] focus:ring-offset-2"
            onClick={() => setModalOpen(true)}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="#fff"
                strokeWidth="2"
                fill="#00C48C"
              />
              <path
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.5 12.5l2 2 3-4"
              />
            </svg>
            New BV
          </button>
        </div>
        <DashboardStats total={total} pending={pending} approved={approved} />
        <DashboardFilters />
        <BvDataTable
          rows={bvRequests}
          loading={bvLoading}
          onUploaded={refreshBvRequests}
          onView={(id) => {
            const row = bvRequests.find((r) => r.id === id) ?? null;
            setDetailInitialData(
              row
                ? {
                    provider: row.provider ?? undefined,
                    placeOfService: undefined,
                    insurance: undefined,
                    woundType: undefined,
                    woundSize: row.woundSize ?? undefined,
                    woundLocation: undefined,
                    icd10: undefined,
                    initials: undefined,
                    applicationDate: row.applicationDate ?? undefined,
                    deliveryDate: row.deliveryDate ?? undefined,
                    instructions: undefined,
                  }
                : null,
            );
            setDetailId(id);
            setDetailEdit(false);
            setDetailOpen(true);
          }}
          onEdit={(id) => {
            const row = bvRequests.find((r) => r.id === id) ?? null;
            setDetailInitialData(
              row
                ? {
                    provider: row.provider ?? undefined,
                    placeOfService: undefined,
                    insurance: undefined,
                    woundType: undefined,
                    woundSize: row.woundSize ?? undefined,
                    woundLocation: undefined,
                    icd10: undefined,
                    initials: undefined,
                    applicationDate: row.applicationDate ?? undefined,
                    deliveryDate: row.deliveryDate ?? undefined,
                    instructions: undefined,
                  }
                : null,
            );
            setDetailId(id);
            setDetailEdit(true);
            setDetailOpen(true);
          }}
        />
        <NewBVModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onCreated={refreshBvRequests}
        />
        <BvDetailModal
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) {
              setDetailId(null);
              setDetailEdit(false);
              setDetailInitialData(null);
            }
          }}
          id={detailId ?? undefined}
          edit={detailEdit}
          initialData={detailInitialData}
          onUpdated={refreshBvRequests}
          onRequestEdit={(initialData) => {
            if (initialData) setDetailInitialData(initialData);
            setDetailEdit(true);
            setDetailOpen(true);
          }}
        />
      </main>
    </div>
  ) : null;
};

export default DashboardClient;
