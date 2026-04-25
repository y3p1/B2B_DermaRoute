import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL!;

async function main() {
  const sql = postgres(DATABASE_URL);

  try {
    // Seed risk admin settings (Phase 10a)
    await sql.unsafe(`
      INSERT INTO "threshold_settings" ("key", "value", "description") VALUES
        ('risk_a1c_block_threshold',  '12.0', 'A1C percentage above which an order is hard-blocked at submission.'),
        ('risk_a1c_warn_threshold',   '9.0',  'A1C percentage above which an order is flagged as elevated risk.'),
        ('risk_digest_hour_utc',      '13',   'UTC hour for the daily admin risk digest email (13 = 8am ET).'),
        ('risk_critical_sms_enabled', 'true', 'Whether to send immediate SMS alerts for critical-risk orders.')
      ON CONFLICT ("key") DO NOTHING
    `);
    console.log("✅ Admin settings seeded.");

    // Verify
    const rows = await sql`SELECT key, value FROM threshold_settings WHERE key LIKE 'risk_%'`;
    console.log("Current risk settings:");
    rows.forEach((r) => console.log(`  ${r.key} = ${r.value}`));

    // Check A1C columns exist on bv_requests
    const cols = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'bv_requests' AND column_name IN ('a1c_percent', 'a1c_measured_at')
    `;
    if (cols.length === 2) {
      console.log("A1C columns exist on bv_requests.");
    } else {
      console.log("A1C columns missing on bv_requests. Found:", cols.map(c => c.column_name));
    }

    // Check order_outcomes table exists
    const ooCheck = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'order_outcomes'
    `;
    if (ooCheck.length === 1) {
      console.log("✅ order_outcomes table exists.");
    } else {
      console.log("❌ order_outcomes table missing.");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await sql.end();
  }
}

main();
