import dotenv from "dotenv";
process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });

import { and, eq } from "drizzle-orm";
import { getDb, closeDb } from "../services/db";
import { products } from "../../db/products";
import { manufacturers } from "../../db/manufacturers";
import { woundSizes } from "../../db/bv-products";

async function getManufacturerId(
  db: ReturnType<typeof getDb>,
  name: string,
): Promise<string | undefined> {
  const result = await db
    .select({ id: manufacturers.id })
    .from(manufacturers)
    .where(eq(manufacturers.name, name));
  return result[0]?.id;
}

// Area in cm² per wound size key (unitSize is stored as integer cm²)
const AREA_CM2: Record<string, number> = {
  disc_15mm: 2,
  sq_1x1: 1,
  sq_2x2: 4,
  sq_2x3: 6,
  sq_3x3: 9,
  sq_3x4: 12,
  sq_4x4: 16,
  sq_4x6: 24,
  sq_4x8: 32,
};

/**
 * Derive all pricing fields from the three source values.
 *
 * Formulas (per business rules):
 *   costPerCm2      = payRatePerCm2 × commission
 *   payRatePerGraft = unitSize × payRatePerCm2
 *   costPerGraft    = unitSize × costPerCm2
 *   estAoc100       = payRatePerGraft − costPerGraft
 *   estAoc80        = (payRatePerGraft × 0.8) − costPerGraft
 */
function derive(payRate: number, commission: number, areaCm2: number) {
  const costCm2 = parseFloat((payRate * commission).toFixed(2));
  const payGraft = parseFloat((payRate * areaCm2).toFixed(2));
  const costGraft = parseFloat((costCm2 * areaCm2).toFixed(2));
  const aoc100 = parseFloat((payGraft - costGraft).toFixed(2));
  const aoc80 = parseFloat((payGraft * 0.8 - costGraft).toFixed(2));
  return {
    costPerCm2: String(costCm2),
    payRatePerGraft: String(payGraft),
    costPerGraft: String(costGraft),
    estAoc100: String(aoc100),
    estAoc80: String(aoc80),
  };
}

type ProductSeed = {
  qCode: string | null;
  name: string;
  manufacturer: string;
  commercial: boolean;
  description: string;
  quarter: number;
  year: number;
  woundSizeKey: string;
  payRatePerCm2: number;
  commission: number;
};

// ── Product definitions ───────────────────────────────────────────────────────
// payRatePerCm2 — Medicare/Medicaid reimbursement rate per cm² (public CMS data)
// commission    — set to 0 here; real values are configured outside the repo

const productData: ProductSeed[] = [

  // ── Ox Wound Matrix (Q4169) — single-layer acellular dermal matrix ─────────
  { qCode: "Q4169", name: "Ox Wound Matrix 1x1cm",   manufacturer: "Ox", commercial: false, description: "Ox Wound Matrix 1x1cm — acellular dermal matrix for small chronic wounds",            quarter: 1, year: 2026, woundSizeKey: "sq_1x1",  payRatePerCm2: 97.50,  commission: 0 },
  { qCode: "Q4169", name: "Ox Wound Matrix 2x2cm",   manufacturer: "Ox", commercial: false, description: "Ox Wound Matrix 2x2cm — acellular dermal matrix for chronic wound management",        quarter: 1, year: 2026, woundSizeKey: "sq_2x2",  payRatePerCm2: 97.50,  commission: 0 },
  { qCode: "Q4169", name: "Ox Wound Matrix 2x3cm",   manufacturer: "Ox", commercial: false, description: "Ox Wound Matrix 2x3cm — acellular dermal matrix for venous leg ulcers",              quarter: 1, year: 2026, woundSizeKey: "sq_2x3",  payRatePerCm2: 97.50,  commission: 0 },
  { qCode: "Q4169", name: "Ox Wound Matrix 3x3cm",   manufacturer: "Ox", commercial: false, description: "Ox Wound Matrix 3x3cm — acellular dermal matrix for diabetic foot ulcers",           quarter: 1, year: 2026, woundSizeKey: "sq_3x3",  payRatePerCm2: 97.50,  commission: 0 },
  { qCode: "Q4169", name: "Ox Wound Matrix 3x4cm",   manufacturer: "Ox", commercial: false, description: "Ox Wound Matrix 3x4cm — acellular dermal matrix for pressure ulcers",               quarter: 1, year: 2026, woundSizeKey: "sq_3x4",  payRatePerCm2: 97.50,  commission: 0 },
  { qCode: "Q4169", name: "Ox Wound Matrix 4x4cm",   manufacturer: "Ox", commercial: false, description: "Ox Wound Matrix 4x4cm — acellular dermal matrix for large chronic wounds",           quarter: 1, year: 2026, woundSizeKey: "sq_4x4",  payRatePerCm2: 97.50,  commission: 0 },

  // ── Ox Advanced Tissue Graft (Q4203) — multi-layer amniotic membrane ───────
  { qCode: "Q4203", name: "Ox Advanced Tissue Graft 2x3cm", manufacturer: "Ox", commercial: false, description: "Ox Advanced Tissue Graft 2x3cm — multi-layer amniotic membrane allograft for complex wounds",   quarter: 1, year: 2026, woundSizeKey: "sq_2x3", payRatePerCm2: 142.00, commission: 0 },
  { qCode: "Q4203", name: "Ox Advanced Tissue Graft 3x4cm", manufacturer: "Ox", commercial: false, description: "Ox Advanced Tissue Graft 3x4cm — multi-layer amniotic membrane allograft for ulcer treatment", quarter: 1, year: 2026, woundSizeKey: "sq_3x4", payRatePerCm2: 142.00, commission: 0 },
  { qCode: "Q4203", name: "Ox Advanced Tissue Graft 4x4cm", manufacturer: "Ox", commercial: false, description: "Ox Advanced Tissue Graft 4x4cm — multi-layer amniotic membrane allograft for non-healing wounds", quarter: 1, year: 2026, woundSizeKey: "sq_4x4", payRatePerCm2: 142.00, commission: 0 },
  { qCode: "Q4203", name: "Ox Advanced Tissue Graft 4x6cm", manufacturer: "Ox", commercial: false, description: "Ox Advanced Tissue Graft 4x6cm — multi-layer amniotic membrane allograft for large wound beds",  quarter: 1, year: 2026, woundSizeKey: "sq_4x6", payRatePerCm2: 142.00, commission: 0 },
  { qCode: "Q4203", name: "Ox Advanced Tissue Graft 4x8cm", manufacturer: "Ox", commercial: false, description: "Ox Advanced Tissue Graft 4x8cm — multi-layer amniotic membrane allograft for extensive ulcers",  quarter: 1, year: 2026, woundSizeKey: "sq_4x8", payRatePerCm2: 142.00, commission: 0 },

  // ── Tides Regenerative Scaffold (Q4181) — bilayered porcine collagen ───────
  { qCode: "Q4181", name: "Tides Regenerative Scaffold 2x2cm", manufacturer: "Tides", commercial: false, description: "Tides Regenerative Scaffold 2x2cm — bilayered porcine collagen scaffold for tissue repair",      quarter: 1, year: 2026, woundSizeKey: "sq_2x2", payRatePerCm2: 88.75, commission: 0 },
  { qCode: "Q4181", name: "Tides Regenerative Scaffold 2x3cm", manufacturer: "Tides", commercial: false, description: "Tides Regenerative Scaffold 2x3cm — bilayered porcine collagen scaffold for venous ulcers",      quarter: 1, year: 2026, woundSizeKey: "sq_2x3", payRatePerCm2: 88.75, commission: 0 },
  { qCode: "Q4181", name: "Tides Regenerative Scaffold 3x4cm", manufacturer: "Tides", commercial: false, description: "Tides Regenerative Scaffold 3x4cm — bilayered porcine collagen scaffold for surgical wounds",    quarter: 1, year: 2026, woundSizeKey: "sq_3x4", payRatePerCm2: 88.75, commission: 0 },
  { qCode: "Q4181", name: "Tides Regenerative Scaffold 4x4cm", manufacturer: "Tides", commercial: false, description: "Tides Regenerative Scaffold 4x4cm — bilayered porcine collagen scaffold for pressure injuries",  quarter: 1, year: 2026, woundSizeKey: "sq_4x4", payRatePerCm2: 88.75, commission: 0 },

  // ── Tides Collagen Membrane (Q4256) — dehydrated amniotic chorion ──────────
  { qCode: "Q4256", name: "Tides Collagen Membrane 3x3cm", manufacturer: "Tides", commercial: false, description: "Tides Collagen Membrane 3x3cm — dehydrated amniotic chorion membrane for chronic ulcers",        quarter: 1, year: 2026, woundSizeKey: "sq_3x3", payRatePerCm2: 165.00, commission: 0 },
  { qCode: "Q4256", name: "Tides Collagen Membrane 3x4cm", manufacturer: "Tides", commercial: false, description: "Tides Collagen Membrane 3x4cm — dehydrated amniotic chorion membrane for surgical wounds",       quarter: 1, year: 2026, woundSizeKey: "sq_3x4", payRatePerCm2: 165.00, commission: 0 },
  { qCode: "Q4256", name: "Tides Collagen Membrane 4x4cm", manufacturer: "Tides", commercial: false, description: "Tides Collagen Membrane 4x4cm — dehydrated amniotic chorion membrane for diabetic foot ulcers",  quarter: 1, year: 2026, woundSizeKey: "sq_4x4", payRatePerCm2: 165.00, commission: 0 },
  { qCode: "Q4256", name: "Tides Collagen Membrane 4x6cm", manufacturer: "Tides", commercial: false, description: "Tides Collagen Membrane 4x6cm — dehydrated amniotic chorion membrane for large wound beds",      quarter: 1, year: 2026, woundSizeKey: "sq_4x6", payRatePerCm2: 165.00, commission: 0 },

  // ── Tiger Skin Substitute (Q4146) — cryopreserved amniotic membrane ─────────
  { qCode: "Q4146", name: "Tiger Skin Substitute 2x2cm", manufacturer: "Tiger", commercial: false, description: "Tiger Skin Substitute 2x2cm — cryopreserved amniotic membrane allograft for DFU management",       quarter: 1, year: 2026, woundSizeKey: "sq_2x2", payRatePerCm2: 75.25, commission: 0 },
  { qCode: "Q4146", name: "Tiger Skin Substitute 3x3cm", manufacturer: "Tiger", commercial: false, description: "Tiger Skin Substitute 3x3cm — cryopreserved amniotic membrane allograft for VLU management",       quarter: 1, year: 2026, woundSizeKey: "sq_3x3", payRatePerCm2: 75.25, commission: 0 },
  { qCode: "Q4146", name: "Tiger Skin Substitute 3x4cm", manufacturer: "Tiger", commercial: false, description: "Tiger Skin Substitute 3x4cm — cryopreserved amniotic membrane allograft for pressure ulcers",     quarter: 1, year: 2026, woundSizeKey: "sq_3x4", payRatePerCm2: 75.25, commission: 0 },
  { qCode: "Q4146", name: "Tiger Skin Substitute 4x4cm", manufacturer: "Tiger", commercial: false, description: "Tiger Skin Substitute 4x4cm — cryopreserved amniotic membrane allograft for full-thickness wounds", quarter: 1, year: 2026, woundSizeKey: "sq_4x4", payRatePerCm2: 75.25, commission: 0 },

  // ── Tiger BioGraft (Q4217) — umbilical cord-derived allograft ───────────────
  { qCode: "Q4217", name: "Tiger BioGraft 2x2cm", manufacturer: "Tiger", commercial: false, description: "Tiger BioGraft 2x2cm — umbilical cord-derived allograft for venous leg ulcers",        quarter: 1, year: 2026, woundSizeKey: "sq_2x2", payRatePerCm2: 118.50, commission: 0 },
  { qCode: "Q4217", name: "Tiger BioGraft 3x3cm", manufacturer: "Tiger", commercial: false, description: "Tiger BioGraft 3x3cm — umbilical cord-derived allograft for neuropathic ulcers",        quarter: 1, year: 2026, woundSizeKey: "sq_3x3", payRatePerCm2: 118.50, commission: 0 },
  { qCode: "Q4217", name: "Tiger BioGraft 4x4cm", manufacturer: "Tiger", commercial: false, description: "Tiger BioGraft 4x4cm — umbilical cord-derived allograft for large diabetic foot ulcers", quarter: 1, year: 2026, woundSizeKey: "sq_4x4", payRatePerCm2: 118.50, commission: 0 },

  // ── Extremity Care Wound Dressing (Q4195) — dHACM ───────────────────────────
  { qCode: "Q4195", name: "Extremity Care Wound Dressing 3x3cm", manufacturer: "Extremity Care", commercial: false, description: "Extremity Care Wound Dressing 3x3cm — dHACM for extremity wounds",      quarter: 1, year: 2026, woundSizeKey: "sq_3x3", payRatePerCm2: 82.00, commission: 0 },
  { qCode: "Q4195", name: "Extremity Care Wound Dressing 4x4cm", manufacturer: "Extremity Care", commercial: false, description: "Extremity Care Wound Dressing 4x4cm — dHACM for pressure injuries",     quarter: 1, year: 2026, woundSizeKey: "sq_4x4", payRatePerCm2: 82.00, commission: 0 },
  { qCode: "Q4195", name: "Extremity Care Wound Dressing 4x6cm", manufacturer: "Extremity Care", commercial: false, description: "Extremity Care Wound Dressing 4x6cm — dHACM for large extremity wounds", quarter: 1, year: 2026, woundSizeKey: "sq_4x6", payRatePerCm2: 82.00, commission: 0 },

  // ── Extremity Care Matrix Graft (Q4176) — lyophilized placental collagen ────
  { qCode: "Q4176", name: "Extremity Care Matrix Graft 4x4cm", manufacturer: "Extremity Care", commercial: false, description: "Extremity Care Matrix Graft 4x4cm — lyophilized placental collagen matrix for pressure ulcers",     quarter: 1, year: 2026, woundSizeKey: "sq_4x4", payRatePerCm2: 155.00, commission: 0 },
  { qCode: "Q4176", name: "Extremity Care Matrix Graft 4x6cm", manufacturer: "Extremity Care", commercial: false, description: "Extremity Care Matrix Graft 4x6cm — lyophilized placental collagen matrix for large wound beds",    quarter: 1, year: 2026, woundSizeKey: "sq_4x6", payRatePerCm2: 155.00, commission: 0 },
  { qCode: "Q4176", name: "Extremity Care Matrix Graft 4x8cm", manufacturer: "Extremity Care", commercial: false, description: "Extremity Care Matrix Graft 4x8cm — lyophilized placental collagen matrix for extensive coverage", quarter: 1, year: 2026, woundSizeKey: "sq_4x8", payRatePerCm2: 155.00, commission: 0 },

  // ── Venture — commercial (payRate expressed as per-cm² equivalent) ──────────
  // payRatePerGraft = unitSize × payRatePerCm2; commission = 0 across the line

  // Venture Advanced Wound Matrix
  { qCode: null, name: "Venture Advanced Wound Matrix 15mm", manufacturer: "Venture", commercial: true, description: "Venture Advanced Wound Matrix 15mm disc — commercially insured bilayered wound matrix for small wounds",    quarter: 1, year: 2026, woundSizeKey: "disc_15mm", payRatePerCm2: 225.00, commission: 0 },
  { qCode: null, name: "Venture Advanced Wound Matrix 2x2cm", manufacturer: "Venture", commercial: true, description: "Venture Advanced Wound Matrix 2x2cm — commercially insured bilayered wound matrix for chronic wounds",    quarter: 1, year: 2026, woundSizeKey: "sq_2x2",   payRatePerCm2: 225.00, commission: 0 },
  { qCode: null, name: "Venture Advanced Wound Matrix 3x4cm", manufacturer: "Venture", commercial: true, description: "Venture Advanced Wound Matrix 3x4cm — commercially insured bilayered wound matrix for moderate wounds",   quarter: 1, year: 2026, woundSizeKey: "sq_3x4",   payRatePerCm2: 225.00, commission: 0 },

  // Venture Regenerative Scaffold
  { qCode: null, name: "Venture Regenerative Scaffold 2x2cm", manufacturer: "Venture", commercial: true, description: "Venture Regenerative Scaffold 2x2cm — commercially insured synthetic ECM scaffold for tissue repair",     quarter: 1, year: 2026, woundSizeKey: "sq_2x2", payRatePerCm2: 192.50, commission: 0 },
  { qCode: null, name: "Venture Regenerative Scaffold 3x4cm", manufacturer: "Venture", commercial: true, description: "Venture Regenerative Scaffold 3x4cm — commercially insured synthetic ECM scaffold for surgical wounds",   quarter: 1, year: 2026, woundSizeKey: "sq_3x4", payRatePerCm2: 192.50, commission: 0 },
  { qCode: null, name: "Venture Regenerative Scaffold 4x4cm", manufacturer: "Venture", commercial: true, description: "Venture Regenerative Scaffold 4x4cm — commercially insured synthetic ECM scaffold for large tissue defects", quarter: 1, year: 2026, woundSizeKey: "sq_4x4", payRatePerCm2: 192.50, commission: 0 },

  // Venture Collagen Graft
  { qCode: null, name: "Venture Collagen Graft 3x4cm", manufacturer: "Venture", commercial: true, description: "Venture Collagen Graft 3x4cm — commercially insured equine-derived collagen graft for surgical wounds",     quarter: 1, year: 2026, woundSizeKey: "sq_3x4", payRatePerCm2: 246.00, commission: 0 },
  { qCode: null, name: "Venture Collagen Graft 4x4cm", manufacturer: "Venture", commercial: true, description: "Venture Collagen Graft 4x4cm — commercially insured equine-derived collagen graft for deep tissue wounds",  quarter: 1, year: 2026, woundSizeKey: "sq_4x4", payRatePerCm2: 246.00, commission: 0 },
  { qCode: null, name: "Venture Collagen Graft 4x6cm", manufacturer: "Venture", commercial: true, description: "Venture Collagen Graft 4x6cm — commercially insured equine-derived collagen graft for large wound beds",   quarter: 1, year: 2026, woundSizeKey: "sq_4x6", payRatePerCm2: 246.00, commission: 0 },
];

export async function seedProducts() {
  const db = getDb();

  // Clear existing Q1 2026 products so the seed is idempotent
  await db
    .delete(products)
    .where(and(eq(products.quarter, 1), eq(products.year, 2026)));

  // Build wound size key→id lookup
  const woundRows = await db
    .select({ id: woundSizes.id, key: woundSizes.key })
    .from(woundSizes);
  const woundKeyToId = new Map(woundRows.map((r) => [r.key, r.id]));

  let inserted = 0;
  let skipped = 0;

  for (const prod of productData) {
    const manufacturerId = await getManufacturerId(db, prod.manufacturer);
    if (!manufacturerId) {
      console.warn(`Manufacturer not found: ${prod.manufacturer} — run seedManufacturersQ12026 first.`);
      skipped++;
      continue;
    }
    const woundSizeId = woundKeyToId.get(prod.woundSizeKey);
    if (!woundSizeId) {
      console.warn(`Wound size not found for key "${prod.woundSizeKey}" — run seedBV first.`);
      skipped++;
      continue;
    }

    const areaCm2 = AREA_CM2[prod.woundSizeKey];
    if (areaCm2 === undefined) {
      console.warn(`No area mapping for wound size key "${prod.woundSizeKey}" — skipping.`);
      skipped++;
      continue;
    }

    const pricing = derive(prod.payRatePerCm2, prod.commission, areaCm2);

    await db.insert(products).values({
      qCode: prod.qCode,
      name: prod.name,
      commercial: prod.commercial,
      manufacturerId,
      woundSizeId,
      description: prod.description,
      quarter: prod.quarter,
      year: prod.year,
      unitSize: areaCm2,
      payRatePerCm2: String(prod.payRatePerCm2),
      commission: String(prod.commission),
      ...pricing,
    });
    inserted++;
  }

  console.log(`Products seeded for Q1 2026 — ${inserted} inserted, ${skipped} skipped.`);
}

if (require.main === module) {
  seedProducts()
    .then(() => closeDb())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
