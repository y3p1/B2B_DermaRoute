import { z } from "zod";
import { getDb } from "./db";
import { products } from "../../db/products";
import { orderProducts } from "../../db/bv-products";
import { manufacturers } from "../../db/manufacturers";
import { woundSizes } from "../../db/bv-products";
import { eq, and, sql } from "drizzle-orm";

export async function getProductById(id: string) {
  const db = getDb();
  const result = await db
    .select({
      id: products.id,
      qCode: products.qCode,
      name: products.name,
      manufacturerId: products.manufacturerId,
      manufacturerName: manufacturers.name,
      woundSizeId: products.woundSizeId,
      woundSizeLabel: woundSizes.label,
      unitSize: products.unitSize,
      payRatePerCm2: products.payRatePerCm2,
      costPerCm2: products.costPerCm2,
      payRatePerGraft: products.payRatePerGraft,
      costPerGraft: products.costPerGraft,
      estAoc100: products.estAoc100,
      estAoc80: products.estAoc80,
      commission: products.commission,
      description: products.description,
      quarter: products.quarter,
      year: products.year,
      archived: products.archived,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .leftJoin(woundSizes, eq(products.woundSizeId, woundSizes.id))
    .where(eq(products.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createProduct(input: CreateProductInput) {
  const db = getDb();
  const validated = createProductSchema.parse(input);
  const inserted = await db
    .insert(products)
    .values({
      ...validated,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return inserted[0];
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const db = getDb();
  const validated = updateProductSchema.parse(input);
  const updated = await db
    .update(products)
    .set({
      ...validated,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();
  return updated[0] ?? null;
}

// Numeric string validation: only digits with optional 1-2 decimal places
const numericStringSchema = z.string()
  .optional()
  .nullable()
  .refine(
    (val) => !val || /^\d+(\.\d{1,2})?$/.test(val),
    { message: "Only numbers with up to 2 decimal places are allowed (e.g., 127.14)" },
  );

// Commission: up to 4 decimal places (e.g., 0.6000)
const commissionSchema = z.string()
  .optional()
  .nullable()
  .refine(
    (val) => !val || /^\d+(\.\d{1,4})?$/.test(val),
    { message: "Commission must be a number (e.g., 0.6)" },
  );

export const createProductSchema = z.object({
  qCode: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  commercial: z.boolean().optional().default(false),
  manufacturerId: z.string().uuid("Invalid manufacturer ID").optional(),
  woundSizeId: z.string().uuid("Invalid wound size ID").optional(),
  unitSize: z.number().int().optional(),
  payRatePerCm2: numericStringSchema,
  costPerCm2: numericStringSchema,
  payRatePerGraft: numericStringSchema,
  costPerGraft: numericStringSchema,
  estAoc100: numericStringSchema,
  estAoc80: numericStringSchema,
  commission: commissionSchema,
  description: z.string().optional(),
  quarter: z.number().int().min(1).max(4),
  year: z.number().int().min(2020),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export async function listProducts(filters?: { commercial?: boolean; includeArchived?: boolean }) {
  const db = getDb();

  const conditions = [];

  // By default, exclude archived products
  if (!filters?.includeArchived) {
    conditions.push(eq(products.archived, false));
  }

  if (filters?.commercial !== undefined) {
    conditions.push(eq(products.commercial, filters.commercial));
  }

  const result = await db
    .select({
      id: products.id,
      qCode: products.qCode,
      name: products.name,
      commercial: products.commercial,
      manufacturerId: products.manufacturerId,
      manufacturerName: manufacturers.name,
      woundSizeId: products.woundSizeId,
      woundSizeLabel: woundSizes.label,
      unitSize: products.unitSize,
      payRatePerCm2: products.payRatePerCm2,
      costPerCm2: products.costPerCm2,
      payRatePerGraft: products.payRatePerGraft,
      costPerGraft: products.costPerGraft,
      estAoc100: products.estAoc100,
      estAoc80: products.estAoc80,
      commission: products.commission,
      description: products.description,
      quarter: products.quarter,
      year: products.year,
      archived: products.archived,
      createdAt: products.createdAt,
    })
    .from(products)
    .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .leftJoin(woundSizes, eq(products.woundSizeId, woundSizes.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  return result;
}

/**
 * Delete a product permanently.
 * The FK on order_products.product_id uses onDelete: "set null",
 * so linked orders will have their product_id set to null automatically.
 */
export async function deleteProduct(id: string) {
  const db = getDb();
  const deleted = await db
    .delete(products)
    .where(eq(products.id, id))
    .returning();
  return deleted[0] ?? null;
}
