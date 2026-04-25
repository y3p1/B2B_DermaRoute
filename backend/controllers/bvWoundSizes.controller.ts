import type { Request, Response } from "../http/types";
import { getDb } from "../services/db";
import { woundSizes } from "../../db/schema";

export async function listWoundSizesController(_req: Request, res: Response) {
  const db = getDb();

  const rows = await db
    .select({
      key: woundSizes.key,
      label: woundSizes.label,
      area: woundSizes.areaCm2,
      category: woundSizes.category,
    })
    .from(woundSizes)
    .orderBy(woundSizes.category, woundSizes.areaCm2);

  return res.json({ success: true, data: rows });
}
