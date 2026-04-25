import { z } from "zod";
import { getDb } from "./db";
import { manufacturers } from "../../db/manufacturers";
import { eq, and } from "drizzle-orm";

export const createManufacturerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  commercial: z.boolean().optional().default(false),
  quarter: z.number().int().min(1).max(4),
  year: z.number().int().min(2020),
});

export const updateManufacturerSchema = createManufacturerSchema.partial();

export type CreateManufacturerInput = z.infer<typeof createManufacturerSchema>;
export type UpdateManufacturerInput = z.infer<typeof updateManufacturerSchema>;

export async function listManufacturers(filters?: { commercial?: boolean }) {
  const db = getDb();

  const conditions = [];
  if (filters?.commercial !== undefined) {
    conditions.push(eq(manufacturers.commercial, filters.commercial));
  }

  const result = await db
    .select()
    .from(manufacturers)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(manufacturers.createdAt);

  return result;
}

export async function getManufacturerById(id: string) {
  const db = getDb();

  const result = await db
    .select()
    .from(manufacturers)
    .where(eq(manufacturers.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function createManufacturer(input: CreateManufacturerInput) {
  const db = getDb();
  const validated = createManufacturerSchema.parse(input);

  const inserted = await db
    .insert(manufacturers)
    .values({
      ...validated,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return inserted[0];
}

export async function updateManufacturer(
  id: string,
  input: UpdateManufacturerInput,
) {
  const db = getDb();
  const validated = updateManufacturerSchema.parse(input);

  const updated = await db
    .update(manufacturers)
    .set({
      ...validated,
      updatedAt: new Date(),
    })
    .where(eq(manufacturers.id, id))
    .returning();

  return updated[0] ?? null;
}

export async function deleteManufacturer(id: string) {
  const db = getDb();

  const deleted = await db
    .delete(manufacturers)
    .where(eq(manufacturers.id, id))
    .returning();

  return deleted[0] ?? null;
}
