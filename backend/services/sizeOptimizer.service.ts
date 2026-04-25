import { eq, sql } from "drizzle-orm";

import { getDb } from "./db";
import { products } from "../../db/products";
import { manufacturers } from "../../db/manufacturers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SizeOption = {
  productId: string;
  productName: string;
  manufacturer: string | null;
  unitSize: number;
  wastePercent: number;
  wasteCm2: number;
};

export type SizeRecommendation = {
  recommendedProduct: SizeOption | null;
  allOptions: SizeOption[];
};

// ---------------------------------------------------------------------------
// Core optimizer — pure math, no ML
// ---------------------------------------------------------------------------

/**
 * Given a wound size in cm² and a manufacturer, return all products
 * sorted by least waste. The recommended product is the smallest unit
 * that fully covers the wound. If no product is large enough, the
 * largest available product is recommended.
 */
export async function optimizeSize(
  woundSizeCm2: number,
  manufacturerId?: string,
): Promise<SizeRecommendation> {
  const db = getDb();

  // Fetch products with unit sizes, optionally filtered by manufacturer
  const whereClause = manufacturerId
    ? sql`${products.unitSize} IS NOT NULL AND ${products.unitSize} > 0 AND ${products.manufacturerId} = ${manufacturerId}`
    : sql`${products.unitSize} IS NOT NULL AND ${products.unitSize} > 0`;

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      unitSize: products.unitSize,
      manufacturer: manufacturers.name,
    })
    .from(products)
    .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .where(whereClause);

  if (rows.length === 0) {
    return { recommendedProduct: null, allOptions: [] };
  }

  // Compute waste for each product
  const options: SizeOption[] = rows
    .map((r) => {
      const unitSize = r.unitSize ?? 0;
      const wasteCm2 = Math.max(0, unitSize - woundSizeCm2);
      const wastePercent =
        unitSize > 0 ? Math.round((wasteCm2 / unitSize) * 1000) / 10 : 0;

      return {
        productId: r.id,
        productName: r.name,
        manufacturer: r.manufacturer ?? null,
        unitSize,
        wastePercent,
        wasteCm2: Math.round(wasteCm2 * 100) / 100,
      };
    })
    .sort((a, b) => a.wastePercent - b.wastePercent);

  // Recommended: smallest unit that fully covers the wound
  const covering = options.filter((o) => o.unitSize >= woundSizeCm2);
  const recommended =
    covering.length > 0
      ? covering.reduce((best, cur) =>
          cur.unitSize < best.unitSize ? cur : best,
        )
      : // Nothing large enough — pick the largest available
        options.reduce((best, cur) =>
          cur.unitSize > best.unitSize ? cur : best,
        );

  return {
    recommendedProduct: recommended,
    allOptions: options,
  };
}
