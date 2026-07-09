import { randomUUID } from "crypto";
import { z } from "zod";
import { getDb } from "./db";
import { insurances } from "../../db/insurances";
import { insuranceRouting } from "../../db/insurance-routing";
import { eq, asc } from "drizzle-orm";
import { HttpError } from "../utils/httpError";

export const createInsuranceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  commercial: z.boolean().default(false),
});

export const updateInsuranceSchema = createInsuranceSchema.partial();

export type CreateInsuranceInput = z.infer<typeof createInsuranceSchema>;
export type UpdateInsuranceInput = z.infer<typeof updateInsuranceSchema>;

export async function listInsurances() {
  const db = getDb();
  return db.select().from(insurances).orderBy(asc(insurances.name));
}

export async function getInsuranceById(id: string) {
  const db = getDb();
  const result = await db
    .select()
    .from(insurances)
    .where(eq(insurances.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createInsurance(input: CreateInsuranceInput) {
  const db = getDb();
  const validated = createInsuranceSchema.parse(input);
  const inserted = await db
    .insert(insurances)
    .values({
      id: randomUUID(),
      ...validated,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return inserted[0];
}

export async function updateInsurance(id: string, input: UpdateInsuranceInput) {
  const db = getDb();
  const validated = updateInsuranceSchema.parse(input);
  const updated = await db
    .update(insurances)
    .set({ ...validated, updatedAt: new Date() })
    .where(eq(insurances.id, id))
    .returning();
  return updated[0] ?? null;
}

export async function deleteInsurance(id: string) {
  const db = getDb();

  // Restrict: block delete if any insurance-routing rules reference this insurance
  // (FK has no onDelete action) to avoid an unhandled Postgres 23503 error.
  const linkedRouting = await db
    .select({ id: insuranceRouting.id })
    .from(insuranceRouting)
    .where(eq(insuranceRouting.insuranceId, id))
    .limit(1);

  if (linkedRouting.length > 0) {
    throw new HttpError(409, "Cannot delete this Insurance: existing routing rules reference it.");
  }

  const deleted = await db
    .delete(insurances)
    .where(eq(insurances.id, id))
    .returning();
  return deleted[0] ?? null;
}
