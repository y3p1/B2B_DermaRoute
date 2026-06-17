import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "prefer" });
  const res = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log(res.map((r: { table_name: string }) => r.table_name).join("\n"));
  await sql.end();
}

void main();
