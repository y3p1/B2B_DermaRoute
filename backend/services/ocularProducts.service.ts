import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db";
import { ocularProducts } from "../../db/schema";

export const ocularProductSchema = z.object({
  name: z.string().min(1),
  productVariant: z.enum(["thin", "thick"]),
  sizeMm: z.number().int().min(1),
  sku: z.string().min(1),
  description: z.string().optional().nullable(),
});

export type OcularProductInput = z.infer<typeof ocularProductSchema>;

export async function listOcularProducts(includeArchived = false) {
  const db = getDb();
  const rows = await db.select().from(ocularProducts);
  return includeArchived ? rows : rows.filter((r) => !r.archived);
}

export async function getOcularProductById(id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(ocularProducts)
    .where(eq(ocularProducts.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createOcularProduct(data: OcularProductInput) {
  const db = getDb();
  const rows = await db.insert(ocularProducts).values(data).returning();
  return rows[0];
}

export async function updateOcularProduct(
  id: string,
  data: Partial<OcularProductInput>,
) {
  const db = getDb();
  const rows = await db
    .update(ocularProducts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(ocularProducts.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function archiveOcularProduct(id: string) {
  const db = getDb();
  const rows = await db
    .update(ocularProducts)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(ocularProducts.id, id))
    .returning();
  return rows[0] ?? null;
}
