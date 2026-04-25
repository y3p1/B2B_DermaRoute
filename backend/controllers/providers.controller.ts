import type { Request, Response } from "../http/types";
import { getDb } from "../services/db";
import { providerAcct } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function listProvidersController(_req: Request, res: Response) {
  const db = getDb();

  const rows = await db
    .select({
      id: providerAcct.id,
      clinicName: providerAcct.clinicName,
      npiNumber: providerAcct.npiNumber,
      email: providerAcct.email,
      accountPhone: providerAcct.accountPhone,
    })
    .from(providerAcct)
    .where(eq(providerAcct.active, true))
    .orderBy(providerAcct.clinicName);

  return res.json({ success: true, data: rows });
}
