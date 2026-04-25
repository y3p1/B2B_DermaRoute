import { randomUUID } from "crypto";
import { z } from "zod";
import { getDb } from "./db";
import { insurances } from "../../db/insurances";
import { eq, asc } from "drizzle-orm";

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
  const deleted = await db
    .delete(insurances)
    .where(eq(insurances.id, id))
    .returning();
  return deleted[0] ?? null;
}
