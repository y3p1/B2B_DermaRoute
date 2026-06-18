"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";

type OcularOrderDetail = {
  id: string;
  status: string;
  eye: string | null;
  productVariant: string | null;
  sizeMm: number | null;
  sku: string | null;
  quantity: number | null;
  patient: { firstName?: string; lastName?: string; dob?: string; mrn?: string } | null;
  primaryDiagnosis: string | null;
  secondaryDiagnosis: string | null;
  shipTo: { address?: string; city?: string; state?: string; zip?: string } | null;
  specialInstructions: string | null;
  insurancePayer: string | null;
  insuranceMemberId: string | null;
  dateNeededBy: string | null;
  submittedAt: string | null;
  submissionEmailUsed: string | null;
  createdAt: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
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

export default function OcularOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.jwt);
  const [order, setOrder] = React.useState<OcularOrderDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token || !id) return;
    void apiGet<{ success: true; data: OcularOrderDetail }>(`/api/ocular/orders/${id}`, { token })
      .then((res) => setOrder(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load order"))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) return <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>;
  if (error || !order) return (
    <div className="p-10 text-center">
      <p className="text-red-600 text-sm mb-4">{error ?? "Order not found."}</p>
      <Link href="/ocular/orders" className="text-teal-600 underline text-sm">← Back to orders</Link>
    </div>
  );

  const productLabel = order.productVariant && order.sizeMm
    ? `VisiDisc ${order.productVariant.charAt(0).toUpperCase() + order.productVariant.slice(1)} ${order.sizeMm}mm`
    : order.sku ?? "—";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/ocular/orders" className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to orders
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-teal-900">Order Detail</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">{order.id}</p>
        </div>
        <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-500"}`}>
          {order.status}
        </span>
      </div>

      <div className="space-y-5">
        {/* Patient */}
        <div className="bg-white rounded-xl border border-teal-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Patient</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="First Name" value={order.patient?.firstName} />
            <Field label="Last Name" value={order.patient?.lastName} />
            <Field label="Date of Birth" value={order.patient?.dob} />
            <Field label="MRN" value={order.patient?.mrn} />
          </div>
        </div>

        {/* Diagnosis */}
        <div className="bg-white rounded-xl border border-teal-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Diagnosis</h2>
          <div className="space-y-3">
            <Field label="Primary" value={order.primaryDiagnosis} />
            {order.secondaryDiagnosis && <Field label="Secondary" value={order.secondaryDiagnosis} />}
          </div>
        </div>

        {/* Product */}
        <div className="bg-white rounded-xl border border-teal-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Product</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Product" value={productLabel} />
            <Field label="SKU" value={order.sku} />
            <Field label="Eye" value={order.eye ? order.eye.charAt(0).toUpperCase() + order.eye.slice(1) : null} />
            <Field label="Quantity" value={order.quantity} />
          </div>
        </div>

        {/* Delivery */}
        <div className="bg-white rounded-xl border border-teal-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Delivery</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date Needed By" value={order.dateNeededBy} />
            <div />
            <Field label="Address" value={order.shipTo?.address} />
            <Field label="City / State / Zip" value={[order.shipTo?.city, order.shipTo?.state, order.shipTo?.zip].filter(Boolean).join(", ")} />
          </div>
          {order.specialInstructions && (
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-500 mb-0.5">Special Instructions</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.specialInstructions}</p>
            </div>
          )}
        </div>

        {/* Insurance */}
        {(order.insurancePayer || order.insuranceMemberId) && (
          <div className="bg-white rounded-xl border border-teal-100 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4">Insurance</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Payer" value={order.insurancePayer} />
              <Field label="Member ID" value={order.insuranceMemberId} />
            </div>
          </div>
        )}

        {/* Submission */}
        <div className="bg-white rounded-xl border border-teal-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Submission Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Created" value={order.createdAt ? new Date(order.createdAt).toLocaleString() : null} />
            <Field label="Submitted" value={order.submittedAt ? new Date(order.submittedAt).toLocaleString() : "Pending"} />
            <Field label="Email Sent To" value={order.submissionEmailUsed} />
          </div>
        </div>
      </div>
    </div>
  );
}
