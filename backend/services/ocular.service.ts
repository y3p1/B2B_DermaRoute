import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { ocularOrders, providerAcct } from "../../db/schema";

const patientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string().min(1),
  mrn: z.string().optional(),
});

const shipToSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

export const createOcularOrderSchema = z.object({
  orderingProviderId: z.string().uuid().optional(),
  patient: patientSchema,
  primaryDiagnosis: z.string().min(1),
  secondaryDiagnosis: z.string().optional(),
  eye: z.enum(["right", "left", "bilateral"]),
  productVariant: z.enum(["thin", "thick"]),
  sizeMm: z.number().int().refine((v) => [8, 10, 12, 15].includes(v), { message: "Must be 8, 10, 12, or 15" }),
  sku: z.string().min(1),
  quantity: z.number().int().min(1),
  dateNeededBy: z.string().optional(),
  shipTo: shipToSchema.optional(),
  specialInstructions: z.string().optional(),
  insurancePayer: z.string().optional(),
  insuranceMemberId: z.string().optional(),
  ocularProductId: z.string().uuid().optional(),
});

export type CreateOcularOrderInput = z.infer<typeof createOcularOrderSchema>;

export async function createOcularOrder(
  input: CreateOcularOrderInput,
  providerId: string,
  submittedBy: string,
): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(ocularOrders)
    .values({
      providerId,
      submittedBy,
      orderingProviderId: input.orderingProviderId ?? null,
      patient: input.patient,
      primaryDiagnosis: input.primaryDiagnosis,
      secondaryDiagnosis: input.secondaryDiagnosis ?? null,
      eye: input.eye,
      productVariant: input.productVariant,
      sizeMm: input.sizeMm,
      sku: input.sku,
      quantity: input.quantity,
      dateNeededBy: input.dateNeededBy ?? null,
      shipTo: input.shipTo ?? null,
      specialInstructions: input.specialInstructions ?? null,
      insurancePayer: input.insurancePayer ?? null,
      insuranceMemberId: input.insuranceMemberId ?? null,
      ocularProductId: input.ocularProductId ?? null,
      status: "pending_review",
    })
    .returning({ id: ocularOrders.id });
  return row.id;
}

export async function getOcularOrders(filters?: { providerIds?: string[] }) {
  const db = getDb();
  const conditions = [];
  if (filters?.providerIds?.length) {
    conditions.push(inArray(ocularOrders.providerId, filters.providerIds));
  }

  return db
    .select({
      id: ocularOrders.id,
      status: ocularOrders.status,
      eye: ocularOrders.eye,
      productVariant: ocularOrders.productVariant,
      sizeMm: ocularOrders.sizeMm,
      sku: ocularOrders.sku,
      quantity: ocularOrders.quantity,
      patient: ocularOrders.patient,
      primaryDiagnosis: ocularOrders.primaryDiagnosis,
      submittedAt: ocularOrders.submittedAt,
      createdAt: ocularOrders.createdAt,
      providerId: ocularOrders.providerId,
      clinicName: providerAcct.clinicName,
      secondaryDiagnosis: ocularOrders.secondaryDiagnosis,
      shipTo: ocularOrders.shipTo,
      specialInstructions: ocularOrders.specialInstructions,
      insurancePayer: ocularOrders.insurancePayer,
      dateNeededBy: ocularOrders.dateNeededBy,
    })
    .from(ocularOrders)
    .leftJoin(providerAcct, eq(ocularOrders.providerId, providerAcct.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(ocularOrders.createdAt));
}

export async function getOcularOrder(id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(ocularOrders)
    .where(eq(ocularOrders.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateOcularOrderStatus(
  id: string,
  status: string,
  submissionEmailUsed?: string,
) {
  const db = getDb();
  await db
    .update(ocularOrders)
    .set({
      status,
      ...(submissionEmailUsed ? { submissionEmailUsed, submittedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(ocularOrders.id, id));
}
