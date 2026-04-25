"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import NewBVModal from "./BvModal";
import type { BVFormData } from "./BvModal";

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
  a1cPercent?: string | number | null;
  a1cMeasuredAt?: string | null;
  tunneling?: boolean;
  infected?: boolean;
  initials?: string | null;
  applicationDate?: string | null;
  deliveryDate?: string | null;
  instructions?: string | null;
};

export default function BvDetailClient({
  id,
  edit,
  onRequestEdit,
}: {
  id?: string;
  edit?: string | null;
  onRequestEdit?: (initialData?: BVFormData) => void;
}) {
  const clientParams = useParams() as { id?: string } | undefined;
  const effectiveId = id ?? clientParams?.id;
  const [bv, setBv] = React.useState<BvRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const token = useAuthStore((s) => s.jwt);
  const router = useRouter();

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);

      // Guard early and surface the actual `id` value for diagnosis.
      if (!effectiveId || effectiveId === "undefined") {
        setLoading(false);
        setError(`Invalid BV request id: ${String(effectiveId)}`);
        return;
      }

      try {
        const res = await apiGet<{ success: true; data: BvRow }>(
          `/api/bv-requests/${effectiveId}`,
          { token: token ?? undefined },
        );
        if (!mounted) return;
        const found = res.data ?? null;
        if (!found) {
          setError("BV request not found.");
          setBv(null);
        } else {
          setBv(found);
          if (edit) setModalOpen(true);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load BV request");
      } finally {
        setLoading(false);
      }
    }
    if (!token) return;
    void load();
    return () => {
      mounted = false;
    };
  }, [effectiveId, token, edit]);

  if (loading)
    return (
      <div className="w-full animate-pulse px-4 py-8">
        {/* Clinical Info skeleton */}
        <section className="mb-8 w-full">
          <div className="h-5 w-40 bg-gray-200 rounded mb-6 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 w-full">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="space-y-2 w-full">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-10 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        </section>
        {/* Delivery & Dates skeleton */}
        <section className="mb-8 w-full">
          <div className="h-5 w-40 bg-gray-200 rounded mb-6 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 w-full">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2 w-full">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-10 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        </section>
        {/* Instructions skeleton */}
        <section className="w-full">
          <div className="h-5 w-40 bg-gray-200 rounded mb-6 w-full" />
          <div className="h-10 bg-gray-100 rounded w-full" />
        </section>
      </div>
    );
  if (error)
    return (
      <div className="w-full h-[200px] flex items-center justify-center">
        <div className="bg-red-50 text-red-700 px-6 py-4 rounded">{error}</div>
      </div>
    );

  const defaultValues: BVFormData = bv
    ? {
        provider: bv.provider ?? "",
        placeOfService: bv.placeOfService ?? "",
        insurance: bv.insurance ?? "",
        woundType: bv.woundType ?? "",
        woundSize: bv.woundSize ?? "",
        woundLocation: bv.woundLocation ?? "",
        icd10: bv.icd10 ?? "",
        conservativeTherapy:
          bv.conservativeTherapy === undefined
            ? "no"
            : bv.conservativeTherapy
              ? "yes"
              : "no",
        diabetic: bv.diabetic === undefined ? "no" : bv.diabetic ? "yes" : "no",
        a1cPercent:
          bv.a1cPercent != null && bv.a1cPercent !== ""
            ? Number(bv.a1cPercent)
            : undefined,
        a1cMeasuredAt: bv.a1cMeasuredAt ?? undefined,
        tunneling:
          bv.tunneling === undefined ? "no" : bv.tunneling ? "yes" : "no",
        infected: bv.infected === undefined ? "no" : bv.infected ? "yes" : "no",
        initials: bv.initials ?? "",
        applicationDate: bv.applicationDate ?? "",
        deliveryDate: bv.deliveryDate ?? "",
        instructions: bv.instructions ?? "",
      }
    : {
        provider: "",
        placeOfService: "",
        insurance: "",
        woundType: "",
        woundSize: "",
        woundLocation: "",
        icd10: "",
        conservativeTherapy: "no",
        diabetic: "no",
        tunneling: "no",
        infected: "no",
        initials: "",
        applicationDate: "",
        deliveryDate: "",
        instructions: "",
      };

  const renderField = (label: string, value: React.ReactNode) => (
    <div className="mb-4">
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className="p-3 bg-slate-50 rounded border border-slate-100">
        {value}
      </div>
    </div>
  );

  return (
    <div className="w-full px-8 py-6">
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          className="flex items-center gap-2 bg-[#00C48C] hover:bg-[#00a06c] text-white font-semibold rounded-lg px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00C48C] focus:ring-offset-2"
          onClick={() => {
            if (onRequestEdit) {
              onRequestEdit(defaultValues);
            } else {
              setModalOpen(true);
            }
          }}
        >
          Edit
        </button>
      </div>

      <section className="mb-6">
        <h2 className="text-md font-semibold mb-3">Clinical Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField("Provider", bv?.provider ?? "—")}
          {renderField("Practice", bv?.practice ?? "—")}
          {renderField("Insurance", bv?.insurance ?? "—")}
          {renderField("Place of Service", bv?.placeOfService ?? "—")}
          {renderField("Wound Type", bv?.woundType ?? "—")}
          {renderField("Wound Size", bv?.woundSize ?? "—")}
          {renderField("Wound Location", bv?.woundLocation ?? "—")}
          {renderField("ICD-10", bv?.icd10 ?? "—")}
          {renderField(
            "Conservative Therapy (4+ weeks)",
            bv?.conservativeTherapy ? "Yes" : "No",
          )}
          {renderField("Patient Diabetic", bv?.diabetic ? "Yes" : "No")}
          {bv?.diabetic &&
            renderField(
              "A1C",
              bv?.a1cPercent != null
                ? `${bv.a1cPercent}%${bv.a1cMeasuredAt ? ` (${bv.a1cMeasuredAt})` : ""}`
                : "—",
            )}
          {renderField("Tunneling/Undermining", bv?.tunneling ? "Yes" : "No")}
          {renderField("Infected", bv?.infected ? "Yes" : "No")}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-md font-semibold mb-3">Delivery & Dates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField("Application Date", bv?.applicationDate ?? "—")}
          {renderField("Delivery Date", bv?.deliveryDate ?? "—")}
          {renderField("Status", bv?.status ?? "—")}
          {renderField("Initials", bv?.initials ?? "—")}
        </div>
      </section>

      <section>
        <h2 className="text-md font-semibold mb-3">Instructions</h2>
        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          {bv?.instructions ?? "—"}
        </div>
      </section>

      {/** fallback edit modal for standalone usage (keeps backward compatibility) */}
      {modalOpen && (
        <NewBVModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          initialData={defaultValues}
          id={bv?.id}
          mode="edit"
          onCreated={() => router.push("/dashboard")}
        />
      )}

      {/* If we finished loading but have no BV, show placeholder at end of UI */}
      {!loading && !bv && (
        <div className="w-full h-[200px] flex items-center justify-center mt-8">
          <div className="text-slate-600 px-6 py-4 rounded">
            No BV data available.
          </div>
        </div>
      )}
    </div>
  );
}
