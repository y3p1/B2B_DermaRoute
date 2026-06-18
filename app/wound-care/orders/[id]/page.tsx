"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";

type BvDetail = {
  id: string;
  status: string;
  insurance: string | null;
  woundType: string | null;
  woundSize: string | null;
  woundLocation: string | null;
  initials: string | null;
  icd10: string | null;
  placeOfService: string | null;
  applicationDate: string | null;
  deliveryDate: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  deliveryZip: string | null;
  practice: string | null;
  proofStatus: string | null;
  createdAt: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
  downloaded: "bg-slate-100 text-slate-600",
  cancelled: "bg-slate-100 text-slate-500",
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm text-slate-800">{value ?? "—"}</p>
    </div>
  );
}

export default function WoundCareOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.jwt);
  const [order, setOrder] = React.useState<BvDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token || !id) return;
    void apiGet<{ success: true; data: BvDetail }>(`/api/bv-requests/${id}`, { token })
      .then((res) => setOrder(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load request"))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) return <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>;
  if (error || !order) return (
    <div className="p-10 text-center">
      <p className="text-red-600 text-sm mb-4">{error ?? "Request not found."}</p>
      <Link href="/wound-care/orders" className="text-emerald-600 underline text-sm">← Back to requests</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/wound-care/orders" className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to requests
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">BV Request Detail</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">{order.id}</p>
        </div>
        <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-500"}`}>
          {order.status}
        </span>
      </div>

      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Patient</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Initials" value={order.initials} />
            <Field label="Practice" value={order.practice} />
            <Field label="Place of Service" value={order.placeOfService} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Clinical</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Insurance" value={order.insurance} />
            <Field label="Wound Type" value={order.woundType} />
            <Field label="Wound Size" value={order.woundSize} />
            <Field label="Wound Location" value={order.woundLocation} />
            <Field label="ICD-10" value={order.icd10} />
            <Field label="Application Date" value={order.applicationDate} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Delivery</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Delivery Date" value={order.deliveryDate} />
            <Field label="Address" value={order.deliveryAddress} />
            <Field label="City / State / Zip" value={[order.deliveryCity, order.deliveryState, order.deliveryZip].filter(Boolean).join(", ")} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Submission</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Submitted" value={order.createdAt ? new Date(order.createdAt).toLocaleString() : null} />
            <Field label="Proof Status" value={order.proofStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}
