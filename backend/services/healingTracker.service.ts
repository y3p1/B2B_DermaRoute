import { z } from "zod";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";

import { woundMeasurements } from "../../db/wound-measurements";
import { bvRequests } from "../../db/bv-requests";
import { providerAcct } from "../../db/provider";
import { orderProducts } from "../../db/bv-products";
import { products } from "../../db/products";
import { manufacturers } from "../../db/manufacturers";
import { insurances } from "../../db/insurances";
import { insuranceRouting } from "../../db/insurance-routing";
import { getDb } from "./db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HealingBenchmarkKey = "DFU" | "VLU" | "PRESSURE" | "MOHS" | "OTHER";

export type HealingStatus =
  | "on_track"
  | "below_target"
  | "pending"
  | "tracking_only"
  | "healed";

export type WoundCaseRow = {
  bvRequestId: string;
  initials: string | null;
  clinicName: string | null;
  providerId: string | null;
  woundType: string | null;
  benchmarkKey: HealingBenchmarkKey;
  benchmarkLabel: string;
  baselineSize: number | null;
  baselineDate: string | null;
  currentSize: number | null;
  currentDate: string | null;
  pctReduction: number | null; // 0..1
  weeksElapsed: number | null;
  target: number | null; // 0..1
  status: HealingStatus;
  applicationsUsed: number;
  applicationsRemaining: number;
  measurementCount: number;
};

export type WoundMeasurementRow = {
  id: string;
  bvRequestId: string;
  sizeCm2: number;
  measuredAt: string;
  notes: string | null;
  recordedBy: string | null;
  recordedByType: string | null;
  createdAt: string | null;
};

export type AlternativeProductRow = {
  id: string;
  qCode: string | null;
  name: string;
  manufacturer: string | null;
  marginPerCm2: number | null;
};

// ---------------------------------------------------------------------------
// Constants — PRD §5.7 healing benchmarks
// ---------------------------------------------------------------------------

export const HEALING_BENCHMARKS: Record<
  HealingBenchmarkKey,
  { label: string; weekTarget: { week: number; reduction: number } | null; description: string }
> = {
  DFU: {
    label: "Diabetic Foot Ulcer",
    weekTarget: { week: 4, reduction: 0.5 },
    description: "50% reduction by Week 4",
  },
  VLU: {
    label: "Venous Leg Ulcer",
    weekTarget: { week: 4, reduction: 0.4 },
    description: "40% reduction by Week 4",
  },
  PRESSURE: {
    label: "Pressure Ulcer",
    // 10% per week, evaluated at week 4 (cumulative 40%)
    weekTarget: { week: 4, reduction: 0.4 },
    description: "10% reduction per week (eval at Week 4)",
  },
  MOHS: {
    label: "MOHS (acute)",
    weekTarget: null,
    description: "Tracked only — no benchmark",
  },
  OTHER: {
    label: "Other / Unspecified",
    weekTarget: null,
    description: "Tracked only — no benchmark",
  },
};

export const APPLICATION_LIMIT = 10;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const recordMeasurementSchema = z.object({
  bvRequestId: z.string().uuid(),
  sizeCm2: z.number().nonnegative(),
  measuredAt: z.string().optional(), // ISO date; defaults to today
  notes: z.string().optional(),
});

export type RecordMeasurementInput = z.infer<typeof recordMeasurementSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function classifyWoundType(
  woundType: string | null,
  diabetic: boolean | null,
): HealingBenchmarkKey {
  const normalized = (woundType ?? "").toLowerCase();

  if (normalized.includes("mohs")) return "MOHS";
  if (normalized.includes("pressure")) return "PRESSURE";
  if (normalized.includes("dfu") || normalized.includes("diabetic")) return "DFU";
  if (normalized.includes("vlu") || normalized.includes("venous")) return "VLU";

  // Generic "ulcer" — disambiguate via diabetic flag
  if (normalized.includes("ulcer")) {
    return diabetic ? "DFU" : "VLU";
  }

  return "OTHER";
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : null;
}

function diffWeeks(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return (to - from) / (1000 * 60 * 60 * 24 * 7);
}

function deriveStatus(
  benchmarkKey: HealingBenchmarkKey,
  baseline: number | null,
  current: number | null,
  weeksElapsed: number | null,
  measurementCount: number,
): { status: HealingStatus; pctReduction: number | null; target: number | null } {
  const benchmark = HEALING_BENCHMARKS[benchmarkKey];
  const targetReduction = benchmark.weekTarget?.reduction ?? null;

  // Wound size 0 means fully healed — 100% reduction regardless of benchmark
  if (current === 0 && baseline !== null && baseline > 0 && measurementCount >= 2) {
    return { status: "healed", pctReduction: 1.0, target: targetReduction };
  }

  // No benchmark → always tracking_only (still compute % for display)
  if (!benchmark.weekTarget) {
    const pct =
      baseline && current !== null && baseline > 0
        ? (baseline - current) / baseline
        : null;
    return { status: "tracking_only", pctReduction: pct, target: null };
  }

  // Need at least one follow-up to evaluate
  if (
    measurementCount < 2 ||
    baseline === null ||
    current === null ||
    weeksElapsed === null
  ) {
    return {
      status: "tracking_only",
      pctReduction: null,
      target: benchmark.weekTarget.reduction,
    };
  }

  const pct = baseline > 0 ? (baseline - current) / baseline : 0;
  const { week: targetWeek } = benchmark.weekTarget;
  // targetReduction already declared above — reuse it (guaranteed non-null here since weekTarget exists)
  const reduction = targetReduction!;

  if (weeksElapsed < targetWeek) {
    if (pct < 0) {
      // Wound size has increased compared to baseline
      return {
        status: "below_target",
        pctReduction: pct,
        target: reduction,
      };
    }
    return {
      status: pct >= reduction ? "on_track" : "pending",
      pctReduction: pct,
      target: reduction,
    };
  }

  return {
    status: pct >= reduction ? "on_track" : "below_target",
    pctReduction: pct,
    target: reduction,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function recordMeasurement(
  input: RecordMeasurementInput,
  recordedBy: string,
  recordedByType: "admin" | "clinic_staff" | "provider",
) {
  const db = getDb();

  // Verify BV exists and is approved
  const bvRows = await db
    .select({ id: bvRequests.id, status: bvRequests.status })
    .from(bvRequests)
    .where(eq(bvRequests.id, input.bvRequestId))
    .limit(1);

  const bv = bvRows[0];
  if (!bv) {
    throw new Error("BV request not found");
  }
  if (bv.status !== "approved") {
    throw new Error("Wound measurements can only be recorded for approved BV requests");
  }

  const measuredAt = input.measuredAt
    ? input.measuredAt
    : new Date().toISOString().slice(0, 10);

  // Prevent backdated measurements: reject if date is before the latest existing measurement
  const latestRow = await db
    .select({ measuredAt: woundMeasurements.measuredAt })
    .from(woundMeasurements)
    .where(eq(woundMeasurements.bvRequestId, input.bvRequestId))
    .orderBy(desc(woundMeasurements.measuredAt))
    .limit(1);

  if (latestRow.length > 0) {
    const latestDate = latestRow[0].measuredAt; // e.g. "2026-04-20"
    if (measuredAt < latestDate) {
      throw new Error(
        `Measurement date (${measuredAt}) cannot be earlier than the latest recorded measurement (${latestDate}). Please choose a date on or after ${latestDate}.`,
      );
    }
  }

  const [created] = await db
    .insert(woundMeasurements)
    .values({
      bvRequestId: input.bvRequestId,
      sizeCm2: input.sizeCm2.toString(),
      measuredAt,
      recordedBy,
      recordedByType,
      notes: input.notes ?? null,
    })
    .returning();

  return created;
}

export async function getWoundCases(): Promise<WoundCaseRow[]> {
  const db = getDb();

  // Pull all approved BVs joined with provider info
  const bvRows = await db
    .select({
      id: bvRequests.id,
      providerId: bvRequests.providerId,
      initials: bvRequests.initials,
      woundType: bvRequests.woundType,
      diabetic: bvRequests.diabetic,
      clinicName: providerAcct.clinicName,
    })
    .from(bvRequests)
    .leftJoin(providerAcct, eq(bvRequests.providerId, providerAcct.id))
    .where(
      and(
        eq(bvRequests.status, "approved"),
        eq(bvRequests.healingTrackerActive, true)
      )
    );

  if (bvRows.length === 0) return [];

  const bvIds = bvRows.map((r) => r.id);

  // Pull all measurements for these BVs (sorted ascending by date)
  const measurementRows = await db
    .select()
    .from(woundMeasurements)
    .where(
      sql`${woundMeasurements.bvRequestId} IN (${sql.join(
        bvIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    )
    .orderBy(asc(woundMeasurements.measuredAt), asc(woundMeasurements.createdAt));

  const measurementsByBv = new Map<string, typeof measurementRows>();
  for (const m of measurementRows) {
    const list = measurementsByBv.get(m.bvRequestId) ?? [];
    list.push(m);
    measurementsByBv.set(m.bvRequestId, list);
  }

  // Pull application counts (shipped/completed orders) per BV
  const appCountRows = await db
    .select({
      bvRequestId: orderProducts.bvRequestId,
      count: sql<number>`count(*)::int`,
    })
    .from(orderProducts)
    .where(
      sql`${orderProducts.bvRequestId} IN (${sql.join(
        bvIds.map((id) => sql`${id}`),
        sql`, `,
      )}) AND ${orderProducts.status} IN ('shipped', 'completed')`,
    )
    .groupBy(orderProducts.bvRequestId);

  const appCountByBv = new Map<string, number>();
  for (const row of appCountRows) {
    if (row.bvRequestId) {
      appCountByBv.set(row.bvRequestId, Number(row.count) || 0);
    }
  }

  // Build result rows
  const result: WoundCaseRow[] = [];

  for (const bv of bvRows) {
    const ms = measurementsByBv.get(bv.id) ?? [];
    const baseline = ms[0] ?? null;
    const latest = ms[ms.length - 1] ?? null;

    const benchmarkKey = classifyWoundType(bv.woundType, bv.diabetic);
    const benchmark = HEALING_BENCHMARKS[benchmarkKey];

    const baselineSize = baseline ? toNumber(baseline.sizeCm2) : null;
    const currentSize = latest ? toNumber(latest.sizeCm2) : null;
    const weeksElapsed =
      baseline && latest
        ? Math.max(0, diffWeeks(baseline.measuredAt, latest.measuredAt))
        : null;

    const { status, pctReduction, target } = deriveStatus(
      benchmarkKey,
      baselineSize,
      currentSize,
      weeksElapsed,
      ms.length,
    );

    const applicationsUsed = appCountByBv.get(bv.id) ?? 0;

    result.push({
      bvRequestId: bv.id,
      initials: bv.initials,
      clinicName: bv.clinicName,
      providerId: bv.providerId,
      woundType: bv.woundType,
      benchmarkKey,
      benchmarkLabel: benchmark.label,
      baselineSize,
      baselineDate: baseline?.measuredAt ?? null,
      currentSize,
      currentDate: latest?.measuredAt ?? null,
      pctReduction,
      weeksElapsed,
      target,
      status,
      applicationsUsed,
      applicationsRemaining: Math.max(0, APPLICATION_LIMIT - applicationsUsed),
      measurementCount: ms.length,
    });
  }

  // Sort: below_target first, then pending, then on_track, then tracking_only, then healed.
  const statusOrder: Record<HealingStatus, number> = {
    below_target: 0,
    pending: 1,
    on_track: 2,
    tracking_only: 3,
    healed: 4,
  };
  result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return result;
}

export async function getMeasurementHistory(
  bvRequestId: string,
): Promise<WoundMeasurementRow[]> {
  const db = getDb();

  const rows = await db
    .select()
    .from(woundMeasurements)
    .where(eq(woundMeasurements.bvRequestId, bvRequestId))
    .orderBy(asc(woundMeasurements.measuredAt), asc(woundMeasurements.createdAt));

  return rows.map((r) => ({
    id: r.id,
    bvRequestId: r.bvRequestId,
    sizeCm2: toNumber(r.sizeCm2) ?? 0,
    measuredAt: r.measuredAt,
    notes: r.notes,
    recordedBy: r.recordedBy,
    recordedByType: r.recordedByType,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
  }));
}

export async function getAlternativeProducts(
  bvRequestId: string,
): Promise<AlternativeProductRow[]> {
  const db = getDb();

  const bvRow = await db
    .select({
      insurance: bvRequests.insurance,
    })
    .from(bvRequests)
    .where(eq(bvRequests.id, bvRequestId))
    .limit(1);

  const insuranceName = bvRow[0]?.insurance ?? null;

  // Look up insurance row by name (bv_requests stores varchar, not FK)
  let insuranceId: string | null = null;
  let isCommercial = false; // default to non-commercial
  if (insuranceName) {
    const insRow = await db
      .select({ id: insurances.id, commercial: insurances.commercial })
      .from(insurances)
      .where(eq(insurances.name, insuranceName))
      .limit(1);
    insuranceId = insRow[0]?.id ?? null;
    isCommercial = insRow[0]?.commercial ?? false;
  }

  // Find routed manufacturers for this specific insurance
  let manufacturerIds: string[] = [];
  if (insuranceId) {
    const routes = await db
      .select({ manufacturerId: insuranceRouting.manufacturerId })
      .from(insuranceRouting)
      .where(eq(insuranceRouting.insuranceId, insuranceId));
    manufacturerIds = routes.map((r) => r.manufacturerId);
  }

  // Build conditions: always filter by the insurance's commercial type
  const conditions: SQL[] = [eq(products.commercial, isCommercial)];

  // If manufacturer routing exists, narrow to those manufacturers
  if (manufacturerIds.length > 0) {
    conditions.push(
      sql`${products.manufacturerId} IN (${sql.join(
        manufacturerIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  }

  const rows = await db
    .select({
      id: products.id,
      qCode: products.qCode,
      name: products.name,
      payRatePerCm2: products.payRatePerCm2,
      costPerCm2: products.costPerCm2,
      manufacturer: manufacturers.name,
    })
    .from(products)
    .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .where(and(...conditions));

  const ranked: AlternativeProductRow[] = rows
    .map((r) => {
      const pay = toNumber(r.payRatePerCm2);
      const cost = toNumber(r.costPerCm2);
      const margin = pay !== null && cost !== null ? pay - cost : null;
      return {
        id: r.id,
        qCode: r.qCode,
        name: r.name,
        manufacturer: r.manufacturer ?? null,
        marginPerCm2: margin,
      };
    })
    .filter((r) => r.marginPerCm2 !== null)
    .sort((a, b) => (b.marginPerCm2 as number) - (a.marginPerCm2 as number));

  // Deduplicate by name
  const uniqueRanked: AlternativeProductRow[] = [];
  const seenNames = new Set<string>();
  for (const product of ranked) {
    if (!seenNames.has(product.name)) {
      seenNames.add(product.name);
      uniqueRanked.push(product);
    }
  }

  return uniqueRanked;
}

// Lightweight wound case option list for UI dropdowns
export type WoundCaseOption = {
  bvRequestId: string;
  initials: string | null;
  clinicName: string | null;
  woundType: string | null;
};

export async function listApprovedBvOptions(): Promise<WoundCaseOption[]> {
  const db = getDb();
  const rows = await db
    .select({
      bvRequestId: bvRequests.id,
      initials: bvRequests.initials,
      clinicName: providerAcct.clinicName,
      woundType: bvRequests.woundType,
      createdAt: bvRequests.createdAt,
    })
    .from(bvRequests)
    .leftJoin(providerAcct, eq(bvRequests.providerId, providerAcct.id))
    .where(
      and(
        eq(bvRequests.status, "approved"),
        eq(bvRequests.healingTrackerActive, true)
      )
    )
    .orderBy(desc(bvRequests.createdAt));

  return rows.map((row) => ({
    bvRequestId: row.bvRequestId,
    initials: row.initials,
    clinicName: row.clinicName,
    woundType: row.woundType,
  }));
}

/**
 * Delete all wound measurements for a BV request, effectively removing the
 * wound case from the healing tracker. The BV request itself is NOT deleted.
 */
export async function deleteWoundCase(bvRequestId: string) {
  const db = getDb();
  
  // Set the healing tracker flag to false to hide it
  await db
    .update(bvRequests)
    .set({ healingTrackerActive: false })
    .where(eq(bvRequests.id, bvRequestId));

  // Also delete its measurements history so it's clean if reactivated later
  const deleted = await db
    .delete(woundMeasurements)
    .where(eq(woundMeasurements.bvRequestId, bvRequestId))
    .returning();
    
  return { deletedCount: deleted.length, hidden: true };
}
