"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { humanizeLabel } from "@/lib/format";

type LymphedemaOrderDetail = {
  id: string;
  status: string;
  insurance: string | null;
  placeOfService: string | null;
  patient: { firstName?: string; lastName?: string; dob?: string; mrn?: string; address?: string; city?: string; state?: string; zip?: string; phone?: string; email?: string } | null;
  diagnosis: string[] | null;
  conservativeTherapyCompleted: boolean | null;
  skinChanges: string[] | null;
  extremity: string[] | null;
  measurements: Record<string, number> | null;
  device: string | null;
  hcpcs: string | null;
  deviceRecommended: boolean | null;
  garmentType: string | null;
  garmentStyle: string | null;
  compressionLevel: string | null;
  quantity: number | null;
  customMade: boolean | null;
  manufacturerPreference: string | null;
  distalPressureMmhg: number | null;
  timesPerDay: number | null;
  minutesPerSession: number | null;
  submittedAt: string | null;
  submissionEmailUsed: string | null;
  createdAt: string | null;
};

function Field({ label, value }: { label: string; value?: string | number | boolean | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm text-slate-800">{value === null || value === undefined ? "—" : String(value)}</p>
    </div>
  );
}

export default function MedicalDevicesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.jwt);
  const [order, setOrder] = React.useState<LymphedemaOrderDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token || !id) return;
    void apiGet<{ success: true; data: LymphedemaOrderDetail }>(`/api/lymphedema-orders/${id}`, { token })
      .then((res) => setOrder(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load order"))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) return <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>;
  if (error || !order) return (
    <div className="p-10 text-center">
      <p className="text-red-600 text-sm mb-4">{error ?? "Order not found."}</p>
      <Link href="/medical-devices/orders" className="text-purple-600 underline text-sm">← Back to orders</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/medical-devices/orders" className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to orders
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-purple-900">Order Detail</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">{order.id}</p>
        </div>
        <StatusBadge status={order.status} size="md" />
      </div>

      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Patient Information</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="First Name" value={order.patient?.firstName} />
            <Field label="Last Name" value={order.patient?.lastName} />
            <Field label="Date of Birth" value={order.patient?.dob} />
            <Field label="MRN" value={order.patient?.mrn} />
            <Field label="Phone" value={order.patient?.phone} />
            <Field label="Email" value={order.patient?.email} />
          </div>
          {order.patient?.address && (
            <div className="mt-3">
              <Field label="Address" value={[order.patient.address, order.patient.city, order.patient.state, order.patient.zip].filter(Boolean).join(", ")} />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Insurance & Service</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Insurance" value={order.insurance} />
            <Field label="Place of Service" value={order.placeOfService} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Clinical Assessment</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Diagnosis" value={order.diagnosis?.join(", ")} />
            <Field label="Conservative Therapy" value={order.conservativeTherapyCompleted ? "Yes (≥4 weeks)" : order.conservativeTherapyCompleted === false ? "No" : null} />
            <Field label="Skin Changes" value={order.skinChanges?.map((s) => humanizeLabel(s)).join(", ")} />
            <Field label="Extremity" value={Array.isArray(order.extremity) ? order.extremity.map((ex) => humanizeLabel(ex)).join(", ") : null} />
          </div>
          {order.measurements && Object.keys(order.measurements).length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-500 mb-2">Measurements</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Object.entries(order.measurements).map(([k, v]) => (
                  <Field key={k} label={k} value={`${v} cm`} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Device Recommendation</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Device" value={order.device} />
            <Field label="HCPCS Code" value={order.hcpcs} />
            <Field label="Recommended by System" value={order.deviceRecommended ? "Yes" : order.deviceRecommended === false ? "Overridden" : null} />
            <Field label="Garment" value={order.garmentStyle && order.garmentType ? `${order.garmentStyle} (${order.garmentType})` : order.garmentStyle ?? order.garmentType} />
            <Field label="Compression Level" value={order.compressionLevel} />
            <Field label="Quantity" value={order.quantity} />
            <Field label="Custom Made" value={order.customMade === true ? "Yes" : order.customMade === false ? "No" : null} />
            <Field label="Manufacturer Preference" value={order.manufacturerPreference} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Treatment Protocol</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Distal Pressure" value={order.distalPressureMmhg ? `${order.distalPressureMmhg} mmHg` : null} />
            <Field label="Times per Day" value={order.timesPerDay ? `${order.timesPerDay}×` : null} />
            <Field label="Minutes per Session" value={order.minutesPerSession ? `${order.minutesPerSession} min` : null} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Submission Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Created" value={order.createdAt ? new Date(order.createdAt).toLocaleString() : null} />
            <Field label="Submitted" value={order.submittedAt ? new Date(order.submittedAt).toLocaleString() : "Pending"} />
            <Field label="Email Sent To" value={order.submissionEmailUsed} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/medical-devices/orders/${id}/pdf`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            View PDF
          </Link>
        </div>
      </div>
    </div>
  );
}
