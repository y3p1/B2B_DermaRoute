import { getSupabaseAdminClient } from "./supabaseAdmin";

export type BaaSignatureType = "covered_entity" | "business_associate";

const BUCKET = "baa-signatures";

function signatureFileName(type: BaaSignatureType): string {
  return type === "covered_entity"
    ? "covered-entity.png"
    : "business-associate.png";
}

export function buildBaaSignatureKey(
  providerAcctId: string,
  baaId: string,
  type: BaaSignatureType,
): string {
  return `baa/provider/${providerAcctId}/${baaId}/signatures/${signatureFileName(type)}`;
}

function parseImageDataUrl(dataUrl: string): {
  contentType: string;
  bytes: Uint8Array;
} {
  const trimmed = (dataUrl || "").trim();
  const m = /^data:(image\/(png|jpeg));base64,([A-Za-z0-9+/=\s]+)$/.exec(
    trimmed,
  );
  if (!m) {
    throw new Error(
      "Invalid signature data URL (expected base64-encoded PNG/JPEG)",
    );
  }

  const contentType = m[1];
  const base64 = m[3].replace(/\s+/g, "");

  // Basic size guard: base64 expands ~4/3. This caps decoded bytes to ~512KB.
  const approxBytes = Math.floor((base64.length * 3) / 4);
  if (approxBytes > 512 * 1024) {
    throw new Error("Signature image is too large");
  }

  const bytes = Buffer.from(base64, "base64");
  return { contentType, bytes };
}

export async function uploadBaaSignatureFromDataUrl(options: {
  providerAcctId: string;
  baaId: string;
  type: BaaSignatureType;
  dataUrl: string;
}): Promise<{ bucket: string; key: string }> {
  const supabase = getSupabaseAdminClient();

  const { contentType, bytes } = parseImageDataUrl(options.dataUrl);
  const key = buildBaaSignatureKey(
    options.providerAcctId,
    options.baaId,
    options.type,
  );

  const { error } = await supabase.storage.from(BUCKET).upload(key, bytes, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(error.message || "Failed to upload signature");
  }

  return { bucket: BUCKET, key };
}
