import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { lymphedemaOrders, providerAcct } from "../../db/schema";

const patientSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    fullName: z.string().optional(),
    dob: z.string().optional(),
    mrn: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  })
  .catchall(z.unknown());

export const createLymphedemaOrderSchema = z.object({
  orderingProviderId: z.string().uuid().optional(),
  patient: patientSchema,
  insurance: z.string().optional(),
  placeOfService: z.string().optional(),
  diagnosis: z.array(z.string()).optional(),
  conservativeTherapyCompleted: z.boolean().optional(),
  skinChanges: z.array(z.string()).optional(),
  extremity: z.array(z.string()).optional(),
  measurements: z.record(z.string(), z.number()).optional(),
  device: z.string().optional(),
  hcpcs: z.string().optional(),
  deviceRecommended: z.boolean().optional(),
  garmentType: z.string().optional(),
  garmentStyle: z.string().optional(),
  compressionLevel: z.string().optional(),
  quantity: z.number().int().min(1).max(3).optional(),
  customMade: z.boolean().optional(),
  manufacturerPreference: z.string().optional(),
  distalPressureMmhg: z.number().int().optional(),
  timesPerDay: z.number().int().optional(),
  minutesPerSession: z.number().int().optional(),
  lymphedemaProductId: z.string().uuid().optional(),
});

export type CreateLymphedemaOrderInput = z.infer<typeof createLymphedemaOrderSchema>;

export async function createLymphedemaOrder(
  input: CreateLymphedemaOrderInput,
  providerId: string,
  submittedBy: string,
): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(lymphedemaOrders)
    .values({
      providerId,
      submittedBy,
      orderingProviderId: input.orderingProviderId ?? null,
      patient: input.patient,
      insurance: input.insurance ?? null,
      placeOfService: input.placeOfService ?? null,
      diagnosis: input.diagnosis ?? null,
      conservativeTherapyCompleted: input.conservativeTherapyCompleted ?? null,
      skinChanges: input.skinChanges ?? null,
      extremity: input.extremity ?? null,
      measurements: input.measurements ?? null,
      device: input.device ?? null,
      hcpcs: input.hcpcs ?? null,
      deviceRecommended: input.deviceRecommended ?? null,
      garmentType: input.garmentType ?? null,
      garmentStyle: input.garmentStyle ?? null,
      compressionLevel: input.compressionLevel ?? null,
      quantity: input.quantity ?? null,
      customMade: input.customMade ?? null,
      manufacturerPreference: input.manufacturerPreference ?? null,
      distalPressureMmhg: input.distalPressureMmhg ?? null,
      timesPerDay: input.timesPerDay ?? null,
      minutesPerSession: input.minutesPerSession ?? null,
      lymphedemaProductId: input.lymphedemaProductId ?? null,
      status: "pending_review",
    })
    .returning({ id: lymphedemaOrders.id });
  return row.id;
}

export async function getLymphedemaOrders(filters?: { providerIds?: string[] }) {
  const db = getDb();
  const conditions = [];
  if (filters?.providerIds?.length) {
    conditions.push(inArray(lymphedemaOrders.providerId, filters.providerIds));
  }

  const rows = await db
    .select({
      id: lymphedemaOrders.id,
      status: lymphedemaOrders.status,
      insurance: lymphedemaOrders.insurance,
      device: lymphedemaOrders.device,
      patient: lymphedemaOrders.patient,
      extremity: lymphedemaOrders.extremity,
      garmentStyle: lymphedemaOrders.garmentStyle,
      garmentType: lymphedemaOrders.garmentType,
      submittedAt: lymphedemaOrders.submittedAt,
      createdAt: lymphedemaOrders.createdAt,
      providerId: lymphedemaOrders.providerId,
      clinicName: providerAcct.clinicName,
      compressionLevel: lymphedemaOrders.compressionLevel,
      quantity: lymphedemaOrders.quantity,
      manufacturerPreference: lymphedemaOrders.manufacturerPreference,
      distalPressureMmhg: lymphedemaOrders.distalPressureMmhg,
      timesPerDay: lymphedemaOrders.timesPerDay,
      minutesPerSession: lymphedemaOrders.minutesPerSession,
      diagnosis: lymphedemaOrders.diagnosis,
      hcpcs: lymphedemaOrders.hcpcs,
      placeOfService: lymphedemaOrders.placeOfService,
    })
    .from(lymphedemaOrders)
    .leftJoin(providerAcct, eq(lymphedemaOrders.providerId, providerAcct.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(lymphedemaOrders.createdAt));

  return rows;
}

export async function getLymphedemaOrder(id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(lymphedemaOrders)
    .where(eq(lymphedemaOrders.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateLymphedemaOrderStatus(
  id: string,
  status: string,
  submissionEmailUsed?: string,
) {
  const db = getDb();
  await db
    .update(lymphedemaOrders)
    .set({
      status,
      ...(submissionEmailUsed ? { submissionEmailUsed, submittedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(lymphedemaOrders.id, id));
}
