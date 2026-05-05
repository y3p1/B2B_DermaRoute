import fs from "fs";
import path from "path";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found in .env.local");
  process.exit(1);
}
const DATABASE_URL: string = process.env.DATABASE_URL;

const DRIZZLE_DIR = path.join(process.cwd(), "drizzle");
const JOURNAL_PATH = path.join(DRIZZLE_DIR, "meta", "_journal.json");

type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};
type Journal = { version: string; dialect: string; entries: JournalEntry[] };

async function ensureMigrationsTable(sql: postgres.Sql) {
  await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "drizzle";`);
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      "id" SERIAL PRIMARY KEY,
      "hash" text NOT NULL,
      "created_at" bigint
    );
  `);
}

async function alreadyApplied(sql: postgres.Sql, tag: string): Promise<boolean> {
  const rows = await sql<{ count: string }[]>`
    SELECT count(*)::text AS count
    FROM "drizzle"."__drizzle_migrations"
    WHERE "hash" = ${tag}
  `;
  return Number(rows[0]?.count ?? "0") > 0;
}

async function applyMigrations() {
  if (!fs.existsSync(JOURNAL_PATH)) {
    console.error("ERROR: drizzle journal not found at", JOURNAL_PATH);
    process.exit(1);
  }

  const journal: Journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf-8"));
  const entries = [...journal.entries].sort((a, b) => a.idx - b.idx);

  const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });

  try {
    await ensureMigrationsTable(sql);

    let appliedCount = 0;
    let skippedCount = 0;

    for (const entry of entries) {
      const filename = `${entry.tag}.sql`;
      const fullPath = path.join(DRIZZLE_DIR, filename);

      if (!fs.existsSync(fullPath)) {
        console.warn(`! Missing migration file: ${filename} — skipping`);
        continue;
      }

      if (await alreadyApplied(sql, entry.tag)) {
        console.log(`= Already applied: ${entry.tag}`);
        skippedCount += 1;
        continue;
      }

      const raw = fs.readFileSync(fullPath, "utf-8");
      const statements = raw
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      console.log(`> Applying ${entry.tag} (${statements.length} statements)…`);

      try {
        await sql.begin(async (tx) => {
          for (const stmt of statements) {
            await tx.unsafe(stmt);
          }
          await tx`
            INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
            VALUES (${entry.tag}, ${entry.when})
          `;
        });
        appliedCount += 1;
      } catch (err) {
        console.error(`! Failed on ${entry.tag}:`, err);
        throw err;
      }
    }

    console.log(`\n✔ Done. Applied ${appliedCount} new, skipped ${skippedCount} already-applied.`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

void applyMigrations();
