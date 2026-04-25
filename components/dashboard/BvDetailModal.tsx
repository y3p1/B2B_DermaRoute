"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BvDetailClient from "./BvDetailClient";
import BVModal from "./BvModal";
import { useAuthStore } from "@/store/auth";

import type { BVFormData } from "./BvModal";

type BVInitialData = BVFormData;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id?: string;
  edit?: boolean;
  initialData?: BVInitialData | null;
  onUpdated?: () => void;
  onRequestEdit?: (initialData?: BVInitialData) => void;
};

export default function BvDetailModal({
  open,
  onOpenChange,
  id,
  edit,
  initialData,
  onUpdated,
  onRequestEdit,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editData, setEditData] = React.useState<BVFormData | null>(null);
  const token = useAuthStore((s) => s.jwt);

  React.useEffect(() => {
    if (edit && id && token) {
      setLoading(true);
      setError(null);
      fetch(`/api/bv-requests/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to fetch BV data");
          const body = await res.json();
          // Map API response to BVFormData shape
          const bv = body.data;
          const mapped: BVFormData = {
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
            diabetic:
              bv.diabetic === undefined ? "no" : bv.diabetic ? "yes" : "no",
            tunneling:
              bv.tunneling === undefined ? "no" : bv.tunneling ? "yes" : "no",
            infected:
              bv.infected === undefined ? "no" : bv.infected ? "yes" : "no",
            initials: bv.initials ?? "",
            applicationDate: bv.applicationDate ?? "",
            deliveryDate: bv.deliveryDate ?? "",
            instructions: bv.instructions ?? "",
          };
          setEditData(mapped);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      setEditData(null);
    }
  }, [edit, id, token]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[80vw] max-w-[80vw] sm:max-w-none p-0 max-h-[98vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="w-full text-center py-4">
            <h1 className="text-2xl mt-4 font-extrabold">
              {id ? `BV Request #${id}` : "BV Request"}
            </h1>
            <div className="text-sm text-muted-foreground">
              {edit ? "Edit BV" : "View BV"}
            </div>
          </div>
        </DialogHeader>
        {id ? (
          edit ? (
            loading ? (
              <div className="p-8">
                <div className="animate-pulse space-y-8">
                  {/* Title skeleton */}
                  <div className="h-8 bg-gray-200 rounded w-full mb-1" />
                  {/* Subtitle skeleton */}
                  <div className="h-4 bg-gray-100 rounded w-full mb-8" />
                  {/* Clinical Info skeleton */}
                  <section className="mb-6 w-full">
                    <div className="h-5 bg-gray-200 rounded mb-4 w-full" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="mb-0 w-full">
                          <div className="h-4 bg-gray-100 rounded mb-2 w-full" />
                          <div className="h-10 bg-gray-100 rounded w-full" />
                        </div>
                      ))}
                    </div>
                  </section>
                  {/* Delivery & Dates skeleton */}
                  <section className="mb-6 w-full">
                    <div className="h-5 bg-gray-200 rounded mb-4 w-full" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="mb-0 w-full">
                          <div className="h-4 bg-gray-100 rounded mb-2 w-full" />
                          <div className="h-10 bg-gray-100 rounded w-full" />
                        </div>
                      ))}
                    </div>
                  </section>
                  {/* Instructions skeleton */}
                  <section className="w-full">
                    <div className="h-5 bg-gray-200 rounded mb-4 w-full" />
                    <div className="h-10 bg-gray-100 rounded w-full" />
                  </section>
                </div>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">{error}</div>
            ) : (
              <BVModal
                open={true}
                onOpenChange={onOpenChange}
                initialData={editData ?? undefined}
                id={id}
                mode="edit"
                onCreated={onUpdated}
              />
            )
          ) : (
            <BvDetailClient
              id={id}
              edit={undefined}
              onRequestEdit={onRequestEdit}
            />
          )
        ) : (
          <div className="p-6">No BV selected.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
