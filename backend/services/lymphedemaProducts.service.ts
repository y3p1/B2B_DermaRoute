import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db";
import { lymphedemaProducts } from "../../db/schema";

export const lymphedemaProductSchema = z.object({
  name: z.string().min(1),
  device: z.string().optional().nullable(),
  hcpcs: z.string().optional().nullable(),
  garmentType: z.string().optional().nullable(),
  garmentStyle: z.string().optional().nullable(),
  compressionLevel: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  extremityType: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export type LymphedemaProductInput = z.infer<typeof lymphedemaProductSchema>;

export async function listLymphedemaProducts(includeArchived = false) {
  const db = getDb();
  const rows = await db.select().from(lymphedemaProducts);
  return includeArchived ? rows : rows.filter((r) => !r.archived);
}

export async function getLymphedemaProductById(id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(lymphedemaProducts)
    .where(eq(lymphedemaProducts.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createLymphedemaProduct(data: LymphedemaProductInput) {
  const db = getDb();
  const rows = await db.insert(lymphedemaProducts).values(data).returning();
  return rows[0];
}

export async function updateLymphedemaProduct(
  id: string,
  data: Partial<LymphedemaProductInput>,
) {
  const db = getDb();
  const rows = await db
    .update(lymphedemaProducts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(lymphedemaProducts.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function archiveLymphedemaProduct(id: string) {
  const db = getDb();
  const rows = await db
    .update(lymphedemaProducts)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(lymphedemaProducts.id, id))
    .returning();
  return rows[0] ?? null;
}
