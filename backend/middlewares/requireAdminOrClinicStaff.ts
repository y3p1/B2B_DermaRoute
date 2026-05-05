import type { NextFunction, Request, Response } from "../http/types";

import { eq } from "drizzle-orm";

import { adminAcct } from "../../db/admin";
import { clinicStaffAcct } from "../../db/clinic-staff";
import { getDb } from "../services/db";
import { isDemoMode } from "../../lib/demoMode";

export async function requireAdminOrClinicStaff(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (isDemoMode()) {
    const role = res.locals.demoRole as string | undefined;
    if (role === "admin") {
      res.locals.adminAcctId = "demo-admin-acct-id";
      res.locals.adminRole = "admin";
      res.locals.approverUserId = res.locals.userId;
      res.locals.approverRole = "admin";
      return next();
    }
    if (role === "clinic_staff") {
      res.locals.clinicStaffAcctId = "demo-clinic-staff-acct-id";
      res.locals.adminRole = "clinic_staff";
      res.locals.approverUserId = res.locals.userId;
      res.locals.approverRole = "clinic_staff";
      return next();
    }
    return res.status(403).json({
      error: "Demo: switch to admin or clinic staff role to access this.",
    });
  }

  const userId = res.locals.userId as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const db = getDb();

  const adminRows = await db
    .select({
      id: adminAcct.id,
      role: adminAcct.role,
      active: adminAcct.active,
    })
    .from(adminAcct)
    .where(eq(adminAcct.userId, userId))
    .limit(1);

  const admin = adminRows[0];
  if (admin && admin.active && admin.role === "admin") {
    res.locals.adminAcctId = admin.id;
    res.locals.adminRole = "admin";
    res.locals.approverUserId = userId;
    res.locals.approverRole = "admin";
    return next();
  }

  const staffRows = await db
    .select({
      id: clinicStaffAcct.id,
      active: clinicStaffAcct.active,
    })
    .from(clinicStaffAcct)
    .where(eq(clinicStaffAcct.userId, userId))
    .limit(1);

  const staff = staffRows[0];
  if (!staff || !staff.active) {
    return res.status(403).json({ error: "Access denied" });
  }

  res.locals.clinicStaffAcctId = staff.id;
  res.locals.adminRole = "clinic_staff";
  res.locals.approverUserId = userId;
  res.locals.approverRole = "clinic_staff";
  return next();
}
