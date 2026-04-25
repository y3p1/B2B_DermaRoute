import { eq, desc, sql, and } from "drizzle-orm";
import { getDb } from "./db";
import { coveragePlans, policyMonitors } from "../../db/coverage-plans";
import { insurances } from "../../db/insurances";
import { createHash } from "crypto";

// ─── Coverage Plans CRUD ────────────────────────────────────────────────────

export type CoveragePlanRow = {
  id: string;
  insuranceId: string | null;
  insuranceName: string | null;
  planName: string;
  planType: string;
  coveredProducts: unknown;
  policyDocUrl: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  notes: string | null;
  active: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  monitors: PolicyMonitorRow[];
};

export type PolicyMonitorRow = {
  id: string;
  coveragePlanId: string;
  monitorUrl: string;
  lastCheckedAt: Date | null;
  lastHttpStatus: number | null;
  contentHash: string | null;
  changeDetected: boolean;
  lastChangeAt: Date | null;
};

export async function listCoveragePlans(): Promise<CoveragePlanRow[]> {
  const db = getDb();

  const plans = await db
    .select({
      id: coveragePlans.id,
      insuranceId: coveragePlans.insuranceId,
      insuranceName: insurances.name,
      planName: coveragePlans.planName,
      planType: coveragePlans.planType,
      coveredProducts: coveragePlans.coveredProducts,
      policyDocUrl: coveragePlans.policyDocUrl,
      effectiveDate: coveragePlans.effectiveDate,
      expirationDate: coveragePlans.expirationDate,
      notes: coveragePlans.notes,
      active: coveragePlans.active,
      createdAt: coveragePlans.createdAt,
      updatedAt: coveragePlans.updatedAt,
    })
    .from(coveragePlans)
    .leftJoin(insurances, eq(coveragePlans.insuranceId, insurances.id))
    .orderBy(desc(coveragePlans.createdAt));

  // Fetch monitors for each plan
  const allMonitors = await db
    .select()
    .from(policyMonitors)
    .orderBy(desc(policyMonitors.createdAt));

  const monitorsByPlanId = new Map<string, PolicyMonitorRow[]>();
  for (const m of allMonitors) {
    const existing = monitorsByPlanId.get(m.coveragePlanId) ?? [];
    existing.push({
      id: m.id,
      coveragePlanId: m.coveragePlanId,
      monitorUrl: m.monitorUrl,
      lastCheckedAt: m.lastCheckedAt,
      lastHttpStatus: m.lastHttpStatus,
      contentHash: m.contentHash,
      changeDetected: m.changeDetected,
      lastChangeAt: m.lastChangeAt,
    });
    monitorsByPlanId.set(m.coveragePlanId, existing);
  }

  return plans.map((p) => ({
    ...p,
    monitors: monitorsByPlanId.get(p.id) ?? [],
  }));
}

export async function createCoveragePlan(data: {
  insuranceId?: string;
  planName: string;
  planType: string;
  coveredProducts?: unknown;
  policyDocUrl?: string;
  effectiveDate?: string;
  expirationDate?: string;
  notes?: string;
  monitorUrl?: string;
}) {
  const db = getDb();

  const [plan] = await db
    .insert(coveragePlans)
    .values({
      insuranceId: data.insuranceId || null,
      planName: data.planName,
      planType: data.planType,
      coveredProducts: data.coveredProducts ?? null,
      policyDocUrl: data.policyDocUrl || null,
      effectiveDate: data.effectiveDate || null,
      expirationDate: data.expirationDate || null,
      notes: data.notes || null,
    })
    .returning();

  // If a monitor URL was provided, create a monitor entry
  if (data.monitorUrl && plan) {
    await db.insert(policyMonitors).values({
      coveragePlanId: plan.id,
      monitorUrl: data.monitorUrl,
    });
  }

  return plan;
}

export async function updateCoveragePlan(
  id: string,
  data: {
    insuranceId?: string;
    planName?: string;
    planType?: string;
    coveredProducts?: unknown;
    policyDocUrl?: string;
    effectiveDate?: string;
    expirationDate?: string;
    notes?: string;
    active?: boolean;
  },
) {
  const db = getDb();
  const [updated] = await db
    .update(coveragePlans)
    .set({
      ...(data.insuranceId !== undefined ? { insuranceId: data.insuranceId || null } : {}),
      ...(data.planName !== undefined ? { planName: data.planName } : {}),
      ...(data.planType !== undefined ? { planType: data.planType } : {}),
      ...(data.coveredProducts !== undefined ? { coveredProducts: data.coveredProducts } : {}),
      ...(data.policyDocUrl !== undefined ? { policyDocUrl: data.policyDocUrl || null } : {}),
      ...(data.effectiveDate !== undefined ? { effectiveDate: data.effectiveDate || null } : {}),
      ...(data.expirationDate !== undefined ? { expirationDate: data.expirationDate || null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      updatedAt: new Date(),
    })
    .where(eq(coveragePlans.id, id))
    .returning();
  return updated;
}

export async function deleteCoveragePlan(id: string) {
  const db = getDb();
  await db.delete(coveragePlans).where(eq(coveragePlans.id, id));
}

// ─── Policy Monitor URL Check ───────────────────────────────────────────────

export async function addPolicyMonitor(coveragePlanId: string, monitorUrl: string) {
  const db = getDb();
  const [monitor] = await db
    .insert(policyMonitors)
    .values({ coveragePlanId, monitorUrl })
    .returning();
  return monitor;
}

export async function deletePolicyMonitor(id: string) {
  const db = getDb();
  await db.delete(policyMonitors).where(eq(policyMonitors.id, id));
}

export async function checkPolicyUrl(monitorId: string): Promise<{
  changed: boolean;
  status: number;
  error?: string;
}> {
  const db = getDb();

  const [monitor] = await db
    .select()
    .from(policyMonitors)
    .where(eq(policyMonitors.id, monitorId))
    .limit(1);

  if (!monitor) {
    return { changed: false, status: 0, error: "Monitor not found" };
  }

  try {
    const response = await fetch(monitor.monitorUrl, {
      headers: { "User-Agent": "IntegrityTissue-PolicyMonitor/1.0" },
      signal: AbortSignal.timeout(15_000),
    });

    const body = await response.text();
    const hash = createHash("sha256").update(body).digest("hex");
    const changed = monitor.contentHash !== null && monitor.contentHash !== hash;

    await db
      .update(policyMonitors)
      .set({
        lastCheckedAt: new Date(),
        lastHttpStatus: response.status,
        contentHash: hash,
        changeDetected: changed,
        ...(changed ? { lastChangeAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(policyMonitors.id, monitorId));

    return { changed, status: response.status };
  } catch (err) {
    await db
      .update(policyMonitors)
      .set({
        lastCheckedAt: new Date(),
        lastHttpStatus: 0,
        updatedAt: new Date(),
      })
      .where(eq(policyMonitors.id, monitorId));

    return {
      changed: false,
      status: 0,
      error: err instanceof Error ? err.message : "Fetch failed",
    };
  }
}

// Check all active monitors (used by daily cron)
export async function checkAllPolicyMonitors(): Promise<{
  checked: number;
  changed: number;
  errors: number;
}> {
  const db = getDb();

  const monitors = await db
    .select({ id: policyMonitors.id })
    .from(policyMonitors)
    .innerJoin(coveragePlans, and(
      eq(policyMonitors.coveragePlanId, coveragePlans.id),
      eq(coveragePlans.active, true),
    ));

  let checked = 0;
  let changed = 0;
  let errors = 0;

  for (const m of monitors) {
    const result = await checkPolicyUrl(m.id);
    checked++;
    if (result.changed) changed++;
    if (result.error) errors++;
  }

  return { checked, changed, errors };
}
