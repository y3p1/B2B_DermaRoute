import type { NextFunction, Request, Response } from "../http/types";

import { eq } from "drizzle-orm";

import { adminAcct } from "../../db/admin";
import { getDb } from "../services/db";
import { isDemoMode } from "../../lib/demoMode";

export async function requireAdmin(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (isDemoMode()) {
    if (res.locals.demoRole !== "admin") {
      return res
        .status(403)
        .json({ error: "Demo: switch to admin role to access this." });
    }
    const userId = res.locals.userId as string | undefined;
    if (userId) {
      const db = getDb();
      const rows = await db
        .select({ id: adminAcct.id })
        .from(adminAcct)
        .where(eq(adminAcct.userId, userId))
        .limit(1);
      res.locals.adminAcctId = rows[0]?.id;
    }
    res.locals.adminRole = "admin";
    return next();
  }

  const userId = res.locals.userId as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: adminAcct.id,
      role: adminAcct.role,
      active: adminAcct.active,
    })
    .from(adminAcct)
    .where(eq(adminAcct.userId, userId))
    .limit(1);

  const admin = rows[0];
  if (!admin || !admin.active) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (admin.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  res.locals.adminAcctId = admin.id;
  res.locals.adminRole = admin.role;

  return next();
}
