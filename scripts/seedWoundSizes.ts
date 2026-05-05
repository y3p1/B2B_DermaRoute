/**
 * Apply wound_sizes schema changes + seed data.
 *
 * Run with:  npx tsx scripts/seedWoundSizes.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const WOUND_SIZES = [
  // Discs (Round)
  { key: "6mm_disc",  label: "6mm disc (0.283 cm²)",   areaCm2: "0.283",  category: "disc" },
  { key: "12mm_disc", label: "12mm disc (1.131 cm²)",  areaCm2: "1.131",  category: "disc" },
  { key: "15mm_disc", label: "15mm disc (1.767 cm²)",  areaCm2: "1.767",  category: "disc" },
  { key: "16mm_disc", label: "16mm disc (2.011 cm²)",  areaCm2: "2.011",  category: "disc" },

  // Square and Rectangular
  { key: "1x1",       label: "1x1 cm (1 cm²)",         areaCm2: "1",      category: "rectangular" },
  { key: "1.5x1.5",   label: "1.5x1.5 cm (2.25 cm²)", areaCm2: "2.25",   category: "rectangular" },
  { key: "1.5x2",     label: "1.5x2 cm (3 cm²)",       areaCm2: "3",      category: "rectangular" },
  { key: "2x2",       label: "2x2 cm (4 cm²)",         areaCm2: "4",      category: "rectangular" },
  { key: "2x3",       label: "2x3 cm (6 cm²)",         areaCm2: "6",      category: "rectangular" },
  { key: "2x4",       label: "2x4 cm (8 cm²)",         areaCm2: "8",      category: "rectangular" },
  { key: "3x3",       label: "3x3 cm (9 cm²)",         areaCm2: "9",      category: "rectangular" },
  { key: "3x3.5",     label: "3x3.5 cm (10.5 cm²)",   areaCm2: "10.5",   category: "rectangular" },
  { key: "3x4",       label: "3x4 cm (12 cm²)",        areaCm2: "12",     category: "rectangular" },
  { key: "4x4",       label: "4x4 cm (16 cm²)",        areaCm2: "16",     category: "rectangular" },
  { key: "4x6",       label: "4x6 cm (24 cm²)",        areaCm2: "24",     category: "rectangular" },
  { key: "4x8",       label: "4x8 cm (32 cm²)",        areaCm2: "32",     category: "rectangular" },
  { key: "5x5",       label: "5x5 cm (25 cm²)",        areaCm2: "25",     category: "rectangular" },
  { key: "6x8",       label: "6x8 cm (48 cm²)",        areaCm2: "48",     category: "rectangular" },
  { key: "7x7",       label: "7x7 cm (49 cm²)",        areaCm2: "49",     category: "rectangular" },
];

async function seed() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  // Step 1: Add the category column if it doesn't exist
  console.log("1. Adding 'category' column if missing...");
  await sql`
    ALTER TABLE wound_sizes 
    ADD COLUMN IF NOT EXISTS category varchar(32) NOT NULL DEFAULT 'rectangular'
  `;
  console.log("   ✓ category column ready\n");

  // Step 2: Add unique constraint on key if it doesn't exist
  console.log("2. Adding unique constraint on 'key' if missing...");
  try {
    await sql`
      ALTER TABLE wound_sizes
      ADD CONSTRAINT wound_sizes_key_unique UNIQUE (key)
    `;
    console.log("   ✓ unique constraint added\n");
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "42710"
    ) {
      // constraint already exists
      console.log("   ✓ unique constraint already exists\n");
    } else {
      throw err;
    }
  }

  // Step 3: Upsert all wound sizes
  console.log("3. Seeding wound sizes...\n");
  for (const ws of WOUND_SIZES) {
    await sql`
      INSERT INTO wound_sizes (key, label, area_cm2, category)
      VALUES (${ws.key}, ${ws.label}, ${ws.areaCm2}, ${ws.category})
      ON CONFLICT (key) DO UPDATE SET
        label = EXCLUDED.label,
        area_cm2 = EXCLUDED.area_cm2,
        category = EXCLUDED.category
    `;
    console.log(`   ✓ ${ws.label}`);
  }

  console.log(`\nDone! ${WOUND_SIZES.length} wound sizes seeded.`);
  await sql.end();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
