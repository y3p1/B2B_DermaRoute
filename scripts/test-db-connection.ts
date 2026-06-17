import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  console.log("Connecting to:", url.replace(/:([^:@]+)@/, ":***@"));

  const sql = postgres(url, { ssl: "prefer", connect_timeout: 10 });

  try {
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
      LIMIT 5
    `;
    console.log("Connected! Sample tables:", result.map((r: { table_name: string }) => r.table_name));
    await sql.end();
  } catch (err) {
    console.error("Connection failed:", err);
    await sql.end();
    process.exit(1);
  }
}

void main();
