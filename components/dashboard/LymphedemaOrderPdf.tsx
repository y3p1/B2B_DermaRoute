"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/apiClient";

type LymphedemaOrderForPdf = {
  id: string;
  status: string;
  patient: { firstName?: string; lastName?: string; dob?: string; mrn?: string } | null;
  insurance: string | null;
  placeOfService: string | null;
  diagnosis: { primary?: string; secondary?: string } | null;
  extremity: { side?: string; type?: string } | null;
  measurements: Record<string, string> | null;
  device: string | null;
  hcpcs: string | null;
  garmentType: string | null;
  garmentStyle: string | null;
  compressionLevel: string | null;
  quantity: number | null;
  customMade: boolean | null;
  manufacturerPreference: string | null;
  timesPerDay: number | null;
  minutesPerSession: number | null;
  submittedAt: string | null;
  createdAt: string | null;
};

interface LymphedemaOrderPdfProps {
  order: LymphedemaOrderForPdf;
  clinicName?: string | null;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontWeight: 700,
          fontSize: 13,
          color: "#1e293b",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: 4,
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: "#1e293b", marginTop: 2 }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

export function LymphedemaOrderPdf({ order, clinicName }: LymphedemaOrderPdfProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = contentRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Medical Device Order — ${order.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; padding: 32px; }
    @media print {
      @page { margin: 20mm; }
      body { padding: 0; }
    }
  </style>
</head>
<body>${content.innerHTML}</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  }

  const patientName =
    [order.patient?.firstName, order.patient?.lastName].filter(Boolean).join(" ") || "—";
  const extremityLabel =
    order.extremity
      ? [order.extremity.side, order.extremity.type].filter(Boolean).join(" ").replace(/\b\w/g, (c) => c.toUpperCase())
      : null;
  const measurementText =
    order.measurements
      ? Object.entries(order.measurements)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")
      : null;

  return (
    <>
      <button
        onClick={handlePrint}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Download PDF
      </button>

      {/* Hidden printable content */}
      <div style={{ display: "none" }}>
        <div ref={contentRef}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b" }}>
                  Medical Device / Equipment Order
                </div>
                {clinicName && (
                  <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>{clinicName}</div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Order ID
                </div>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#475569" }}>
                  {order.id}
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 600,
                textTransform: "capitalize",
                background: order.status === "approved" ? "#dcfce7" : order.status === "denied" ? "#fee2e2" : "#fef9c3",
                color: order.status === "approved" ? "#166534" : order.status === "denied" ? "#991b1b" : "#713f12",
              }}
            >
              {order.status}
            </div>
          </div>

          <Section title="Patient Information">
            <Field label="Patient Name" value={patientName} />
            <Field label="Date of Birth" value={order.patient?.dob} />
            <Field label="MRN" value={order.patient?.mrn} />
            <Field label="Insurance" value={order.insurance} />
            <Field label="Place of Service" value={order.placeOfService} />
          </Section>

          <Section title="Clinical Assessment">
            <Field label="Primary Diagnosis" value={order.diagnosis?.primary} />
            <Field label="Secondary Diagnosis" value={order.diagnosis?.secondary} />
            <Field label="Extremity" value={extremityLabel} />
            <Field label="Measurements" value={measurementText} />
          </Section>

          <Section title="Device Recommendation">
            <Field label="Device" value={order.device} />
            <Field label="HCPCS Code" value={order.hcpcs} />
            <Field label="Garment Type" value={order.garmentType} />
            <Field label="Garment Style" value={order.garmentStyle} />
            <Field label="Compression Level" value={order.compressionLevel} />
            <Field label="Quantity" value={order.quantity} />
            <Field label="Custom Made" value={order.customMade === true ? "Yes" : order.customMade === false ? "No" : null} />
            <Field label="Manufacturer Preference" value={order.manufacturerPreference} />
          </Section>

          <Section title="Treatment Protocol">
            <Field label="Times Per Day" value={order.timesPerDay} />
            <Field label="Minutes Per Session" value={order.minutesPerSession} />
          </Section>

          <div style={{ marginTop: 40, borderTop: "1px solid #e2e8f0", paddingTop: 16, display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8" }}>
            <div>Submitted: {order.submittedAt ? new Date(order.submittedAt).toLocaleString() : "Pending"}</div>
            <div>Generated: {new Date().toLocaleString()}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export function LymphedemaOrderPdfButton({
  orderId,
  token,
  clinicName,
}: {
  orderId: string;
  token: string | null;
  clinicName?: string | null;
}) {
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiGet<{ success: true; data: LymphedemaOrderForPdf }>(
        `/api/lymphedema-orders/${orderId}`,
        { token },
      );
      const order = res.data;

      const patientName =
        [order.patient?.firstName, order.patient?.lastName]
          .filter(Boolean)
          .join(" ") || "—";
      const extremityLabel = order.extremity
        ? [order.extremity.side, order.extremity.type]
            .filter(Boolean)
            .join(" ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : null;
      const measurementText = order.measurements
        ? Object.entries(order.measurements)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : null;

      const statusColors: Record<string, { bg: string; color: string }> = {
        approved: { bg: "#dcfce7", color: "#166534" },
        completed: { bg: "#dcfce7", color: "#166534" },
        denied: { bg: "#fee2e2", color: "#991b1b" },
        cancelled: { bg: "#fee2e2", color: "#991b1b" },
      };
      const sc = statusColors[order.status] ?? { bg: "#fef9c3", color: "#713f12" };

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Medical Device Order — ${order.id}</title>
<style>* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1e293b; padding:32px; }
.section { margin-bottom:24px; }
.section-title { font-weight:700; font-size:11px; color:#1e293b; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:12px; text-transform:uppercase; letter-spacing:.05em; }
.grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; }
.label { font-size:9px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:.05em; }
.value { font-size:12px; color:#1e293b; margin-top:2px; }
.footer { margin-top:40px; border-top:1px solid #e2e8f0; padding-top:16px; display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; }
@media print { @page { margin:20mm; } body { padding:0; } }
</style></head><body>
<div style="margin-bottom:32px">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="font-size:20px;font-weight:800">Medical Device / Equipment Order</div>
      ${clinicName ? `<div style="font-size:13px;color:#64748b;margin-top:4px">${clinicName}</div>` : ""}
    </div>
    <div style="text-align:right">
      <div style="font-size:9px;color:#94a3b8;text-transform:uppercase">Order ID</div>
      <div style="font-size:10px;font-family:monospace;color:#475569">${order.id}</div>
      <div style="font-size:9px;color:#94a3b8;margin-top:6px">${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}</div>
    </div>
  </div>
  <div style="margin-top:12px;display:inline-block;padding:4px 12px;border-radius:9999px;font-size:10px;font-weight:600;text-transform:capitalize;background:${sc.bg};color:${sc.color}">${order.status}</div>
</div>
<div class="section"><div class="section-title">Patient Information</div>
<div class="grid">
<div><div class="label">Patient Name</div><div class="value">${patientName}</div></div>
<div><div class="label">Date of Birth</div><div class="value">${order.patient?.dob ?? "—"}</div></div>
<div><div class="label">MRN</div><div class="value">${order.patient?.mrn ?? "—"}</div></div>
<div><div class="label">Insurance</div><div class="value">${order.insurance ?? "—"}</div></div>
<div><div class="label">Place of Service</div><div class="value">${order.placeOfService ?? "—"}</div></div>
</div></div>
<div class="section"><div class="section-title">Clinical Assessment</div>
<div class="grid">
<div><div class="label">Primary Diagnosis</div><div class="value">${order.diagnosis?.primary ?? "—"}</div></div>
<div><div class="label">Secondary Diagnosis</div><div class="value">${order.diagnosis?.secondary ?? "—"}</div></div>
<div><div class="label">Extremity</div><div class="value">${extremityLabel ?? "—"}</div></div>
<div><div class="label">Measurements</div><div class="value">${measurementText ?? "—"}</div></div>
</div></div>
<div class="section"><div class="section-title">Device Recommendation</div>
<div class="grid">
<div><div class="label">Device</div><div class="value">${order.device ?? "—"}</div></div>
<div><div class="label">HCPCS Code</div><div class="value">${order.hcpcs ?? "—"}</div></div>
<div><div class="label">Garment Type</div><div class="value">${order.garmentType ?? "—"}</div></div>
<div><div class="label">Garment Style</div><div class="value">${order.garmentStyle ?? "—"}</div></div>
<div><div class="label">Compression Level</div><div class="value">${order.compressionLevel ?? "—"}</div></div>
<div><div class="label">Quantity</div><div class="value">${order.quantity ?? "—"}</div></div>
<div><div class="label">Custom Made</div><div class="value">${order.customMade === true ? "Yes" : order.customMade === false ? "No" : "—"}</div></div>
<div><div class="label">Manufacturer Preference</div><div class="value">${order.manufacturerPreference ?? "—"}</div></div>
</div></div>
<div class="section"><div class="section-title">Treatment Protocol</div>
<div class="grid">
<div><div class="label">Times Per Day</div><div class="value">${order.timesPerDay ?? "—"}</div></div>
<div><div class="label">Minutes Per Session</div><div class="value">${order.minutesPerSession ?? "—"}</div></div>
</div></div>
<div class="footer">
  <div>Submitted: ${order.submittedAt ? new Date(order.submittedAt).toLocaleString() : "Pending"}</div>
  <div>Generated: ${new Date().toLocaleString()}</div>
</div>
</body></html>`;

      const pw = window.open("", "_blank", "width=800,height=600");
      if (!pw) return;
      pw.document.write(html);
      pw.document.close();
      pw.focus();
      setTimeout(() => { pw.print(); pw.close(); }, 300);
    } catch (err) {
      console.error("Failed to load order for PDF:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={() => void handleClick()}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      PDF
    </button>
  );
}
