/**
 * Drops everything in the `public` and `drizzle` schemas and recreates them.
 * Intended for the demo Supabase project to start from a clean slate when a
 * partial migration left orphan objects (e.g. enums) behind.
 *
 * Safety:
 *   1. Refuses to run unless DEMO_MODE=true in .env.local
 *   2. Refuses if DATABASE_URL contains the PROD_DB_URL_FRAGMENT env value
 *   3. Refuses unless invoked with --confirm
 */
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");

if (process.env.DEMO_MODE !== "true") {
  console.error(
    "[SAFETY] DEMO_MODE is not 'true' in .env.local. Refusing to wipe.\n" +
      "  Add DEMO_MODE=true to .env.local to enable demo-only operations.",
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found in .env.local");
  process.exit(1);
}
const DATABASE_URL: string = process.env.DATABASE_URL;

const PROD_FRAGMENT = process.env.PROD_DB_URL_FRAGMENT;
if (PROD_FRAGMENT && DATABASE_URL.includes(PROD_FRAGMENT)) {
  console.error(
    "[SAFETY] DATABASE_URL matches PROD_DB_URL_FRAGMENT — refusing to wipe production data.",
  );
  process.exit(1);
}

let host = "<unknown>";
try {
  host = new URL(DATABASE_URL).host;
} catch {
  /* best-effort; leave default */
}

if (!confirm) {
  console.log(
    [
      "",
      "About to DROP and recreate the `public` and `drizzle` schemas on:",
      `  host: ${host}`,
      "",
      "This will destroy ALL tables, types, functions, and data in those schemas.",
      "Re-run with --confirm to proceed:",
      "",
      "  npm run db:wipe -- --confirm",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

async function wipe() {
  console.log(`[wipe] Connecting to ${host}…`);
  const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });

  try {
    console.log("[wipe] Dropping `public` schema…");
    await sql.unsafe(`DROP SCHEMA IF EXISTS "public" CASCADE;`);
    await sql.unsafe(`CREATE SCHEMA "public";`);
    await sql.unsafe(`GRANT ALL ON SCHEMA "public" TO postgres;`);
    await sql.unsafe(`GRANT ALL ON SCHEMA "public" TO public;`);
    await sql.unsafe(`GRANT ALL ON SCHEMA "public" TO anon;`);
    await sql.unsafe(`GRANT ALL ON SCHEMA "public" TO authenticated;`);
    await sql.unsafe(`GRANT ALL ON SCHEMA "public" TO service_role;`);

    console.log("[wipe] Dropping `drizzle` schema (migration tracking)…");
    await sql.unsafe(`DROP SCHEMA IF EXISTS "drizzle" CASCADE;`);

    console.log("[wipe] ✔ Done. Schemas are empty.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

void wipe();
