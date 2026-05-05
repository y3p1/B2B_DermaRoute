import dotenv from "dotenv";

// Load environment variables from .env.local
process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });

import { adminAcct } from "../db/admin";
import { closeDb, getDb } from "../backend/services/db";
import { getSupabaseAdminClient } from "../backend/services/supabaseAdmin";

/**
 * Utility script to manually create an Admin account.
 * 
 * Usage:
 * 1. Set environment variables in .env.local:
 *    ADMIN_EMAIL=admin@example.com
 *    ADMIN_PHONE=+15551234567
 *    ADMIN_FIRST_NAME="John"
 *    ADMIN_LAST_NAME="Doe"
 * 2. Run with: npx tsx scripts/createAdminUser.ts
 */

type AdminConfig = {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
};

function getAdminConfig(): AdminConfig {
    const email = process.env.ADMIN_EMAIL;
    const phone = process.env.ADMIN_ACCOUNT_PHONE;
    const firstName = process.env.ADMIN_FIRST_NAME;
    const lastName = process.env.ADMIN_LAST_NAME;

    if (!email || !phone || !firstName || !lastName) {
        console.error("Error: Missing required environment variables.");
        console.log(`
Required environment variables in .env.local:
  ADMIN_EMAIL        (e.g., admin@example.com)
  ADMIN_PHONE        (e.g., +15550001111)
  ADMIN_FIRST_NAME   (e.g., "John")
  ADMIN_LAST_NAME    (e.g., "Doe")
    `);
        process.exit(1);
    }

    return {
        email,
        phone,
        firstName,
        lastName,
    };
}

async function getOrCreateAuthUser(cfg: AdminConfig) {
    const supabase = getSupabaseAdminClient();

    console.log(`Checking Supabase Auth for user: ${cfg.email}...`);

    // Try to create the user first
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: cfg.email,
        phone: cfg.phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
            role: "admin",
            first_name: cfg.firstName,
            last_name: cfg.lastName,
        },
    });

    if (createData.user) {
        console.log(`Created new Supabase Auth user: ${createData.user.id}`);
        return createData.user.id;
    }

    // If creation fails, locate existing
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const existing = listData.users.find((u) => {
        const cleanTargetEmail = cfg.email.toLowerCase().trim();
        const cleanTargetPhone = cfg.phone.replace(/\D/g, "");

        const userEmail = u.email?.toLowerCase().trim();
        const userPhone = u.phone?.replace(/\D/g, "");

        return (userEmail && userEmail === cleanTargetEmail) ||
            (userPhone && userPhone === cleanTargetPhone);
    });

    if (existing) {
        console.log(`Found existing Supabase Auth user: ${existing.id}`);

        await supabase.auth.admin.updateUserById(existing.id, {
            email: cfg.email,
            phone: cfg.phone,
            phone_confirm: true,
            email_confirm: true,
            user_metadata: {
                role: "admin",
                first_name: cfg.firstName,
                last_name: cfg.lastName,
            },
        });

        return existing.id;
    }

    throw createError || new Error("Failed to create or locate auth user");
}

async function main() {
    const cfg = getAdminConfig();
    const db = getDb();

    const userId = await getOrCreateAuthUser(cfg);

    console.log("Syncing to admin_acct table...");

    await db
        .insert(adminAcct)
        .values({
            userId,
            email: cfg.email,
            accountPhone: cfg.phone,
            firstName: cfg.firstName,
            lastName: cfg.lastName,
            role: "admin",
            active: true,
        })
        .onConflictDoUpdate({
            target: adminAcct.userId,
            set: {
                email: cfg.email,
                accountPhone: cfg.phone,
                firstName: cfg.firstName,
                lastName: cfg.lastName,
                updatedAt: new Date(),
            },
        });

    console.log("Success! Admin account created/updated.");
    console.log(`   User ID: ${userId}`);
    console.log(`   Email:   ${cfg.email}`);
    console.log(`   Phone:   ${cfg.phone}`);
}

main()
    .catch((err) => {
        console.error("Fatal Error:", err.message || err);
        process.exit(1);
    })
    .finally(async () => {
        await closeDb();
    });
