import dotenv from "dotenv";
process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });

import { lymphedemaProducts, ocularProducts } from "../../../db/schema";
import { closeDb, getDb } from "../../services/db";

const LYMPHEDEMA_PRODUCTS = [
  {
    name: "AIROS 6 Compression System",
    device: "AIROS 6",
    hcpcs: "E0651",
    garmentType: "compression_pump",
    garmentStyle: "sequential",
    compressionLevel: "gradient",
    manufacturer: "AIROS Medical",
    extremityType: "leg",
    description: "6-chamber sequential compression device for lower extremity lymphedema",
  },
  {
    name: "AIROS 8 Compression System",
    device: "AIROS 8",
    hcpcs: "E0652",
    garmentType: "compression_pump",
    garmentStyle: "sequential",
    compressionLevel: "gradient",
    manufacturer: "AIROS Medical",
    extremityType: "leg",
    description: "8-chamber sequential compression device for advanced lower extremity lymphedema",
  },
  {
    name: "AIROS 6P Compression System",
    device: "AIROS 6P",
    hcpcs: "E0651",
    garmentType: "compression_pump",
    garmentStyle: "peristaltic",
    compressionLevel: "gradient",
    manufacturer: "AIROS Medical",
    extremityType: "arm",
    description: "6-chamber peristaltic compression device for upper extremity lymphedema",
  },
];

const OCULAR_PRODUCTS = [
  // Thin (45μm) — VS45 series
  { name: "VisiDisc Thin 8mm", productVariant: "thin", sizeMm: 8, sku: "VS4508", description: "45μm amniotic membrane disc — 8mm diameter" },
  { name: "VisiDisc Thin 10mm", productVariant: "thin", sizeMm: 10, sku: "VS4510", description: "45μm amniotic membrane disc — 10mm diameter" },
  { name: "VisiDisc Thin 12mm", productVariant: "thin", sizeMm: 12, sku: "VS4512", description: "45μm amniotic membrane disc — 12mm diameter" },
  { name: "VisiDisc Thin 15mm", productVariant: "thin", sizeMm: 15, sku: "VS4515", description: "45μm amniotic membrane disc — 15mm diameter" },
  // Thick (200μm) — VS2000 series
  { name: "VisiDisc Thick 8mm", productVariant: "thick", sizeMm: 8, sku: "VS20008", description: "200μm amniotic membrane disc — 8mm diameter" },
  { name: "VisiDisc Thick 10mm", productVariant: "thick", sizeMm: 10, sku: "VS20010", description: "200μm amniotic membrane disc — 10mm diameter" },
  { name: "VisiDisc Thick 12mm", productVariant: "thick", sizeMm: 12, sku: "VS20012", description: "200μm amniotic membrane disc — 12mm diameter" },
  { name: "VisiDisc Thick 15mm", productVariant: "thick", sizeMm: 15, sku: "VS20015", description: "200μm amniotic membrane disc — 15mm diameter" },
];

export async function seedDemoProductCatalogs(): Promise<number> {
  const db = getDb();
  let total = 0;

  for (const p of LYMPHEDEMA_PRODUCTS) {
    await db
      .insert(lymphedemaProducts)
      .values(p)
      .onConflictDoNothing();
  }
  total += LYMPHEDEMA_PRODUCTS.length;

  for (const p of OCULAR_PRODUCTS) {
    await db
      .insert(ocularProducts)
      .values(p)
      .onConflictDoUpdate({
        target: ocularProducts.sku,
        set: { name: p.name, description: p.description, updatedAt: new Date() },
      });
  }
  total += OCULAR_PRODUCTS.length;

  console.log(`  [demo-product-catalogs] ${LYMPHEDEMA_PRODUCTS.length} lymphedema + ${OCULAR_PRODUCTS.length} ocular products seeded`);
  return total;
}

if (require.main === module) {
  seedDemoProductCatalogs()
    .then((n) => console.log(`\nDone: ${n} products seeded`))
    .catch((err) => {
      console.error("Failed:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try { await closeDb(); } catch { /* ignore */ }
      process.exit(process.exitCode ?? 0);
    });
}
