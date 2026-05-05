import dotenv from "dotenv";
process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });

// ...existing code...
import { getDb, closeDb } from "../services/db";
import { woundSizes, orderProducts, manufacturers } from "../../db/schema";

const woundSeed = [
  {
    key: "disc_6mm",
    label: "6mm Disc (0.283 cm²)",
    area: 0.283,
    metadata: { type: "disc", diameter_mm: 6 },
  },
  {
    key: "disc_12mm",
    label: "12mm Disc (1.131 cm²)",
    area: 1.131,
    metadata: { type: "disc", diameter_mm: 12 },
  },
  {
    key: "disc_15mm",
    label: "15mm Disc (1.767 cm²)",
    area: 1.767,
    metadata: { type: "disc", diameter_mm: 15 },
  },
  {
    key: "disc_16mm",
    label: "16mm Disc (2.011 cm²)",
    area: 2.011,
    metadata: { type: "disc", diameter_mm: 16 },
  },
  {
    key: "sq_1x1",
    label: "1x1 cm (1 cm²)",
    area: 1,
    metadata: { w: 1, h: 1 },
  },
  {
    key: "sq_1_5x1_5",
    label: "1.5x1.5 cm (2.25 cm²)",
    area: 2.25,
    metadata: { w: 1.5, h: 1.5 },
  },
  {
    key: "sq_1_5x2",
    label: "1.5x2 cm (3 cm²)",
    area: 3,
    metadata: { w: 1.5, h: 2 },
  },
  {
    key: "sq_2x2",
    label: "2x2 cm (4 cm²)",
    area: 4,
    metadata: { w: 2, h: 2 },
  },
  {
    key: "sq_2x3",
    label: "2x3 cm (6 cm²)",
    area: 6,
    metadata: { w: 2, h: 3 },
  },
  {
    key: "sq_2x4",
    label: "2x4 cm (8 cm²)",
    area: 8,
    metadata: { w: 2, h: 4 },
  },
  {
    key: "sq_3x3",
    label: "3x3 cm (9 cm²)",
    area: 9,
    metadata: { w: 3, h: 3 },
  },
  {
    key: "sq_3x3_5",
    label: "3x3.5 cm (10.5 cm²)",
    area: 10.5,
    metadata: { w: 3, h: 3.5 },
  },
  {
    key: "sq_3x4",
    label: "3x4 cm (12 cm²)",
    area: 12,
    metadata: { w: 3, h: 4 },
  },
  {
    key: "sq_4x4",
    label: "4x4 cm (16 cm²)",
    area: 16,
    metadata: { w: 4, h: 4 },
  },
  {
    key: "sq_4x6",
    label: "4x6 cm (24 cm²)",
    area: 24,
    metadata: { w: 4, h: 6 },
  },
  {
    key: "sq_4x8",
    label: "4x8 cm (32 cm²)",
    area: 32,
    metadata: { w: 4, h: 8 },
  },
  {
    key: "sq_5x5",
    label: "5x5 cm (25 cm²)",
    area: 25,
    metadata: { w: 5, h: 5 },
  },
  {
    key: "sq_6x8",
    label: "6x8 cm (48 cm²)",
    area: 48,
    metadata: { w: 6, h: 8 },
  },
  {
    key: "sq_7x7",
    label: "7x7 cm (49 cm²)",
    area: 49,
    metadata: { w: 7, h: 7 },
  },
];

export async function seedWoundSizes(): Promise<number> {
  const db = getDb();
  let inserted = 0;

  for (const w of woundSeed) {
    const result = await db
      .insert(woundSizes)
      .values({
        key: w.key,
        label: w.label,
        areaCm2: String(w.area),
        metadata: w.metadata,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: woundSizes.id });
    if (result.length > 0) inserted++;
  }

  return inserted;
}

async function main() {
  const db = getDb();

  console.log("Seeding wound sizes...");
  await seedWoundSizes();

  // Fetch all wound size UUIDs by key
  const woundRows = await db
    .select({ id: woundSizes.id, key: woundSizes.key })
    .from(woundSizes);
  const woundKeyToId = new Map<string, string>(
    woundRows.map((r) => [r.key, r.id]),
  );

  // Fetch all manufacturer UUIDs by name
  const manufacturerRows = await db
    .select({ id: manufacturers.id, name: manufacturers.name })
    .from(manufacturers);
  const manufacturerNameToId = new Map<string, string>(
    manufacturerRows.map((r) => [r.name, r.id]),
  );

  // Fetch all product UUIDs by name (for relation)
  let productNameToId = new Map<string, string>();
  try {
    const { products } = await import("../../db/products");
    const productRows = await db
      .select({ id: products.id, name: products.name })
      .from(products);
    productNameToId = new Map<string, string>(
      productRows.map((r) => [r.name, r.id]),
    );
  } catch {
    // If products table not present, skip
    productNameToId = new Map();
  }

  console.log("Seeding sample product (idempotent)...");

  // Example: Use UUIDs for relations in orderProducts
  const allowedWoundIds = ["sq_2x2", "sq_3x3", "disc_12mm"]
    .map((k) => woundKeyToId.get(k))
    .filter(Boolean);

  // Example: Use manufacturer and product UUIDs for relations in orderProducts
  const manufacturerId = manufacturerNameToId.get("NovaTissue Labs");
  const productId = productNameToId.get(
    "NovaTissue Advanced Wound Matrix 15mm",
  );
  if (!manufacturerId || !productId) {
    throw new Error(
      `Cannot seed orderProducts: manufacturerId or productId is missing. manufacturerId: ${manufacturerId}, productId: ${productId}`,
    );
  }

  await db
    .insert(orderProducts)
    .values({
      name: "NovaTissue Advanced Wound Matrix 15mm",
      sku: "NTL-AWM-15MM",
      productId: productId,
      manufacturerId: manufacturerId,
      description:
        "NovaTissue Advanced Wound Matrix 15mm disc for chronic wounds",
      woundTypes: ["ulcer", "surgical"],
      allowedWoundSizes: allowedWoundIds,
      insuranceCoverage: { notes: "coverage depends on plan" },
      requiresManualSubmission: true,
      benefitsVerificationFormVersion: "v1.0",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  console.log("BV seed complete.");
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error("Failed to seed BV data:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await closeDb();
      } catch {
        // ignore
      }
      process.exit(process.exitCode ?? 0);
    });
}
