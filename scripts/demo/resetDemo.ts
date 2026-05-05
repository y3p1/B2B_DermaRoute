import dotenv from "dotenv";
process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { closeDb, getDb } from "../../backend/services/db";
import { seedManufacturers } from "../../backend/scripts/seedManufacturersQ12026";
import { seedProducts } from "../../backend/scripts/seedProductsQ12026";
import { seedInsurances } from "../../backend/scripts/seedInsurances";
import { seedDemoUsers } from "../../backend/scripts/demo/seedDemoUsers";
import { seedDemoBvRequests } from "../../backend/scripts/demo/seedDemoBvRequests";
import { seedDemoBaa } from "../../backend/scripts/demo/seedDemoBaa";
import { seedDemoWoundMeasurements } from "../../backend/scripts/demo/seedDemoWoundMeasurements";
import { seedDemoOrderProducts } from "../../backend/scripts/demo/seedDemoOrderProducts";
import { seedDemoCmsPolicy } from "../../backend/scripts/demo/seedDemoCmsPolicy";
import { seedDemoCoveragePlans } from "../../backend/scripts/demo/seedDemoCoveragePlans";
import { seedDemoAuditLogs } from "../../backend/scripts/demo/seedDemoAuditLogs";
import { seedWoundSizes } from "../../backend/scripts/seedBV";

const PROD_URL_FRAGMENT = process.env.PROD_DB_URL_FRAGMENT ?? "";

export async function runDemoReset(): Promise<{ rowsCreated: number; tables: string[] }> {
  if (process.env.DEMO_MODE !== "true") {
    throw new Error("DEMO_MODE is not set to 'true'. Refusing to reset.");
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (PROD_URL_FRAGMENT && dbUrl.includes(PROD_URL_FRAGMENT)) {
    throw new Error(
      "[SAFETY] DATABASE_URL matches PROD_DB_URL_FRAGMENT — refusing to reset production data.",
    );
  }

  const start = Date.now();
  console.log("[demo-reset] Starting demo data reset...");

  const db = getDb();

  // Truncate volatile tables in dependency order (children first)
  await db.execute(sql`
    TRUNCATE TABLE
      audit_logs,
      wound_measurements,
      order_outcomes,
      order_products,
      bv_forms,
      bv_requests,
      baa_provider,
      coverage_plans,
      cms_policy_updates
    RESTART IDENTITY CASCADE
  `);

  console.log("[demo-reset] Truncated volatile tables.");

  let total = 0;
  const tables: string[] = [];

  const track = (label: string, count: number) => {
    console.log(`[demo-reset]   ${label}: ${count} rows`);
    total += count;
    tables.push(label);
  };

  // Reference data — idempotent upserts, never truncated
  await seedInsurances();
  tables.push("insurances (upserted)");
  await seedManufacturers();
  tables.push("manufacturers (upserted)");
  track("wound_sizes", await seedWoundSizes());
  await seedProducts();
  tables.push("products (upserted)");

  // Users are idempotent — upsert only, no truncate
  await seedDemoUsers();
  tables.push("users (upserted)");

  track("coverage_plans", await seedDemoCoveragePlans());
  track("cms_policy_updates", await seedDemoCmsPolicy());
  track("bv_requests", await seedDemoBvRequests());
  track("baa_provider", await seedDemoBaa());
  track("wound_measurements", await seedDemoWoundMeasurements());
  track("order_products", await seedDemoOrderProducts());
  track("audit_logs", await seedDemoAuditLogs());

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[demo-reset] Done in ${elapsed}s. ${total} rows created.`);

  return { rowsCreated: total, tables };
}

if (require.main === module) {
  runDemoReset()
    .then(({ rowsCreated, tables }) => {
      console.log(`\nReset complete: ${rowsCreated} rows across [${tables.join(", ")}]`);
    })
    .catch((err) => {
      console.error("Demo reset failed:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try { await closeDb(); } catch { /* ignore */ }
      process.exit(process.exitCode ?? 0);
    });
}
