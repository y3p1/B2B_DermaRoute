import { eq } from "drizzle-orm";

import { clinicStaffAcct } from "../../db/clinic-staff";
import { getDb } from "./db";

/**
 * List all clinic staff (ITS Representative) accounts for admin management.
 */
export async function listAllClinicStaff() {
  const db = getDb();
  const rows = await db
    .select({
      id: clinicStaffAcct.id,
      firstName: clinicStaffAcct.firstName,
      lastName: clinicStaffAcct.lastName,
      email: clinicStaffAcct.email,
      accountPhone: clinicStaffAcct.accountPhone,
      active: clinicStaffAcct.active,
      createdAt: clinicStaffAcct.createdAt,
    })
    .from(clinicStaffAcct)
    .orderBy(clinicStaffAcct.createdAt);

  return rows;
}

/**
 * Update the active (approval) status of a clinic staff account.
 */
export async function updateClinicStaffActive(id: string, active: boolean) {
  const db = getDb();
  const updated = await db
    .update(clinicStaffAcct)
    .set({ active, updatedAt: new Date() })
    .where(eq(clinicStaffAcct.id, id))
    .returning({
      id: clinicStaffAcct.id,
      firstName: clinicStaffAcct.firstName,
      lastName: clinicStaffAcct.lastName,
      email: clinicStaffAcct.email,
      active: clinicStaffAcct.active,
    });
  return updated[0] ?? null;
}
