"use client";

import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/apiClient";

export type LymphedemaFormData = {
  insurance: string;
  placeOfService: string;
  firstName: string;
  lastName: string;
  dob: string;
  mrn: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  diagnosis: string[];
  conservativeTherapy: "yes" | "no" | "";
  skinChanges: string[];
  extremity: string[];
  measurements: Record<string, string>;
  device: string;
  hcpcs: string;
  deviceRecommended: boolean;
  garmentType: string;
  garmentStyle: string;
  compressionLevel: string;
  quantity: string;
  customMade: "yes" | "no" | "";
  manufacturerPreference: string;
  distalPressureMmhg: string;
  timesPerDay: string;
  minutesPerSession: string;
  signatureMode?: "digital" | "manual";
  signatureDataUrl?: string;
  physicianName?: string;
  physicianPhone?: string;
  physicianNpi?: string;
};

const s = StyleSheet.create({
  page: { padding: 28, fontSize: 8, fontFamily: "Helvetica" },
  sectionHeader: {
    backgroundColor: "#000",
    color: "#fff",
    padding: "3 6",
    fontSize: 9,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  subHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
    fontSize: 9,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
    paddingBottom: 2,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  cell: { flexDirection: "row", alignItems: "center", marginRight: 12 },
  labelText: { fontSize: 8, marginRight: 4 },
  valueText: { fontSize: 8, fontWeight: "bold" },
  fieldRow: { flexDirection: "row", marginBottom: 3 },
  fieldLabel: { fontSize: 7, color: "#555", marginRight: 4 },
  fieldValue: {
    fontSize: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
    borderBottomStyle: "solid",
    flex: 1,
    paddingBottom: 1,
    minHeight: 10,
  },
  checkboxOuter: {
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    marginRight: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxFill: {
    width: 5,
    height: 5,
    backgroundColor: "#000",
  },
  radioOuter: {
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    borderRadius: 4,
    marginRight: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  radioFill: {
    width: 5,
    height: 5,
    backgroundColor: "#000",
    borderRadius: 2.5,
  },
  sigBox: {
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    height: 50,
    marginTop: 4,
    padding: 4,
  },
  footer: {
    fontSize: 7,
    color: "#555",
    textAlign: "center",
    marginTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#999",
    borderTopStyle: "solid",
    paddingTop: 4,
  },
});

function PdfCheckbox({
  checked,
  label,
}: {
  checked: boolean;
  label: string;
}) {
  return (
    <View style={s.cell}>
      <View style={s.checkboxOuter}>
        {checked && <View style={s.checkboxFill} />}
      </View>
      <Text style={{ fontSize: 8 }}>{label}</Text>
    </View>
  );
}

function PdfRadio({
  checked,
  label,
}: {
  checked: boolean;
  label: string;
}) {
  return (
    <View style={s.cell}>
      <View style={s.radioOuter}>
        {checked && <View style={s.radioFill} />}
      </View>
      <Text style={{ fontSize: 8 }}>{label}</Text>
    </View>
  );
}

function SectionHeader({ children }: { children: string }) {
  return <Text style={s.sectionHeader}>{children}</Text>;
}

function SubHeader({ children }: { children: string }) {
  return <Text style={s.subHeader}>{children}</Text>;
}

function FieldLine({
  label,
  value,
  flex,
}: {
  label: string;
  value?: string;
  flex?: number;
}) {
  return (
    <View style={[s.fieldRow, flex !== undefined ? { flex } : {}]}>
      <Text style={s.fieldLabel}>{label}: </Text>
      <Text style={s.fieldValue}>{value ?? ""}</Text>
    </View>
  );
}

function hasLeg(extremity: string[]): boolean {
  return extremity.some(
    (e) => e === "Left Leg" || e === "Right Leg" || e === "Bilateral Legs",
  );
}

function hasArm(extremity: string[]): boolean {
  return extremity.some((e) => e === "Left Arm" || e === "Right Arm");
}

function garmentMatches(
  data: LymphedemaFormData,
  category: string,
  label: string,
): boolean {
  return data.garmentType === category && data.garmentStyle === label;
}

function compressionLevelMatches(
  data: LymphedemaFormData,
  level: string,
): boolean {
  const cl = data.compressionLevel.toLowerCase();
  if (level === "CL I")
    return cl.includes("cl1") || cl.includes("cl i") || cl.includes("20");
  if (level === "CL II")
    return cl.includes("clii") || cl.includes("cl ii") || cl.includes("30");
  if (level === "CL III")
    return cl.includes("cliii") || cl.includes("cl iii") || cl.includes("40");
  return false;
}

export function ReMarxOrderDocument({ data }: { data: LymphedemaFormData }) {
  const orderDate = new Date().toLocaleDateString("en-US");
  const legSelected = hasLeg(data.extremity);
  const armSelected = hasArm(data.extremity);

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* 1. Header */}
        <View style={{ marginBottom: 6 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 2,
            }}
          >
            COMPRESSION ORDER FORM / STANDARD WRITTEN ORDER
          </Text>
          <Text
            style={{ fontSize: 9, textAlign: "center", marginBottom: 1 }}
          >
            ReMarx Services, Inc.
          </Text>
          <Text
            style={{
              fontSize: 8,
              textAlign: "center",
              color: "#555",
              marginBottom: 4,
            }}
          >
            Fax: 888.673.6279
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <Text style={{ fontSize: 8, fontWeight: "bold", marginRight: 8 }}>
              SELECT PRODUCT:
            </Text>
            <PdfCheckbox checked label="PUMP" />
            <PdfCheckbox checked label="GARMENT" />
          </View>
        </View>

        {/* 2. Order Information */}
        <SectionHeader>ORDER INFORMATION</SectionHeader>
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 2 }}>
          <FieldLine
            label="Patient Full Name"
            value={`${data.firstName} ${data.lastName}`}
            flex={2}
          />
          <FieldLine label="Order Date" value={orderDate} flex={1} />
        </View>

        {/* 3. Compression Pump Order */}
        <SectionHeader>COMPRESSION PUMP ORDER</SectionHeader>
        <View style={s.row}>
          <Text style={{ fontSize: 8, marginRight: 8 }}>
            Contraindications present?
          </Text>
          <PdfRadio checked={false} label="YES" />
          <PdfRadio checked label="NO" />
        </View>

        {/* 4. Diagnosis Code */}
        <SubHeader>Diagnosis Code (ICD 10)</SubHeader>
        <View style={s.row}>
          <PdfCheckbox
            checked={data.diagnosis.includes("i89.0")}
            label="I89.0 — Lymphedema"
          />
          <PdfCheckbox
            checked={data.diagnosis.includes("q82.0")}
            label="Q82.0 — Hereditary Lymphedema"
          />
          <PdfCheckbox
            checked={data.diagnosis.includes("i97.2")}
            label="I97.2 — Post-mastectomy Lymphedema"
          />
        </View>

        {/* 5. Select Pump Type */}
        <SubHeader>Select Pump Type</SubHeader>
        {/* E0651 */}
        <View style={{ marginBottom: 4 }}>
          <PdfRadio checked={data.hcpcs === "E0651"} label="E0651" />
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginLeft: 16,
              marginTop: 2,
            }}
          >
            <PdfCheckbox
              checked={data.hcpcs === "E0651" && legSelected}
              label="Full Leg"
            />
            <PdfCheckbox
              checked={
                data.hcpcs === "E0651" &&
                data.extremity.includes("Left Leg")
              }
              label="Left Leg"
            />
            <PdfCheckbox
              checked={
                data.hcpcs === "E0651" &&
                data.extremity.includes("Right Leg")
              }
              label="Right Leg"
            />
            <PdfCheckbox
              checked={
                data.hcpcs === "E0651" &&
                data.extremity.includes("Bilateral Legs")
              }
              label="Bilateral"
            />
            <PdfCheckbox
              checked={
                data.hcpcs === "E0651" &&
                data.extremity.includes("Left Arm")
              }
              label="Arm Left"
            />
            <PdfCheckbox
              checked={
                data.hcpcs === "E0651" &&
                data.extremity.includes("Right Arm")
              }
              label="Arm Right"
            />
          </View>
        </View>

        {/* E0652 */}
        <View style={{ marginBottom: 4 }}>
          <PdfRadio checked={data.hcpcs === "E0652"} label="E0652" />
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginLeft: 16,
              marginTop: 2,
            }}
          >
            <PdfCheckbox
              checked={data.hcpcs === "E0652" && legSelected}
              label="Full Leg"
            />
            <PdfCheckbox
              checked={
                data.hcpcs === "E0652" &&
                data.extremity.includes("Left Leg")
              }
              label="Left Leg"
            />
            <PdfCheckbox
              checked={
                data.hcpcs === "E0652" &&
                data.extremity.includes("Right Leg")
              }
              label="Right Leg"
            />
            <PdfCheckbox
              checked={
                data.hcpcs === "E0652" &&
                data.extremity.includes("Bilateral Legs")
              }
              label="Bilateral"
            />
            <PdfCheckbox
              checked={
                data.hcpcs === "E0652" &&
                data.extremity.includes("Left Arm")
              }
              label="Arm Left"
            />
            <PdfCheckbox
              checked={
                data.hcpcs === "E0652" &&
                data.extremity.includes("Right Arm")
              }
              label="Arm Right"
            />
            <PdfCheckbox checked={false} label="Pant System" />
            <PdfCheckbox checked={false} label="Arm Plus Left" />
            <PdfCheckbox checked={false} label="Arm Plus Right" />
          </View>
        </View>

        {/* 6. Treatment Protocol */}
        <SubHeader>Treatment Protocol</SubHeader>
        <View style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 7, fontWeight: "bold", marginBottom: 2 }}>
            mmHg Distal Pressure
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {["65", "60", "55", "50", "45", "40", "35", "30"].map((v) => (
              <PdfRadio
                key={v}
                checked={data.distalPressureMmhg === v}
                label={v}
              />
            ))}
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 24, marginBottom: 4 }}>
          <View>
            <Text
              style={{ fontSize: 7, fontWeight: "bold", marginBottom: 2 }}
            >
              Times Per Day
            </Text>
            <View style={{ flexDirection: "row" }}>
              {["1", "2", "3"].map((v) => (
                <PdfRadio
                  key={v}
                  checked={data.timesPerDay === v}
                  label={v}
                />
              ))}
            </View>
          </View>
          <View>
            <Text
              style={{ fontSize: 7, fontWeight: "bold", marginBottom: 2 }}
            >
              Minutes Per Session
            </Text>
            <View style={{ flexDirection: "row" }}>
              {["15", "30", "45", "60"].map((v) => (
                <PdfRadio
                  key={v}
                  checked={data.minutesPerSession === v}
                  label={v}
                />
              ))}
            </View>
          </View>
        </View>

        {/* 7. Garment Order */}
        <SectionHeader>GARMENT ORDER</SectionHeader>
        <View style={{ flexDirection: "row", gap: 24, marginBottom: 4 }}>
          {/* Lower Extremity */}
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 8, fontWeight: "bold", marginBottom: 3 }}
            >
              Lower Extremity
            </Text>
            <Text
              style={{
                fontSize: 7,
                fontWeight: "bold",
                marginBottom: 2,
                textDecoration: "underline",
              }}
            >
              Stockings
            </Text>
            <PdfCheckbox
              checked={garmentMatches(data, "Stockings", "Below Knee")}
              label="Below Knee"
            />
            <PdfCheckbox
              checked={garmentMatches(data, "Stockings", "Thigh")}
              label="Thigh"
            />
            <PdfCheckbox
              checked={garmentMatches(data, "Stockings", "Pantyhose")}
              label="Pantyhose"
            />
            <Text
              style={{
                fontSize: 7,
                fontWeight: "bold",
                marginBottom: 2,
                marginTop: 4,
                textDecoration: "underline",
              }}
            >
              Garments
            </Text>
            <PdfCheckbox
              checked={garmentMatches(data, "Garments", "Foot")}
              label="Foot"
            />
            <PdfCheckbox
              checked={garmentMatches(data, "Garments", "Calf")}
              label="Calf"
            />
            <PdfCheckbox
              checked={garmentMatches(data, "Garments", "Knee")}
              label="Knee"
            />
            <PdfCheckbox
              checked={garmentMatches(data, "Garments", "Thigh")}
              label="Thigh"
            />
            <PdfCheckbox
              checked={garmentMatches(data, "Garments", "Full Leg")}
              label="Full Leg"
            />
            <PdfCheckbox
              checked={
                garmentMatches(data, "Garments", "Full Leg w/ Foot")
              }
              label="Full Leg w/ Foot"
            />
          </View>

          {/* Upper Extremity */}
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 8, fontWeight: "bold", marginBottom: 3 }}
            >
              Upper Extremity
            </Text>
            <Text
              style={{
                fontSize: 7,
                fontWeight: "bold",
                marginBottom: 2,
                textDecoration: "underline",
              }}
            >
              Gloves &amp; Sleeves
            </Text>
            <PdfCheckbox
              checked={garmentMatches(
                data,
                "Gloves & Sleeves",
                "Gauntlet",
              )}
              label="Gauntlet"
            />
            <PdfCheckbox
              checked={garmentMatches(
                data,
                "Gloves & Sleeves",
                "Glove",
              )}
              label="Glove"
            />
            <PdfCheckbox
              checked={garmentMatches(
                data,
                "Gloves & Sleeves",
                "Glove Sleeve Combo",
              )}
              label="Glove Sleeve Combo"
            />
            <PdfCheckbox
              checked={garmentMatches(
                data,
                "Gloves & Sleeves",
                "Arm Sleeve",
              )}
              label="Arm Sleeve"
            />
            <Text
              style={{
                fontSize: 7,
                fontWeight: "bold",
                marginBottom: 2,
                marginTop: 4,
                textDecoration: "underline",
              }}
            >
              Wraps
            </Text>
            <PdfCheckbox
              checked={garmentMatches(data, "Wraps", "Hand Velcro Wrap")}
              label="Hand Velcro Wrap"
            />
            <PdfCheckbox
              checked={garmentMatches(data, "Wraps", "Arm Wrap")}
              label="Arm Wrap"
            />
            <Text
              style={{
                fontSize: 7,
                fontWeight: "bold",
                marginBottom: 2,
                marginTop: 4,
                textDecoration: "underline",
              }}
            >
              Garments
            </Text>
            <PdfCheckbox
              checked={garmentMatches(data, "Garments", "Glove")}
              label="Glove"
            />
            <PdfCheckbox
              checked={garmentMatches(
                data,
                "Garments",
                "Fingertips to Axilla",
              )}
              label="Fingertips to Axilla"
            />
            <PdfCheckbox
              checked={garmentMatches(
                data,
                "Garments",
                "Wrist to Axilla",
              )}
              label="Wrist to Axilla"
            />
          </View>
        </View>

        {/* 8. Garment Requirements */}
        <SubHeader>Garment Requirements</SubHeader>
        <View style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 7, fontWeight: "bold", marginBottom: 2 }}>
            Compression Level
          </Text>
          <View style={{ flexDirection: "row" }}>
            <PdfRadio
              checked={compressionLevelMatches(data, "CL I")}
              label="CL I"
            />
            <PdfRadio
              checked={compressionLevelMatches(data, "CL II")}
              label="CL II"
            />
            <PdfRadio
              checked={compressionLevelMatches(data, "CL III")}
              label="CL III"
            />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 24, marginBottom: 4 }}>
          <View>
            <Text
              style={{ fontSize: 7, fontWeight: "bold", marginBottom: 2 }}
            >
              Quantity per Extremity
            </Text>
            <View style={{ flexDirection: "row" }}>
              {["1", "2", "3"].map((v) => (
                <PdfRadio
                  key={v}
                  checked={data.quantity === v}
                  label={v}
                />
              ))}
            </View>
          </View>
          <View>
            <Text
              style={{ fontSize: 7, fontWeight: "bold", marginBottom: 2 }}
            >
              Custom Made
            </Text>
            <View style={{ flexDirection: "row" }}>
              <PdfRadio checked={data.customMade === "no"} label="NO" />
              <PdfRadio checked={data.customMade === "yes"} label="YES" />
            </View>
          </View>
        </View>
        <View style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 7, fontWeight: "bold", marginBottom: 2 }}>
            Manufacturer Preference
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {[
              "Medi USA",
              "BSN Jobst/Farrow",
              "L&R",
              "Juzo",
              "Sigvaris",
              "No Preference",
            ].map((m) => (
              <PdfRadio
                key={m}
                checked={data.manufacturerPreference === m}
                label={m}
              />
            ))}
          </View>
        </View>

        {/* 9. Physician Information */}
        <SectionHeader>PHYSICIAN INFORMATION</SectionHeader>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
          <View style={{ flex: 2 }}>
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Physician Name: </Text>
              <Text style={s.fieldValue}>
                {data.physicianName ?? ""}
              </Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Phone: </Text>
              <Text style={s.fieldValue}>
                {data.physicianPhone ?? ""}
              </Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>NPI: </Text>
              <Text style={s.fieldValue}>
                {data.physicianNpi ?? ""}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 2 }}>
            <Text
              style={{ fontSize: 7, fontWeight: "bold", marginBottom: 2 }}
            >
              Physician Signature
            </Text>
            <View style={s.sigBox}>
              {data.signatureMode === "digital" &&
                data.signatureDataUrl && (
                  <Image
                    src={data.signatureDataUrl}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                )}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 7, fontWeight: "bold", marginBottom: 2 }}
            >
              Date
            </Text>
            <View
              style={[
                s.sigBox,
                {
                  justifyContent: "center",
                  alignItems: "center",
                  height: 50,
                },
              ]}
            >
              <Text style={{ fontSize: 10 }}>{orderDate}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={s.footer}>
          ReMarx Services Inc. — Fax: 888.673.6279 — www.remarx.com
        </Text>
      </Page>
    </Document>
  );
}

type LymphedemaOrderForPdf = {
  id: string;
  status: string;
  patient: {
    firstName?: string;
    lastName?: string;
    dob?: string;
    mrn?: string;
  } | null;
  insurance: string | null;
  placeOfService: string | null;
  diagnosis: string[] | null;
  extremity: string[] | null;
  measurements: Record<string, string> | null;
  device: string | null;
  hcpcs: string | null;
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
  createdAt: string | null;
};

function orderToFormData(order: LymphedemaOrderForPdf): LymphedemaFormData {
  return {
    insurance: order.insurance ?? "",
    placeOfService: order.placeOfService ?? "",
    firstName: order.patient?.firstName ?? "",
    lastName: order.patient?.lastName ?? "",
    dob: order.patient?.dob ?? "",
    mrn: order.patient?.mrn ?? "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    diagnosis: order.diagnosis ?? [],
    conservativeTherapy: "",
    skinChanges: [],
    extremity: order.extremity ?? [],
    measurements: order.measurements ?? {},
    device: order.device ?? "",
    hcpcs: order.hcpcs ?? "",
    deviceRecommended: true,
    garmentType: order.garmentType ?? "",
    garmentStyle: order.garmentStyle ?? "",
    compressionLevel: order.compressionLevel ?? "",
    quantity: order.quantity != null ? String(order.quantity) : "",
    customMade: order.customMade === true ? "yes" : order.customMade === false ? "no" : "",
    manufacturerPreference: order.manufacturerPreference ?? "",
    distalPressureMmhg: order.distalPressureMmhg != null ? String(order.distalPressureMmhg) : "",
    timesPerDay: order.timesPerDay != null ? String(order.timesPerDay) : "",
    minutesPerSession: order.minutesPerSession != null ? String(order.minutesPerSession) : "",
  };
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
      const res = await apiGet<{
        success: true;
        data: LymphedemaOrderForPdf;
      }>(`/api/lymphedema-orders/${orderId}`, { token });
      const order = res.data;
      const formData = orderToFormData(order);
      if (clinicName) formData.physicianName = clinicName;

      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(<ReMarxOrderDocument data={formData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const lastName = order.patient?.lastName ?? "Unknown";
      const firstName = order.patient?.firstName ?? "";
      const date = new Date().toISOString().slice(0, 10);
      a.download = `ReMarx_Order_${lastName}_${firstName}_${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
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
