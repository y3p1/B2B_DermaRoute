import { eq, sql, desc, isNotNull, and } from "drizzle-orm";

import { getDb } from "./db";
import { getSettingByKey } from "./thresholdSettings.service";
import { bvRequests } from "../../db/bv-requests";
import { orderProducts } from "../../db/bv-products";
import { products } from "../../db/products";
import { manufacturers } from "../../db/manufacturers";
import { providerAcct } from "../../db/provider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskTier = "critical" | "high" | "standard" | "low";

export type RiskResult = {
  score: number; // 0–100
  tier: RiskTier;
  blockers: string[];
  reasons: string[];
};

export type ScoredOrderRow = {
  orderId: string;
  orderCreatedAt: string | null;
  status: string | null;
  practice: string | null;
  provider: string | null;
  initials: string | null;
  woundType: string | null;
  woundSize: string | null;
  insurance: string | null;
  product: string | null;
  manufacturer: string | null;
  riskScore: number | null;
  riskTier: RiskTier | null;
  a1cPercent: number | null;
  diabetic: boolean | null;
  infected: boolean | null;
  tunneling: boolean | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : null;
}

function tierFromScore(score: number): RiskTier {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "standard";
  return "low";
}

// ---------------------------------------------------------------------------
// Core scoring function — pure logic, reads thresholds from threshold_settings
// ---------------------------------------------------------------------------

export async function scoreOrder(bvRequest: {
  a1cPercent?: string | null;
  diabetic?: boolean | null;
  woundSize?: string | null;
  infected?: boolean | null;
  tunneling?: boolean | null;
  woundType?: string | null;
}): Promise<RiskResult> {
  // Load thresholds from threshold_settings
  const [blockSetting, warnSetting] = await Promise.all([
    getSettingByKey("risk_a1c_block_threshold"),
    getSettingByKey("risk_a1c_warn_threshold"),
  ]);

  const blockThreshold = blockSetting ? parseFloat(blockSetting.value) : 12.0;
  const warnThreshold = warnSetting ? parseFloat(warnSetting.value) : 9.0;

  let score = 0;
  const blockers: string[] = [];
  const reasons: string[] = [];

  const a1c = toNumber(bvRequest.a1cPercent);

  // Rule 1: A1C hard block
  if (a1c !== null && a1c > blockThreshold) {
    blockers.push(
      `A1C ${a1c}% exceeds hard-block threshold of ${blockThreshold}%`,
    );
    score = 100;
    return { score, tier: "critical", blockers, reasons };
  }

  // Rule 2: A1C elevated warning
  if (a1c !== null && a1c > warnThreshold) {
    score += 30;
    reasons.push(
      `Elevated A1C (${a1c}%) above warning threshold of ${warnThreshold}%`,
    );
  }

  // Rule 3: Diabetic + large wound
  const woundArea = toNumber(bvRequest.woundSize);
  if (bvRequest.diabetic && woundArea !== null && woundArea > 10) {
    score += 20;
    reasons.push(
      `Diabetic patient with large wound (${woundArea} cm²)`,
    );
  }

  // Rule 4: Infected
  if (bvRequest.infected) {
    score += 25;
    reasons.push("Wound is infected");
  }

  // Rule 5: Tunneling
  if (bvRequest.tunneling) {
    score += 15;
    reasons.push("Wound has tunneling");
  }

  // Cap at 100
  score = Math.min(100, score);

  return {
    score,
    tier: tierFromScore(score),
    blockers,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Queries — list all scored orders for the admin risk queue
// ---------------------------------------------------------------------------

export async function listScoredOrders(): Promise<ScoredOrderRow[]> {
  const db = getDb();

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
      insurance: bvRequests.insurance,
      product: products.name,
      manufacturer: manufacturers.name,
      riskScore: orderProducts.riskScore,
      riskTier: orderProducts.riskTier,
      a1cPercent: bvRequests.a1cPercent,
      diabetic: bvRequests.diabetic,
      infected: bvRequests.infected,
      tunneling: bvRequests.tunneling,
    })
    .from(orderProducts)
    .leftJoin(bvRequests, eq(orderProducts.bvRequestId, bvRequests.id))
    .leftJoin(providerAcct, eq(bvRequests.providerId, providerAcct.id))
    .leftJoin(products, eq(orderProducts.productId, products.id))
    .leftJoin(manufacturers, eq(orderProducts.manufacturerId, manufacturers.id))
    .where(and(isNotNull(orderProducts.bvRequestId), isNotNull(orderProducts.riskScore)))
    .orderBy(
      sql`CASE ${orderProducts.riskTier}
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        WHEN 'standard' THEN 2
        WHEN 'low' THEN 3
        ELSE 4
      END`,
      desc(orderProducts.createdAt),
    );

  return rows.map((r) => ({
    orderId: r.orderId,
    orderCreatedAt: r.orderCreatedAt?.toISOString() ?? null,
    status: r.status,
    practice: r.practice,
    provider: r.provider,
    initials: r.initials,
    woundType: r.woundType,
    woundSize: r.woundSize,
    insurance: r.insurance,
    product: r.product ?? null,
    manufacturer: r.manufacturer ?? null,
    riskScore: r.riskScore,
    riskTier: (r.riskTier as RiskTier) ?? null,
    a1cPercent: toNumber(r.a1cPercent),
    diabetic: r.diabetic,
    infected: r.infected,
    tunneling: r.tunneling,
  }));
}

export async function getScoredOrderById(
  orderId: string,
): Promise<ScoredOrderRow | null> {
  const db = getDb();

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
      insurance: bvRequests.insurance,
      product: products.name,
      manufacturer: manufacturers.name,
      riskScore: orderProducts.riskScore,
      riskTier: orderProducts.riskTier,
      a1cPercent: bvRequests.a1cPercent,
      diabetic: bvRequests.diabetic,
      infected: bvRequests.infected,
      tunneling: bvRequests.tunneling,
    })
    .from(orderProducts)
    .leftJoin(bvRequests, eq(orderProducts.bvRequestId, bvRequests.id))
    .leftJoin(providerAcct, eq(bvRequests.providerId, providerAcct.id))
    .leftJoin(products, eq(orderProducts.productId, products.id))
    .leftJoin(manufacturers, eq(orderProducts.manufacturerId, manufacturers.id))
    .where(eq(orderProducts.id, orderId))
    .limit(1);

  const r = rows[0];
  if (!r) return null;

  return {
    orderId: r.orderId,
    orderCreatedAt: r.orderCreatedAt?.toISOString() ?? null,
    status: r.status,
    practice: r.practice,
    provider: r.provider,
    initials: r.initials,
    woundType: r.woundType,
    woundSize: r.woundSize,
    insurance: r.insurance,
    product: r.product ?? null,
    manufacturer: r.manufacturer ?? null,
    riskScore: r.riskScore,
    riskTier: (r.riskTier as RiskTier) ?? null,
    a1cPercent: toNumber(r.a1cPercent),
    diabetic: r.diabetic,
    infected: r.infected,
    tunneling: r.tunneling,
  };
}

/**
 * Dismiss a risk entry by clearing its riskScore and riskTier.
 * This effectively removes it from the active risk queue.
 */
export async function dismissRiskEntry(orderId: string) {
  const db = getDb();
  const updated = await db
    .update(orderProducts)
    .set({ riskScore: null, riskTier: null, updatedAt: new Date() })
    .where(eq(orderProducts.id, orderId))
    .returning();
  return updated[0] ?? null;
}
