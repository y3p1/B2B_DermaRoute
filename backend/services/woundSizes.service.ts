import { z } from "zod";
import { getDb } from "./db";
import { woundSizes } from "../../db/bv-products";
import { eq } from "drizzle-orm";

export async function listWoundSizes() {
  const db = getDb();

  const result = await db
    .select({
      id: woundSizes.id,
      key: woundSizes.key,
      label: woundSizes.label,
      areaCm2: woundSizes.areaCm2,
      category: woundSizes.category,
      metadata: woundSizes.metadata,
      createdAt: woundSizes.createdAt,
    })
    .from(woundSizes)
    .orderBy(woundSizes.category, woundSizes.areaCm2);

  return result;
}

export async function getWoundSizeById(id: string) {
  const db = getDb();

  const result = await db
    .select()
    .from(woundSizes)
    .where(eq(woundSizes.id, id))
    .limit(1);

  return result[0] ?? null;
}
