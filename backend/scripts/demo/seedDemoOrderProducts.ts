import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { orderProducts, bvRequests, manufacturers, providerAcct } from "../../../db/schema";
import { getDb } from "../../services/db";

faker.seed(42);

const RISK_TIERS = [
  "critical", "critical", "critical",
  "high", "high", "high", "high", "high",
  "standard", "standard", "standard", "standard", "standard",
  "standard", "standard", "standard", "standard", "standard",
  "low", "low", "low", "low", "low",
  "low", "low", "low", "low", "low",
  "low",
] as const;

const ORDER_STATUSES = ["pending", "shipped", "completed", "completed", "completed", "cancelled"] as const;

const PRODUCT_NAMES = [
  "OX 4x4 Wound Matrix", "OX 2x2 Wound Matrix", "TiDE Dermal Scaffold",
  "TiGer Wound Cover 4x8", "Extremity Shield 6x6", "Venture Skin Graft",
  "OX Disc 20cm2", "TiDE Disc 40cm2", "TiGer 2x2 Patch",
];

export async function seedDemoOrderProducts(): Promise<number> {
  const db = getDb();

  const providerRows = await db
    .select({ id: providerAcct.id })
    .from(providerAcct)
    .where(eq(providerAcct.email, "demo-provider@dermaroute-demo.example.com"))
    .limit(1);

  if (!providerRows[0]) {
    throw new Error("Demo provider not found — run seedDemoUsers first");
  }

  const mfgRows = await db.select({ id: manufacturers.id }).from(manufacturers).limit(5);
  if (mfgRows.length === 0) {
    throw new Error("No manufacturers found — run seed:manufacturers:q1 first");
  }

  const bvRows = await db
    .select({ id: bvRequests.id })
    .from(bvRequests)
    .limit(15);

  const rows = RISK_TIERS.map((riskTier, i) => {
    const mfg = mfgRows[i % mfgRows.length];
    const bvRow = bvRows.length > 0 ? bvRows[i % bvRows.length] : undefined;

    return {
      name: PRODUCT_NAMES[i % PRODUCT_NAMES.length],
      manufacturerId: mfg.id,
      status: ORDER_STATUSES[i % ORDER_STATUSES.length],
      bvRequestId: bvRow?.id ?? null,
      createdBy: providerRows[0].id,
      createdByType: "provider",
      deliveryAddress: faker.location.streetAddress(),
      deliveryCity: faker.location.city(),
      deliveryState: faker.location.state({ abbreviated: true }),
      deliveryZip: faker.location.zipCode(),
      contactPhone: faker.phone.number({ style: "national" }),
      riskScore: riskTier === "critical" ? faker.number.int({ min: 85, max: 100 })
        : riskTier === "high" ? faker.number.int({ min: 65, max: 84 })
        : riskTier === "standard" ? faker.number.int({ min: 35, max: 64 })
        : faker.number.int({ min: 0, max: 34 }),
      riskTier,
      requiresManualSubmission: true,
      active: true,
    };
  });

  await db.insert(orderProducts).values(rows);

  return rows.length;
}
