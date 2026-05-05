import { faker } from "@faker-js/faker";
import { eq, inArray } from "drizzle-orm";
import { woundMeasurements, bvRequests, providerAcct } from "../../../db/schema";
import { getDb } from "../../services/db";

faker.seed(42);

export async function seedDemoWoundMeasurements(): Promise<number> {
  const db = getDb();

  const providerRows = await db
    .select({ id: providerAcct.id })
    .from(providerAcct)
    .where(eq(providerAcct.email, "demo-provider@dermaroute-demo.example.com"))
    .limit(1);

  if (!providerRows[0]) {
    throw new Error("Demo provider not found — run seedDemoUsers first");
  }

  const completedRows = await db
    .select({ id: bvRequests.id })
    .from(bvRequests)
    .where(inArray(bvRequests.status, ["completed", "approved"]))
    .limit(8);

  if (completedRows.length === 0) return 0;

  const rows: {
    bvRequestId: string;
    sizeCm2: string;
    measuredAt: string;
    recordedByType: string;
    notes: string | null;
  }[] = [];

  for (const bvRow of completedRows) {
    const baselineArea = faker.number.float({ min: 10, max: 50, fractionDigits: 1 });
    const weekCount = faker.number.int({ min: 3, max: 6 });

    for (let week = 0; week < weekCount; week++) {
      const reductionFactor = 1 - week * faker.number.float({ min: 0.08, max: 0.18, fractionDigits: 2 });
      const area = Math.max(0.5, baselineArea * reductionFactor);
      const measuredAt = new Date();
      measuredAt.setDate(measuredAt.getDate() - (weekCount - week) * 7);

      rows.push({
        bvRequestId: bvRow.id,
        sizeCm2: area.toFixed(2),
        measuredAt: measuredAt.toISOString().slice(0, 10),
        recordedByType: "provider",
        notes: week === 0 ? "Baseline measurement" : null,
      });
    }
  }

  await db.insert(woundMeasurements).values(rows);

  return rows.length;
}
