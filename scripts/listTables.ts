import { getDb } from "../backend/services/db";
import { sql } from "drizzle-orm";

async function test() {
  const db = getDb();
  try {
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables:", result);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit();
  }
}

void test();
