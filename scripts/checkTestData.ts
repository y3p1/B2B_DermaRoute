import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "../lib/drizzle";
import { bvRequests } from "../db/bv-requests";
import { insurances } from "../db/insurances";
import { insuranceRouting } from "../db/insurance-routing";
import { products } from "../db/products";
import { eq, and } from "drizzle-orm";

async function main() {
  console.log("--- Checking for Approved BVs ---");
  const approvedBvs = await db.select().from(bvRequests).where(eq(bvRequests.status, "approved"));

  if (approvedBvs.length === 0) {
    console.log("❌ No approved BV requests found.");
  } else {
    console.log(`✅ Found ${approvedBvs.length} approved BV(s):`);
    approvedBvs.forEach(bv => {
      console.log(`- ID: ${bv.id}, Patient Initials: ${bv.initials}, Insurance: ${bv.insurance}, Type: ${bv.woundType}, Diabetic: ${bv.diabetic}`);
    });
  }

  console.log("\n--- Checking Insurance Routing & Products ---");
  for (const bv of approvedBvs) {
    if (!bv.insurance) continue;

    const insurance = await db.select().from(insurances).where(eq(insurances.name, bv.insurance));
    if (insurance.length === 0) {
      console.log(`❌ Insurance "${bv.insurance}" not found in 'insurances' table.`);
      continue;
    }

    const routing = await db.select().from(insuranceRouting).where(eq(insuranceRouting.insuranceId, insurance[0].id));
    if (routing.length === 0) {
      console.log(`❌ No routing configured for "${bv.insurance}".`);
    } else {
      console.log(`✅ Routing found for "${bv.insurance}" to Manufacturer ID: ${routing[0].manufacturerId}`);

      const p = await db.select().from(products).where(
        and(
          eq(products.manufacturerId, routing[0].manufacturerId),
        )
      );

      const validProducts = p.filter(prod => prod.payRatePerCm2 && prod.costPerCm2);
      if (validProducts.length === 0) {
        console.log(`❌ No products with rates found for this manufacturer.`);
      } else {
        console.log(`✅ ${validProducts.length} valid products with rates found.`);
      }
    }
  }
}

main().catch(console.error);
