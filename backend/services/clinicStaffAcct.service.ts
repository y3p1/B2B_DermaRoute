import { eq } from "drizzle-orm";

import { clinicStaffAcct } from "../../db/clinic-staff";
import { getDb } from "./db";

export async function getClinicStaffProfileByUserId(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(clinicStaffAcct)
    .where(eq(clinicStaffAcct.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Get all active clinic staff email addresses for sending notifications
 */
export async function getAllClinicStaffEmails(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ email: clinicStaffAcct.email })
    .from(clinicStaffAcct)
    .where(eq(clinicStaffAcct.active, true));

  return rows.map((row) => row.email).filter(Boolean);
}
