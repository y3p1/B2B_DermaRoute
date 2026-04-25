import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL missing (check .env.local)");
  process.exit(1);
}

const repoRoot = process.cwd();
const migrationsFolder = path.join(repoRoot, "drizzle");
const journalPath = path.join(migrationsFolder, "meta", "_journal.json");

if (!fs.existsSync(journalPath)) {
  console.error(`Can't find ${journalPath}`);
  process.exit(1);
}

const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
if (!journal?.entries?.length) {
  console.error("No entries found in drizzle/meta/_journal.json");
  process.exit(1);
}

const migrations = journal.entries.map((entry) => {
  const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
  const sqlText = fs.readFileSync(sqlPath, "utf8");
  const hash = crypto.createHash("sha256").update(sqlText).digest("hex");
  return {
    tag: entry.tag,
    created_at: entry.when,
    hash,
  };
});

const sql = postgres(databaseUrl, { ssl: "require", max: 1 });

try {
  const existing = await sql`
    select id, hash, created_at
    from drizzle.__drizzle_migrations
    order by created_at asc;
  `;

  if (existing.length > 0) {
    console.log(
      JSON.stringify(
        {
          message:
            "drizzle.__drizzle_migrations already has rows; not modifying anything.",
          existing,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  for (const migration of migrations) {
    await sql`
      insert into drizzle.__drizzle_migrations (hash, created_at)
      values (${migration.hash}, ${String(migration.created_at)});
    `;
  }

  const after = await sql`
    select id, hash, created_at
    from drizzle.__drizzle_migrations
    order by created_at asc;
  `;

  console.log(
    JSON.stringify(
      {
        inserted: migrations.map((m) => ({ tag: m.tag, created_at: m.created_at })),
        rows: after,
      },
      null,
      2,
    ),
  );
} finally {
  await sql.end({ timeout: 5 });
}
