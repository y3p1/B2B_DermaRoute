import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { thresholdSettings } from "../../db/threshold-settings";

export async function getSettingByKey(key: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(thresholdSettings)
    .where(eq(thresholdSettings.key, key))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertSetting(
  key: string,
  value: string,
  updatedBy?: string,
) {
  const db = getDb();
  const existing = await getSettingByKey(key);

  if (existing) {
    const updated = await db
      .update(thresholdSettings)
      .set({ value, updatedAt: new Date(), updatedBy: updatedBy ?? null })
      .where(eq(thresholdSettings.key, key))
      .returning();
    return updated[0];
  }

  const inserted = await db
    .insert(thresholdSettings)
    .values({
      key,
      value,
      updatedAt: new Date(),
      updatedBy: updatedBy ?? null,
    })
    .returning();
  return inserted[0];
}
