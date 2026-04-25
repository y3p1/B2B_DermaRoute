import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../../db/schema";
import { getRequiredEnv } from "../config/env";

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
let cachedPostgresClient: ReturnType<typeof postgres> | undefined;

export function getDb() {
  const databaseUrl = getRequiredEnv("DATABASE_URL");
  // Automatically use the Supabase Transaction Pooler port (6543) if 5432 is provided
  // This prevents "Failed query" errors caused by IPv4 deprecation or connection limits
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
