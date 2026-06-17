import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { systemSettings } from "../../db/schema";

export async function getAllSettings(): Promise<{ key: string; value: string; updatedAt: Date | null }[]> {
  const db = getDb();
  const rows = await db
    .select({
      key: systemSettings.key,
      value: systemSettings.value,
      updatedAt: systemSettings.updatedAt,
    })
    .from(systemSettings)
    .orderBy(systemSettings.key);
  return rows;
}

export async function getSetting(key: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function upsertSetting(
  key: string,
  value: string,
  updatedBy: string,
): Promise<void> {
  const db = getDb();
  await db
    .insert(systemSettings)
    .values({ key, value, updatedBy, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value, updatedBy, updatedAt: new Date() },
    });
}
