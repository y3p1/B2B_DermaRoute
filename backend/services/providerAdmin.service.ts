import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { providerAcct } from "../../db/provider";

export async function isProviderAssignedToRep(
  providerId: string,
  repId: string,
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ assignedRepId: providerAcct.assignedRepId })
    .from(providerAcct)
    .where(eq(providerAcct.id, providerId))
    .limit(1);

  return rows[0]?.assignedRepId === repId;
}

export async function getAssignedProviderIds(repId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ id: providerAcct.id })
    .from(providerAcct)
    .where(eq(providerAcct.assignedRepId, repId));

  return rows.map((r) => r.id);
}
