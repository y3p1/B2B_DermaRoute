import { eq } from "drizzle-orm";

import { adminAcct } from "../../db/admin";
import { getDb } from "./db";

export async function getAdminProfileByUserId(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(adminAcct)
    .where(eq(adminAcct.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

export async function getAllAdminEmails(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ email: adminAcct.email })
    .from(adminAcct)
    .where(eq(adminAcct.active, true));

  return rows.map((row) => row.email).filter(Boolean);
}

/**
 * Get all active admin phone numbers for sending SMS alerts
 */
export async function getAllAdminPhones(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ phone: adminAcct.accountPhone })
    .from(adminAcct)
    .where(eq(adminAcct.active, true));

  return rows.map((row) => row.phone).filter(Boolean);
}
