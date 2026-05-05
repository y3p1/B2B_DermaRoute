import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../../db/schema";
import { getRequiredEnv } from "../config/env";

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
let cachedPostgresClient: ReturnType<typeof postgres> | undefined;

export function getDb() {
  const databaseUrl = getRequiredEnv("DATABASE_URL");

  // Safety guard: refuse to start if demo mode points at prod DB
  if (process.env.DEMO_MODE === "true") {
    const denyFragment = process.env.PROD_DB_URL_FRAGMENT;
    if (denyFragment && databaseUrl.includes(denyFragment)) {
      console.error(
        "[SAFETY] DEMO_MODE=true but DATABASE_URL matches PROD_DB_URL_FRAGMENT. " +
        "Refusing to connect — this would corrupt production data.",
      );
      process.exit(1);
    }
  }

  // Automatically use the Supabase Transaction Pooler port (6543) if 5432 is provided
  const transactionPoolUrl = databaseUrl.replace(":5432/", ":6543/");

  if (!cachedPostgresClient) {
    cachedPostgresClient = postgres(transactionPoolUrl, { prepare: false });
  }

  if (!cachedDb) {
    cachedDb = drizzle(cachedPostgresClient, { schema });
  }

  return cachedDb;
}

export async function closeDb() {
  if (cachedPostgresClient) {
    await cachedPostgresClient.end({ timeout: 5 });
    cachedPostgresClient = undefined;
  }
  cachedDb = undefined;
}
