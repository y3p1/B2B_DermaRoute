import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const originalUrl = process.env.DATABASE_URL!;
const transactionPoolUrl = originalUrl.replace(":5432/", ":6543/");
const sql = postgres(transactionPoolUrl, { prepare: false });

async function checkTable() {
  try {
    const res = await sql`select "id", "user_id" from "provider_acct" limit 1`;
    console.log("Success, provider_acct query result:", res);
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await sql.end();
  }
}

checkTable();
