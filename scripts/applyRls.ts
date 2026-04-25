import fs from "fs";
import path from "path";
import postgres from "postgres";
import dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found in .env.local");
  process.exit(1);
}

// Supabase Pooler (Transaction Mode) doesn't support prepared statements
const sql = postgres(DATABASE_URL, { prepare: false });

const RLS_DIR = path.join(process.cwd(), "supabase", "rls");

async function applyRls() {
  console.log("Applying RLS policies (Cross-Platform)...");

  try {
    const files = fs.readdirSync(RLS_DIR).filter(f => f.endsWith(".sql"));

    // Sort files to ensure a consistent order
    files.sort();

    for (const file of files) {
      const filePath = path.join(RLS_DIR, file);
      console.log(`\n→ Applying ${file}...`);

      const sqlContent = fs.readFileSync(filePath, "utf-8");

      // Execute the SQL
      // We use sql.unsafe() because the files contain multiple statements and complex DDL
      await sql.unsafe(sqlContent);

      console.log(`${file} applied successfully!`);
    }

    console.log("\n All RLS policies applied successfully!");
  } catch (error) {
    console.error("\n FAILED TO APPLY RLS POLICIES:");
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

void applyRls();
