import { ImageResponse } from "next/og";

export const alt = "DermaRoute — B2B Wound Care Procurement Portal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "edge";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fafafa 0%, #e8f5e9 100%)",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #E8724A, #C5573A)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "36px",
              fontWeight: 700,
            }}
          >
            D
          </div>
          <div style={{ fontSize: "48px", fontWeight: 700, color: "#1a1520" }}>
            Derma
            <span style={{ color: "#E8724A" }}>Route</span>
          </div>
        </div>

        <div
          style={{
            fontSize: "24px",
            color: "#555",
            maxWidth: "700px",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          B2B Wound Care Procurement Portal
        </div>

        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "40px",
            fontSize: "16px",
            color: "#777",
          }}
        >
          <span>Benefit Verification</span>
          <span>•</span>
          <span>Product Ordering</span>
          <span>•</span>
          <span>AI Policy Assistant</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
