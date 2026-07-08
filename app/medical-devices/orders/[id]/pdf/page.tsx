"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import {
  ReMarxOrderDocument,
  orderToFormData,
  type LymphedemaOrderForPdf,
} from "@/components/dashboard/LymphedemaOrderPdf";

export default function MedicalDevicesOrderPdfPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.jwt);
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    async function run() {
      try {
        const res = await apiGet<{ success: true; data: LymphedemaOrderForPdf }>(
          `/api/lymphedema-orders/${id}`,
          { token: token ?? undefined },
        );
        const formData = orderToFormData(res.data);
        const { pdf } = await import("@react-pdf/renderer");
        const blob = await pdf(<ReMarxOrderDocument data={formData} />).toBlob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, id]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href={`/medical-devices/orders/${id}`}
        className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to order
      </Link>

      <h1 className="text-2xl font-bold text-purple-900 mb-6">ReMarx Order PDF</h1>

      {loading ? (
        <div className="p-10 text-center text-slate-400 text-sm">Generating PDF…</div>
      ) : error || !blobUrl ? (
        <div className="p-10 text-center">
          <p className="text-red-600 text-sm">{error ?? "Failed to load PDF."}</p>
        </div>
      ) : (
        <object
          data={blobUrl}
          type="application/pdf"
          className="w-full h-[calc(100vh-220px)] rounded-xl border border-purple-100 shadow-sm"
        >
          <div className="p-10 text-center text-sm text-slate-600">
            Your browser can&apos;t display the PDF inline.{" "}
            <a href={blobUrl} download className="text-purple-600 underline">
              Download it instead
            </a>
            .
          </div>
        </object>
      )}
    </div>
  );
}
