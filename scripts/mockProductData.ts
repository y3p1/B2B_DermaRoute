import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const originalUrl = process.env.DATABASE_URL!;
// Replace port 5432 with 6543 for transaction pooling which handles high concurrency
const transactionPoolUrl = originalUrl.replace(":5432/", ":6543/");

const sql = postgres(transactionPoolUrl, { prepare: false });

async function mockData() {
  console.log("Running bulk update query on transaction pooler...");

  await sql`
    UPDATE products 
    SET 
      q_code = COALESCE(q_code, 'Q' || floor(random() * 999 + 4000)::text),
      unit_size = COALESCE(unit_size, (ARRAY[2, 4, 16, 32])[floor(random() * 4 + 1)]),
      cost_per_cm2 = COALESCE(cost_per_cm2, (random() * 40 + 10)::numeric(10,2)),
      pay_rate_per_cm2 = COALESCE(pay_rate_per_cm2, ((random() * 40 + 10) * 2.5)::numeric(10,2)),
      cost_per_graft = COALESCE(cost_per_graft, ((random() * 40 + 10) * (ARRAY[2, 4, 16, 32])[floor(random() * 4 + 1)])::numeric(10,2)),
      pay_rate_per_graft = COALESCE(pay_rate_per_graft, ((random() * 40 + 10) * (ARRAY[2, 4, 16, 32])[floor(random() * 4 + 1)] * 2.5)::numeric(10,2)),
      est_aoc_100 = COALESCE(est_aoc_100, 1500.00),
      est_aoc_80 = COALESCE(est_aoc_80, 1200.00),
      description = COALESCE(description, 'Standard clinical skin substitute graft product for wound application.')
    WHERE pay_rate_per_cm2 IS NULL OR cost_per_cm2 IS NULL;
  `;

  console.log("Mocking complete!");
  await sql.end();
}

mockData().catch(e => {
  console.error("Failed:", e);
  process.exit(1);
});
