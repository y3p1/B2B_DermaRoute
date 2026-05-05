import { z } from "zod";
import { getDb } from "./db";
import { manufacturers } from "../../db/manufacturers";
import { products } from "../../db/products";
import { orderProducts } from "../../db/bv-products";
import { eq, and } from "drizzle-orm";
import { HttpError } from "../utils/httpError";

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
    .orderBy(manufacturers.createdAt, manufacturers.id);

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

  // Block delete if any product orders (bv_products) reference this manufacturer — non-nullable FK
  const linkedOrders = await db
    .select({ id: orderProducts.id })
    .from(orderProducts)
    .where(eq(orderProducts.manufacturerId, id))
    .limit(1);

  if (linkedOrders.length > 0) {
    throw new HttpError(409, "Existing Product Record linked to this Manufacturer exists.");
  }

  // Unlink catalog products before deleting to avoid FK constraint violation
  await db
    .update(products)
    .set({ manufacturerId: null })
    .where(eq(products.manufacturerId, id));

  const deleted = await db
    .delete(manufacturers)
    .where(eq(manufacturers.id, id))
    .returning();

  return deleted[0] ?? null;
}
