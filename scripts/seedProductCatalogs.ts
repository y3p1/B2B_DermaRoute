/**
 * Seed lymphedema and ocular product catalogs.
 *
 * Run with:  npx tsx scripts/seedProductCatalogs.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const LYMPHEDEMA_PRODUCTS = [
  { name: "AIROS 6 — Below Knee Stocking CL I", device: "AIROS 6", hcpcs: "E0651", garment_type: "Below Knee Stocking", garment_style: "Full Leg with Foot", compression_level: "CL1", manufacturer: "Medi USA", extremity_type: "lower" },
  { name: "AIROS 6 — Thigh Stocking CL II", device: "AIROS 6", hcpcs: "E0651", garment_type: "Thigh Stocking", garment_style: "Full Leg", compression_level: "CLII", manufacturer: "BSN Jobst/Farrow", extremity_type: "lower" },
  { name: "AIROS 6 — Pantyhose CL III", device: "AIROS 6", hcpcs: "E0651", garment_type: "Pantyhose", garment_style: "Full Leg with Foot", compression_level: "CLIII", manufacturer: "Juzo", extremity_type: "lower" },
  { name: "AIROS 8 — Below Knee Stocking CL II", device: "AIROS 8", hcpcs: "E0652", garment_type: "Below Knee Stocking", garment_style: "Calf", compression_level: "CLII", manufacturer: "Sigvaris", extremity_type: "lower" },
  { name: "AIROS 8 — Thigh Stocking CL II", device: "AIROS 8", hcpcs: "E0652", garment_type: "Thigh Stocking", garment_style: "Full Leg", compression_level: "CLII", manufacturer: "Medi USA", extremity_type: "lower" },
  { name: "AIROS 6P — Arm Sleeve CL I", device: "AIROS 6P", hcpcs: "E0651", garment_type: "Arm Sleeve", garment_style: "Wrist to Axilla", compression_level: "CL1", manufacturer: "Medi USA", extremity_type: "upper" },
  { name: "AIROS 6P — Gauntlet CL II", device: "AIROS 6P", hcpcs: "E0651", garment_type: "Gauntlet", garment_style: "Fingertips to Axilla", compression_level: "CLII", manufacturer: "L&R", extremity_type: "upper" },
  { name: "AIROS 6P — Glove Sleeve Combo CL I", device: "AIROS 6P", hcpcs: "E0651", garment_type: "Glove Sleeve Combo", garment_style: "Fingertips to Axilla", compression_level: "CL1", manufacturer: "Juzo", extremity_type: "upper" },
];

const OCULAR_PRODUCTS = [
  { name: "VisiDisc Thin 8mm", product_variant: "thin", size_mm: 8, sku: "VS4508" },
  { name: "VisiDisc Thin 10mm", product_variant: "thin", size_mm: 10, sku: "VS4510" },
  { name: "VisiDisc Thin 12mm", product_variant: "thin", size_mm: 12, sku: "VS4512" },
  { name: "VisiDisc Thin 15mm", product_variant: "thin", size_mm: 15, sku: "VS4515" },
  { name: "VisiDisc Thick 8mm", product_variant: "thick", size_mm: 8, sku: "VS20008" },
  { name: "VisiDisc Thick 10mm", product_variant: "thick", size_mm: 10, sku: "VS20010" },
  { name: "VisiDisc Thick 12mm", product_variant: "thick", size_mm: 12, sku: "VS20012" },
  { name: "VisiDisc Thick 15mm", product_variant: "thick", size_mm: 15, sku: "VS20015" },
];

async function seed() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  console.log("Seeding lymphedema product catalog...");
  for (const p of LYMPHEDEMA_PRODUCTS) {
    await sql`
      INSERT INTO lymphedema_products (name, device, hcpcs, garment_type, garment_style, compression_level, manufacturer, extremity_type)
      VALUES (${p.name}, ${p.device}, ${p.hcpcs}, ${p.garment_type}, ${p.garment_style}, ${p.compression_level}, ${p.manufacturer}, ${p.extremity_type})
      ON CONFLICT DO NOTHING
    `;
    console.log(`  + ${p.name}`);
  }

  console.log("\nSeeding ocular product catalog...");
  for (const p of OCULAR_PRODUCTS) {
    await sql`
      INSERT INTO ocular_products (name, product_variant, size_mm, sku)
      VALUES (${p.name}, ${p.product_variant}, ${p.size_mm}, ${p.sku})
      ON CONFLICT (sku) DO NOTHING
    `;
    console.log(`  + ${p.name} (${p.sku})`);
  }

  console.log("\nDone.");
  await sql.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
