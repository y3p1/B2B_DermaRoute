import dotenv from "dotenv";
process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });

import { adminAcct, clinicStaffAcct, providerAcct } from "../../../db/schema";
import { closeDb, getDb } from "../../services/db";
import { getSupabaseAdminClient } from "../../services/supabaseAdmin";

const USERS = [
  {
    role: "provider" as const,
    email: "demo-provider@dermaroute-demo.example.com",
    password: "DemoProvider2024!",
    phone: "+15550001001",
    firstName: "Jordan",
    lastName: "Rivera",
    envKey: "DEMO_PROVIDER_USER_ID",
  },
  {
    role: "admin" as const,
    email: "demo-admin@dermaroute-demo.example.com",
    password: "DemoAdmin2024!",
    phone: "+15550001002",
    firstName: "Morgan",
    lastName: "Chen",
    envKey: "DEMO_ADMIN_USER_ID",
  },
  {
    role: "clinic_staff" as const,
    email: "demo-clinicstaff@dermaroute-demo.example.com",
    password: "DemoClinicStaff2024!",
    phone: "+15550001003",
    firstName: "Alex",
    lastName: "Patel",
    envKey: "DEMO_CLINIC_STAFF_USER_ID",
  },
] as const;

async function getOrCreateUserId(cfg: (typeof USERS)[number]): Promise<string> {
  const supabase = getSupabaseAdminClient();

  const createRes = await supabase.auth.admin.createUser({
    email: cfg.email,
    password: cfg.password,
    email_confirm: true,
    phone: cfg.phone,
    user_metadata: {
      full_name: `${cfg.firstName} ${cfg.lastName}`,
      role: cfg.role,
      firstName: cfg.firstName,
      lastName: cfg.lastName,
    },
  });

  if (!createRes.error && createRes.data.user?.id) {
    return createRes.data.user.id;
  }

  const listRes = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listRes.error) throw createRes.error ?? listRes.error;

  const existing = listRes.data.users.find(
    (u) => u.email?.toLowerCase() === cfg.email.toLowerCase(),
  );
  if (!existing?.id) {
    throw createRes.error ?? new Error(`Failed to create or locate ${cfg.role} user`);
  }

  await supabase.auth.admin.updateUserById(existing.id, {
    phone: cfg.phone,
    user_metadata: { role: cfg.role, firstName: cfg.firstName, lastName: cfg.lastName },
  });

  return existing.id;
}

export async function seedDemoUsers(): Promise<Record<string, string>> {
  const db = getDb();
  const ids: Record<string, string> = {};

  for (const cfg of USERS) {
    const supabaseUserId = await getOrCreateUserId(cfg);
    // Prefer the hardcoded env-var UUID so the DB record matches what
    // requireAuth puts on res.locals.userId in demo mode. Falls back to
    // the Supabase-generated UUID when the env var is unset.
    const userId = process.env[cfg.envKey] ?? supabaseUserId;
    ids[cfg.envKey] = userId;

    if (cfg.role === "provider") {
      await db
        .insert(providerAcct)
        .values({
          email: cfg.email,
          accountPhone: cfg.phone,
          npiNumber: "1234567890",
          clinicName: "Cedar Hills Wound Center",
          clinicAddress: "2500 Cedar Hill Dr, Austin TX 78704",
          clinicPhone: "+15550001010",
          providerSpecialty: "Wound Care",
          role: "provider",
          userId,
          active: true,
        })
        .onConflictDoUpdate({
          target: providerAcct.email,
          set: { userId, active: true, updatedAt: new Date() },
        });
    } else if (cfg.role === "admin") {
      await db
        .insert(adminAcct)
        .values({
          email: cfg.email,
          accountPhone: cfg.phone,
          firstName: cfg.firstName,
          lastName: cfg.lastName,
          role: "admin",
          userId,
          active: true,
        })
        .onConflictDoUpdate({
          target: adminAcct.email,
          set: { userId, active: true, updatedAt: new Date() },
        });
    } else {
      await db
        .insert(clinicStaffAcct)
        .values({
          email: cfg.email,
          accountPhone: cfg.phone,
          firstName: cfg.firstName,
          lastName: cfg.lastName,
          role: "clinic_staff",
          userId,
          active: true,
        })
        .onConflictDoUpdate({
          target: clinicStaffAcct.email,
          set: { userId, active: true, updatedAt: new Date() },
        });
    }

    console.log(`  [demo-users] ${cfg.role}: ${userId}`);
  }

  return ids;
}

if (require.main === module) {
  seedDemoUsers()
    .then((ids) => {
      console.log("\nAdd these to your Vercel env vars:");
      for (const [key, val] of Object.entries(ids)) {
        console.log(`  ${key}=${val}`);
      }
    })
    .catch((err) => {
      console.error("Failed to seed demo users:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try { await closeDb(); } catch { /* ignore */ }
      process.exit(process.exitCode ?? 0);
    });
}
