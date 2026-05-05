import { z } from "zod";
import { desc, eq, and } from "drizzle-orm";

import { bvRequests } from "../../db/bv-requests";
import { providerAcct } from "../../db/provider";
import { getDb } from "./db";

export const createBvRequestSchema = z.object({
  provider: z.string().min(1),
  placeOfService: z.string().min(1),
  insurance: z.string().min(1),
  woundType: z.string().min(1),
  woundSize: z.string().min(1),
  woundLocation: z.string().optional(),
  icd10: z.string().optional(),
  conservativeTherapy: z.boolean(),
  diabetic: z.boolean(),
  a1cPercent: z.number().min(0).max(25).optional(),
  a1cMeasuredAt: z.string().optional(),
  tunneling: z.boolean(),
  infected: z.boolean(),
  initials: z.string().min(1),
  applicationDate: z.string().min(1),
  deliveryDate: z.string().min(1),
  instructions: z.string().optional(),
});

export type CreateBvRequestInput = z.infer<typeof createBvRequestSchema>;

export async function getProviderProfileByUserId(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(providerAcct)
    .where(eq(providerAcct.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

export async function listBvRequestsForProvider(providerId: string) {
  const db = getDb();

  const rows = await db
    .select({
      id: bvRequests.id,
      createdAt: bvRequests.createdAt,
      status: bvRequests.status,
      provider: bvRequests.provider,
      placeOfService: bvRequests.placeOfService,
      insurance: bvRequests.insurance,
      woundType: bvRequests.woundType,
      woundSize: bvRequests.woundSize,
      woundLocation: bvRequests.woundLocation,
      initials: bvRequests.initials,
      icd10: bvRequests.icd10,
      applicationDate: bvRequests.applicationDate,
      deliveryDate: bvRequests.deliveryDate,
      practice: providerAcct.clinicName,
      proofStatus: bvRequests.proofStatus,
      approvalProofUrl: bvRequests.approvalProofUrl,
    })
    .from(bvRequests)
    .leftJoin(providerAcct, eq(bvRequests.providerId, providerAcct.id))
    .where(eq(bvRequests.providerId, providerId))
    .orderBy(desc(bvRequests.createdAt), bvRequests.id);

  return rows;
}

export async function listAllBvRequests() {
  const db = getDb();

  const rows = await db
    .select({
      id: bvRequests.id,
      createdAt: bvRequests.createdAt,
      status: bvRequests.status,
      provider: bvRequests.provider,
      placeOfService: bvRequests.placeOfService,
      insurance: bvRequests.insurance,
      woundType: bvRequests.woundType,
      woundSize: bvRequests.woundSize,
      woundLocation: bvRequests.woundLocation,
      initials: bvRequests.initials,
      icd10: bvRequests.icd10,
      applicationDate: bvRequests.applicationDate,
      deliveryDate: bvRequests.deliveryDate,
      practice: providerAcct.clinicName,
      proofStatus: bvRequests.proofStatus,
      approvalProofUrl: bvRequests.approvalProofUrl,
    })
    .from(bvRequests)
    .leftJoin(providerAcct, eq(bvRequests.providerId, providerAcct.id))
    .orderBy(desc(bvRequests.createdAt), bvRequests.id);

  return rows;
}

export async function getBvRequestForProvider(providerId: string, id: string) {
  const db = getDb();

  const rows = await db
    .select({
      id: bvRequests.id,
      createdAt: bvRequests.createdAt,
      status: bvRequests.status,
      provider: bvRequests.provider,
      placeOfService: bvRequests.placeOfService,
      insurance: bvRequests.insurance,
      woundType: bvRequests.woundType,
      woundSize: bvRequests.woundSize,
      woundLocation: bvRequests.woundLocation,
      icd10: bvRequests.icd10,
      conservativeTherapy: bvRequests.conservativeTherapy,
      diabetic: bvRequests.diabetic,
      a1cPercent: bvRequests.a1cPercent,
      a1cMeasuredAt: bvRequests.a1cMeasuredAt,
      tunneling: bvRequests.tunneling,
      infected: bvRequests.infected,
      initials: bvRequests.initials,
      applicationDate: bvRequests.applicationDate,
      deliveryDate: bvRequests.deliveryDate,
      instructions: bvRequests.instructions,
      practice: providerAcct.clinicName,
      providerId: bvRequests.providerId,
      proofStatus: bvRequests.proofStatus,
      approvalProofUrl: bvRequests.approvalProofUrl,
    })
    .from(bvRequests)
    .leftJoin(providerAcct, eq(bvRequests.providerId, providerAcct.id))
    .where(and(eq(bvRequests.providerId, providerId), eq(bvRequests.id, id)))
    .limit(1);

  return rows[0] ?? null;
}

export async function getBvRequestById(id: string) {
  const db = getDb();

  const rows = await db
    .select({
      id: bvRequests.id,
      createdAt: bvRequests.createdAt,
      status: bvRequests.status,
      provider: bvRequests.provider,
      placeOfService: bvRequests.placeOfService,
      insurance: bvRequests.insurance,
      woundType: bvRequests.woundType,
      woundSize: bvRequests.woundSize,
      woundLocation: bvRequests.woundLocation,
      icd10: bvRequests.icd10,
      conservativeTherapy: bvRequests.conservativeTherapy,
      diabetic: bvRequests.diabetic,
      a1cPercent: bvRequests.a1cPercent,
      a1cMeasuredAt: bvRequests.a1cMeasuredAt,
      tunneling: bvRequests.tunneling,
      infected: bvRequests.infected,
      initials: bvRequests.initials,
      applicationDate: bvRequests.applicationDate,
      deliveryDate: bvRequests.deliveryDate,
      instructions: bvRequests.instructions,
      practice: providerAcct.clinicName,
      providerId: bvRequests.providerId,
      proofStatus: bvRequests.proofStatus,
      approvalProofUrl: bvRequests.approvalProofUrl,
    })
    .from(bvRequests)
    .leftJoin(providerAcct, eq(bvRequests.providerId, providerAcct.id))
    .where(eq(bvRequests.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function createBvRequest(
  providerId: string,
  input: CreateBvRequestInput,
) {
  const db = getDb();

  const inserted = await db
    .insert(bvRequests)
    .values({
      providerId,
      provider: input.provider,
      placeOfService: input.placeOfService,
      insurance: input.insurance,
      woundType: input.woundType,
      woundSize: input.woundSize,
      woundLocation: input.woundLocation,
      icd10: input.icd10,
      conservativeTherapy: input.conservativeTherapy,
      diabetic: input.diabetic,
      a1cPercent: input.a1cPercent != null ? String(input.a1cPercent) : null,
      a1cMeasuredAt: input.a1cMeasuredAt ?? null,
      tunneling: input.tunneling,
      infected: input.infected,
      initials: input.initials,
      applicationDate: input.applicationDate,
      deliveryDate: input.deliveryDate,
      instructions: input.instructions,
    })
    .returning({
      id: bvRequests.id,
      createdAt: bvRequests.createdAt,
      status: bvRequests.status,
    });

  return inserted[0];
}

export async function updateBvRequest(
  providerId: string,
  id: string,
  input: CreateBvRequestInput,
) {
  const db = getDb();

  const updated = await db
    .update(bvRequests)
    .set({
      provider: input.provider,
      placeOfService: input.placeOfService,
      insurance: input.insurance,
      woundType: input.woundType,
      woundSize: input.woundSize,
      woundLocation: input.woundLocation,
      icd10: input.icd10,
      conservativeTherapy: input.conservativeTherapy,
      diabetic: input.diabetic,
      a1cPercent: input.a1cPercent != null ? String(input.a1cPercent) : null,
      a1cMeasuredAt: input.a1cMeasuredAt ?? null,
      tunneling: input.tunneling,
      infected: input.infected,
      initials: input.initials,
      applicationDate: input.applicationDate,
      deliveryDate: input.deliveryDate,
      instructions: input.instructions,
    })
    .where(and(eq(bvRequests.providerId, providerId), eq(bvRequests.id, id)))
    .returning({
      id: bvRequests.id,
      createdAt: bvRequests.createdAt,
      status: bvRequests.status,
    });

  return updated[0] ?? null;
}

// For PATCH: approve/deny
export async function verifyBvRequest({
  id,
  status,
  verifiedBy,
  verifiedByType,
}: {
  id: string;
  status: "approved" | "rejected";
  verifiedBy: string;
  verifiedByType: "admin" | "clinic_staff";
}) {
  const db = getDb();
  const updated = await db
    .update(bvRequests)
    .set({ status, verifiedBy, verifiedByType })
    .where(eq(bvRequests.id, id))
    .returning({
      id: bvRequests.id,
      status: bvRequests.status,
      verifiedBy: bvRequests.verifiedBy,
      verifiedByType: bvRequests.verifiedByType,
    });
  return updated[0] ?? null;
}

/**
 * Get provider contact information (email, phone, clinicName) for a given BV request ID.
 * Used to send notifications after status changes.
 */
export async function getProviderContactByBvRequestId(bvRequestId: string) {
  const db = getDb();
  const rows = await db
    .select({
      email: providerAcct.email,
      accountPhone: providerAcct.accountPhone,
      clinicName: providerAcct.clinicName,
    })
    .from(bvRequests)
    .innerJoin(providerAcct, eq(bvRequests.providerId, providerAcct.id))
    .where(eq(bvRequests.id, bvRequestId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateBvRequestProof(
  id: string,
  providerId: string,
  approvalProofUrl: string
) {
  const db = getDb();

  const updated = await db
    .update(bvRequests)
    .set({
      approvalProofUrl,
      proofStatus: "pending_review",
      updatedAt: new Date(),
    })
    .where(and(eq(bvRequests.id, id), eq(bvRequests.providerId, providerId)))
    .returning({
      id: bvRequests.id,
      proofStatus: bvRequests.proofStatus,
      approvalProofUrl: bvRequests.approvalProofUrl,
    });

  return updated[0] ?? null;
}

export async function deleteBvRequest(id: string): Promise<boolean> {
  const db = getDb();
  const result = await db
    .delete(bvRequests)
    .where(eq(bvRequests.id, id))
    .returning({ id: bvRequests.id });
  return result.length > 0;
}

export async function verifyBvRequestProof({
  id,
  status,
  verifiedBy,
}: {
  id: string;
  status: "verified" | "rejected";
  verifiedBy: string;
}) {
  const db = getDb();
  const updated = await db
    .update(bvRequests)
    .set({
      proofStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(bvRequests.id, id))
    .returning({
      id: bvRequests.id,
      proofStatus: bvRequests.proofStatus,
      approvalProofUrl: bvRequests.approvalProofUrl,
    });
  return updated[0] ?? null;
}
