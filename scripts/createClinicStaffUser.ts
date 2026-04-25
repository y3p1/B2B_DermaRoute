import dotenv from "dotenv";
import { eq } from "drizzle-orm";

// Load environment variables from .env.local
process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });

import { clinicStaffAcct } from "../db/clinic-staff";
import { closeDb, getDb } from "../backend/services/db";
import { getSupabaseAdminClient } from "../backend/services/supabaseAdmin";

/**
 * Utility script to manually create a Clinic Staff account.
 * 
 * Usage:
 * 1. Set environment variables in .env.local:
 *    STAFF_EMAIL=staff@example.com
 *    STAFF_ACCOUNT_PHONE=+15551234567
 *    STAFF_FIRST_NAME="Jane"
 *    STAFF_LAST_NAME="Smith"
 * 2. Run with: npx tsx scripts/createClinicStaffUser.ts
 */

type StaffConfig = {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
};

function getStaffConfig(): StaffConfig {
    const email = process.env.STAFF_EMAIL;
    const phone = process.env.STAFF_ACCOUNT_PHONE;
    const firstName = process.env.STAFF_FIRST_NAME;
    const lastName = process.env.STAFF_LAST_NAME;

    if (!email || !phone || !firstName || !lastName) {
        console.error("Error: Missing required environment variables.");
        console.log(`
Required environment variables in .env.local:
  STAFF_EMAIL          (e.g., staff@example.com)
  STAFF_ACCOUNT_PHONE  (e.g., +15550001111)
  STAFF_FIRST_NAME     (e.g., "Jane")
  STAFF_LAST_NAME      (e.g., "Smith")
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

async function getOrCreateAuthUser(cfg: StaffConfig) {
    const supabase = getSupabaseAdminClient();

    console.log(`Checking Supabase Auth for user: ${cfg.email}...`);

    // Try to create the user first
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: cfg.email,
        phone: cfg.phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
            role: "clinic_staff",
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
                role: "clinic_staff",
                first_name: cfg.firstName,
                last_name: cfg.lastName,
            },
        });

        return existing.id;
    }

    throw createError || new Error("Failed to create or locate auth user");
}

async function main() {
    const cfg = getStaffConfig();
    const db = getDb();

    const userId = await getOrCreateAuthUser(cfg);

    console.log("Syncing to clinic_staff_acct table...");

    await db
        .insert(clinicStaffAcct)
        .values({
            userId,
            email: cfg.email,
            accountPhone: cfg.phone,
            firstName: cfg.firstName,
            lastName: cfg.lastName,
            role: "clinic_staff",
            active: true,
        })
        .onConflictDoUpdate({
            target: clinicStaffAcct.userId,
            set: {
                email: cfg.email,
                accountPhone: cfg.phone,
                firstName: cfg.firstName,
                lastName: cfg.lastName,
                updatedAt: new Date(),
            },
        });

    console.log("Success! Clinic Staff account created/updated.");
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
