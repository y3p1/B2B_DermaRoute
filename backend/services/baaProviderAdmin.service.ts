import { desc, eq } from "drizzle-orm";

import { baaProvider, providerAcct } from "../../db/schema";
import { getSupabaseAdminClient } from "./supabaseAdmin";
import { getDb } from "./db";
import { uploadBaaSignatureFromDataUrl } from "./baaSignatureStorage.service";
import { sendBaaStatusNotificationToProvider } from "./sendgrid.service";

const SIGNATURE_BUCKET = "baa-signatures";

async function createSignedUrl(key: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();

  console.log(
    `[createSignedUrl] Attempting to create signed URL for key: ${key} in bucket: ${SIGNATURE_BUCKET}`,
  );

  const { data, error } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .createSignedUrl(key, 60 * 60);

  if (error) {
    console.error(`[createSignedUrl] Error creating signed URL:`, error);
    return null;
  }

  if (!data?.signedUrl) {
    console.error(`[createSignedUrl] No signed URL returned for key: ${key}`);
    return null;
  }

  console.log(
    `[createSignedUrl] Successfully created signed URL for key: ${key}`,
  );
  return data.signedUrl;
}

export async function listBaaProvidersForAdmin() {
  const db = getDb();

  return db
    .select({
      id: baaProvider.id,
      createdAt: baaProvider.createdAt,
      updatedAt: baaProvider.updatedAt,
      status: baaProvider.status,
      providerAcctId: baaProvider.providerAcctId,

      coveredEntity: baaProvider.coveredEntity,
      coveredEntityName: baaProvider.coveredEntityName,
      coveredEntityTitle: baaProvider.coveredEntityTitle,
      coveredEntityDate: baaProvider.coveredEntityDate,

      businessAssociateName: baaProvider.businessAssociateName,
      businessAssociateTitle: baaProvider.businessAssociateTitle,
      businessAssociateDate: baaProvider.businessAssociateDate,
      businessAssociateSignature: baaProvider.businessAssociateSignature,

      statusUpdatedAt: baaProvider.statusUpdatedAt,
      statusUpdatedByUserId: baaProvider.statusUpdatedByUserId,
      statusUpdatedByRole: baaProvider.statusUpdatedByRole,

      clinicName: providerAcct.clinicName,
      providerEmail: providerAcct.email,
    })
    .from(baaProvider)
    .leftJoin(providerAcct, eq(baaProvider.providerAcctId, providerAcct.id))
    .orderBy(desc(baaProvider.createdAt));
}

export async function listBaaProvidersForProvider(providerAcctId: string) {
  const db = getDb();

  return db
    .select({
      id: baaProvider.id,
      createdAt: baaProvider.createdAt,
      updatedAt: baaProvider.updatedAt,
      status: baaProvider.status,
      providerAcctId: baaProvider.providerAcctId,

      coveredEntity: baaProvider.coveredEntity,
      coveredEntityName: baaProvider.coveredEntityName,
      coveredEntityTitle: baaProvider.coveredEntityTitle,
      coveredEntityDate: baaProvider.coveredEntityDate,

      businessAssociateName: baaProvider.businessAssociateName,
      businessAssociateTitle: baaProvider.businessAssociateTitle,
      businessAssociateDate: baaProvider.businessAssociateDate,
      businessAssociateSignature: baaProvider.businessAssociateSignature,

      statusUpdatedAt: baaProvider.statusUpdatedAt,
      statusUpdatedByUserId: baaProvider.statusUpdatedByUserId,
      statusUpdatedByRole: baaProvider.statusUpdatedByRole,

      clinicName: providerAcct.clinicName,
      providerEmail: providerAcct.email,
    })
    .from(baaProvider)
    .leftJoin(providerAcct, eq(baaProvider.providerAcctId, providerAcct.id))
    .where(eq(baaProvider.providerAcctId, providerAcctId))
    .orderBy(desc(baaProvider.createdAt));
}

export async function getBaaProviderForAdmin(id: string) {
  const db = getDb();

  const rows = await db
    .select({
      id: baaProvider.id,
      createdAt: baaProvider.createdAt,
      updatedAt: baaProvider.updatedAt,
      status: baaProvider.status,
      providerAcctId: baaProvider.providerAcctId,

      coveredEntity: baaProvider.coveredEntity,
      coveredEntityName: baaProvider.coveredEntityName,
      coveredEntityTitle: baaProvider.coveredEntityTitle,
      coveredEntityDate: baaProvider.coveredEntityDate,
      coveredEntitySignature: baaProvider.coveredEntitySignature,

      businessAssociateName: baaProvider.businessAssociateName,
      businessAssociateTitle: baaProvider.businessAssociateTitle,
      businessAssociateDate: baaProvider.businessAssociateDate,
      businessAssociateSignature: baaProvider.businessAssociateSignature,

      statusUpdatedByAdminId: baaProvider.statusUpdatedByAdminId,
      statusUpdatedByUserId: baaProvider.statusUpdatedByUserId,
      statusUpdatedByRole: baaProvider.statusUpdatedByRole,
      statusUpdatedAt: baaProvider.statusUpdatedAt,

      clinicName: providerAcct.clinicName,
      providerEmail: providerAcct.email,
    })
    .from(baaProvider)
    .leftJoin(providerAcct, eq(baaProvider.providerAcctId, providerAcct.id))
    .where(eq(baaProvider.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  console.log(`[getBaaProviderForAdmin] Row data:`, {
    id: row.id,
    coveredEntitySignature: row.coveredEntitySignature,
    businessAssociateSignature: row.businessAssociateSignature,
  });

  const businessAssociateSignatureUrl = row.businessAssociateSignature
    ? await createSignedUrl(row.businessAssociateSignature)
    : null;

  const coveredEntitySignatureUrl = row.coveredEntitySignature
    ? await createSignedUrl(row.coveredEntitySignature)
    : null;

  console.log(`[getBaaProviderForAdmin] Generated URLs:`, {
    businessAssociateSignatureUrl,
    coveredEntitySignatureUrl,
  });

  return {
    ...row,
    businessAssociateSignatureUrl,
    coveredEntitySignatureUrl,
  };
}

export async function updateBusinessAssociateSignature(options: {
  baaId: string;
  approverUserId: string;
  approverRole: "admin" | "clinic_staff";
  adminAcctId?: string;
  businessAssociateName: string;
  businessAssociateTitle: string;
  businessAssociateDate: string;
  businessAssociateSignatureDataUrl: string;
}) {
  const db = getDb();

  const existing = await db
    .select({ id: baaProvider.id, providerAcctId: baaProvider.providerAcctId })
    .from(baaProvider)
    .where(eq(baaProvider.id, options.baaId))
    .limit(1);

  const row = existing[0];
  if (!row) return null;

  const uploaded = await uploadBaaSignatureFromDataUrl({
    providerAcctId: row.providerAcctId,
    baaId: options.baaId,
    type: "business_associate",
    dataUrl: options.businessAssociateSignatureDataUrl,
  });

  const updatedAt = new Date();

  await db
    .update(baaProvider)
    .set({
      businessAssociateName: options.businessAssociateName,
      businessAssociateTitle: options.businessAssociateTitle,
      businessAssociateDate: options.businessAssociateDate,
      businessAssociateSignature: uploaded.key,
      status: "approved",
      statusUpdatedByAdminId: options.adminAcctId,
      statusUpdatedByUserId: options.approverUserId,
      statusUpdatedByRole: options.approverRole,
      statusUpdatedAt: updatedAt,
      updatedAt: updatedAt,
    })
    .where(eq(baaProvider.id, options.baaId));

  const updated = await getBaaProviderForAdmin(options.baaId);

  // Notify provider asynchronously — fire and forget
  if (updated?.providerEmail) {
    (async () => {
      try {
        await sendBaaStatusNotificationToProvider(updated.providerEmail!, {
          baaId: options.baaId,
          clinicName: updated.clinicName || "Unknown Clinic",
          coveredEntityName: updated.coveredEntityName,
          coveredEntityTitle: updated.coveredEntityTitle,
          status: "approved",
          updatedAt: updatedAt.toISOString(),
        });
        console.log(
          `✅ [BAA Status Email] Approval notification sent to provider ${updated.providerEmail}`,
        );
      } catch (emailErr) {
        console.error(
          `❌ [BAA Status Email] Failed to send approval notification to provider ${updated.providerEmail}:`,
          emailErr,
        );
      }
    })();
  }

  return updated;
}
