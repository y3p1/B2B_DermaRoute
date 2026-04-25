import { z } from "zod";
import { eq, sql, desc, isNotNull, isNull } from "drizzle-orm";

import { getDb } from "./db";
import { orderOutcomes } from "../../db/order-outcomes";
import { orderProducts } from "../../db/bv-products";
import { bvRequests } from "../../db/bv-requests";
import { products } from "../../db/products";
import { manufacturers } from "../../db/manufacturers";
import { providerAcct } from "../../db/provider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrderMissingOutcome = {
  orderId: string;
  orderCreatedAt: string | null;
  status: string | null;
  practice: string | null;
  provider: string | null;
  initials: string | null;
  woundType: string | null;
  woundSize: string | null;
  product: string | null;
  manufacturer: string | null;
};

export type SuccessRateResult = {
  woundType: string;
  manufacturerId: string | null;
  manufacturerName: string | null;
  healedCount: number;
  totalCount: number;
  rate: number | null; // 0..1, null if insufficient data
  sampleSize: number;
  sufficient: boolean; // true if sampleSize >= 10
};

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const logOutcomeSchema = z.object({
  orderProductId: z.string().uuid(),
  bvRequestId: z.string().uuid().optional(),
  healed: z.boolean(),
  weeksToHeal: z.number().int().min(0).optional(),
  complications: z.string().optional(),
  applicationCount: z.number().int().min(0).optional(),
});

export type LogOutcomeInput = z.infer<typeof logOutcomeSchema>;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get orders that don't yet have a logged outcome (for the outcome logger panel).
 */
export async function getOrdersMissingOutcomes(): Promise<
  OrderMissingOutcome[]
> {
  const db = getDb();

  // Subquery to find order IDs that already have outcomes
  const existingOutcomeIds = db
    .select({ id: orderOutcomes.orderProductId })
    .from(orderOutcomes);

  const rows = await db
    .select({
      orderId: orderProducts.id,
      orderCreatedAt: orderProducts.createdAt,
      status: orderProducts.status,
      practice: providerAcct.clinicName,
      provider: bvRequests.provider,
      initials: bvRequests.initials,
      woundType: bvRequests.woundType,
      woundSize: bvRequests.woundSize,
      product: products.name,
      manufacturer: manufacturers.name,
    })
    .from(orderProducts)
    .leftJoin(bvRequests, eq(orderProducts.bvRequestId, bvRequests.id))
    .leftJoin(providerAcct, eq(bvRequests.providerId, providerAcct.id))
    .leftJoin(products, eq(orderProducts.productId, products.id))
    .leftJoin(manufacturers, eq(orderProducts.manufacturerId, manufacturers.id))
    .where(
      sql`${orderProducts.bvRequestId} IS NOT NULL
          AND ${orderProducts.id} NOT IN (${existingOutcomeIds})
          AND ${orderProducts.status} IN ('shipped', 'completed')`,
    )
    .orderBy(desc(orderProducts.createdAt));

  return rows.map((r) => ({
    orderId: r.orderId,
    orderCreatedAt: r.orderCreatedAt?.toISOString() ?? null,
    status: r.status,
    practice: r.practice,
    provider: r.provider,
    initials: r.initials,
    woundType: r.woundType,
    woundSize: r.woundSize,
    product: r.product ?? null,
    manufacturer: r.manufacturer ?? null,
  }));
}

/**
 * Log an outcome for an order.
 */
export async function logOutcome(
  input: LogOutcomeInput,
  recordedBy: string,
  recordedByType: "admin" | "clinic_staff",
) {
  const db = getDb();

  // If bvRequestId not provided, look it up from the order
  let bvRequestId = input.bvRequestId ?? null;
  if (!bvRequestId) {
    const [order] = await db
      .select({ bvRequestId: orderProducts.bvRequestId })
      .from(orderProducts)
      .where(eq(orderProducts.id, input.orderProductId))
      .limit(1);
    bvRequestId = order?.bvRequestId ?? null;
  }

  const [created] = await db
    .insert(orderOutcomes)
    .values({
      orderProductId: input.orderProductId,
      bvRequestId,
      healed: input.healed,
      weeksToHeal: input.weeksToHeal ?? null,
      complications: input.complications ?? null,
      applicationCount: input.applicationCount ?? null,
      recordedBy,
      recordedByType,
      recordedAt: new Date(),
    })
    .returning();

  return created;
}

/**
 * Compute success rate for a wound type, optionally filtered by manufacturer.
 */
export async function getSuccessRate(
  woundType: string,
  manufacturerId?: string,
): Promise<SuccessRateResult> {
  const db = getDb();

  // Build the query — join outcomes with orders and BV requests
  const conditions = [
    sql`LOWER(${bvRequests.woundType}) = LOWER(${woundType})`,
  ];
  if (manufacturerId) {
    conditions.push(
      sql`${orderProducts.manufacturerId} = ${manufacturerId}`,
    );
  }

  const whereClause = sql.join(conditions, sql` AND `);

  const [stats] = await db
    .select({
      totalCount: sql<number>`count(*)::int`,
      healedCount: sql<number>`count(*) FILTER (WHERE ${orderOutcomes.healed} = true)::int`,
    })
    .from(orderOutcomes)
    .innerJoin(
      orderProducts,
      eq(orderOutcomes.orderProductId, orderProducts.id),
    )
    .innerJoin(bvRequests, eq(orderProducts.bvRequestId, bvRequests.id))
    .where(whereClause);

  const totalCount = stats?.totalCount ?? 0;
  const healedCount = stats?.healedCount ?? 0;
  const sampleSize = totalCount;
  const sufficient = sampleSize >= 10;
  const rate = sufficient ? healedCount / totalCount : null;

  // Get manufacturer name if filtered
  let manufacturerName: string | null = null;
  if (manufacturerId) {
    const [mfr] = await db
      .select({ name: manufacturers.name })
      .from(manufacturers)
      .where(eq(manufacturers.id, manufacturerId))
      .limit(1);
    manufacturerName = mfr?.name ?? null;
  }

  return {
    woundType,
    manufacturerId: manufacturerId ?? null,
    manufacturerName,
    healedCount,
    totalCount,
    rate,
    sampleSize,
    sufficient,
  };
}
