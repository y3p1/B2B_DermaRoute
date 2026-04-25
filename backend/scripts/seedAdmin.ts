import dotenv from "dotenv";

// Reduce dotenv console noise in v17+.
process.env.DOTENV_CONFIG_QUIET ??= "true";

dotenv.config({ path: ".env.local" });

import { eq } from "drizzle-orm";

import { adminAcct } from "../../db/schema";
import { closeDb, getDb } from "../services/db";
import { getSupabaseAdminClient } from "../services/supabaseAdmin";

type SeedConfig = {
  email: string;
  password: string;
  accountPhone: string;
  firstName: string;
  lastName: string;
};

function getSeedConfig(): SeedConfig {
  const missing: string[] = [];
  if (!process.env.ADMIN_EMAIL) missing.push("ADMIN_EMAIL");
  if (!process.env.ADMIN_PASSWORD) missing.push("ADMIN_PASSWORD");
  if (!process.env.ADMIN_ACCOUNT_PHONE) missing.push("ADMIN_ACCOUNT_PHONE");
  if (!process.env.ADMIN_FIRST_NAME) missing.push("ADMIN_FIRST_NAME");
  if (!process.env.ADMIN_LAST_NAME) missing.push("ADMIN_LAST_NAME");
  if (missing.length > 0) {
    throw new Error(
      `Missing required admin seed environment variables: ${missing.join(", ")}`,
    );
  }
  return {
    email: process.env.ADMIN_EMAIL!,
    password: process.env.ADMIN_PASSWORD!,
    accountPhone: process.env.ADMIN_ACCOUNT_PHONE!,
    firstName: process.env.ADMIN_FIRST_NAME!,
    lastName: process.env.ADMIN_LAST_NAME!,
  };
}

async function getOrCreateSupabaseUserId(cfg: SeedConfig) {
  const supabase = getSupabaseAdminClient();

  const createRes = await supabase.auth.admin.createUser({
    email: cfg.email,
    password: cfg.password,
    email_confirm: true,
    phone: cfg.accountPhone,
    user_metadata: {
      full_name: `${cfg.firstName} ${cfg.lastName}`.trim(),
      name: `${cfg.firstName} ${cfg.lastName}`.trim(),
      display_name: `${cfg.firstName} ${cfg.lastName}`.trim(),
      role: "admin",
      firstName: cfg.firstName,
      lastName: cfg.lastName,
    },
  });

  if (!createRes.error && createRes.data.user?.id) {
    return createRes.data.user.id;
  }

  // If user already exists (or any other create error), try to locate by email.
  // Supabase Admin API doesn't provide a direct get-by-email helper, so list+find.
  const listRes = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listRes.error) {
    throw createRes.error || listRes.error;
  }

  const existing = listRes.data.users.find(
    (u) => (u.email || "").toLowerCase() === cfg.email.toLowerCase(),
  );

  if (!existing?.id) {
    throw createRes.error || new Error("Failed to create or locate admin user");
  }

  // Ensure existing user has the right phone + metadata for OTP sign-in.
  // Do NOT overwrite password for existing users.
  await supabase.auth.admin.updateUserById(existing.id, {
    phone: cfg.accountPhone,
    user_metadata: {
      full_name: `${cfg.firstName} ${cfg.lastName}`.trim(),
      name: `${cfg.firstName} ${cfg.lastName}`.trim(),
      display_name: `${cfg.firstName} ${cfg.lastName}`.trim(),
      role: "admin",
      firstName: cfg.firstName,
      lastName: cfg.lastName,
    },
  });

  return existing.id;
}

async function main() {
  const cfg = getSeedConfig();

  console.log("Seeding admin account...");

  const userId = await getOrCreateSupabaseUserId(cfg);

  const db = getDb();

  // Prefer updating based on userId if already present.
  const existingByUserId = await db
    .select({ id: adminAcct.id })
    .from(adminAcct)
    .where(eq(adminAcct.userId, userId))
    .limit(1);

  if (existingByUserId.length > 0) {
    await db
      .update(adminAcct)
      .set({
        email: cfg.email,
        accountPhone: cfg.accountPhone,
        firstName: cfg.firstName,
        lastName: cfg.lastName,
        role: "admin",
        active: true,
        updatedAt: new Date(),
      })
      .where(eq(adminAcct.userId, userId));

    console.log(`Success: admin account updated (userId=${userId})`);
    return;
  }

  await db
    .insert(adminAcct)
    .values({
      email: cfg.email,
      accountPhone: cfg.accountPhone,
      firstName: cfg.firstName,
      lastName: cfg.lastName,
      role: "admin",
      userId,
      active: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: adminAcct.accountPhone,
      set: {
        email: cfg.email,
        firstName: cfg.firstName,
        lastName: cfg.lastName,
        role: "admin",
        userId,
        active: true,
        updatedAt: new Date(),
      },
    });

  console.log(`Success: admin account seeded (userId=${userId})`);
}

main()
  .catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to seed admin account: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Ensure we release the DB connection so the process can exit.
    try {
      await closeDb();
    } catch {
      // ignore
    }

    // Some libraries (and DB pools) can keep the event loop alive.
    // Explicitly exit so CI/terminals don't appear “stuck”.
    process.exit(process.exitCode ?? 0);
  });
