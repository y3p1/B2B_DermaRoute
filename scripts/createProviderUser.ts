import dotenv from "dotenv";

// Load environment variables from .env.local
process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });

import { providerAcct } from "../db/provider";
import { closeDb, getDb } from "../backend/services/db";
import { getSupabaseAdminClient } from "../backend/services/supabaseAdmin";

/**
 * Utility script to manually create a Provider account.
 * 
 * Usage:
 * 1. Set environment variables in .env.local:
 *    PROVIDER_EMAIL=drsmith@exampl.com
 *    PROVIDER_PHONE=+15551234567
 *    PROVIDER_NPI=1234567890
 *    PROVIDER_CLINIC_NAME="Smith Family Practice"
 * 2. Run with: npx tsx scripts/createProviderUser.ts
 */

type ProviderConfig = {
    email: string;
    phone: string;
    npi: string;
    clinicName: string;
    specialty?: string;
};

function getProviderConfig(): ProviderConfig {
    const email = process.env.PROVIDER_EMAIL;
    const phone = process.env.PROVIDER_PHONE;
    const npi = process.env.PROVIDER_NPI;
    const clinicName = process.env.PROVIDER_CLINIC_NAME;

    if (!email || !phone || !npi || !clinicName) {
        console.error("Error: Missing required environment variables.");
        console.log(`
Required environment variables in .env.local:
  PROVIDER_EMAIL        (e.g., doctor@example.com)
  PROVIDER_PHONE        (e.g., +15550001111)
  PROVIDER_NPI          (e.g., 1234567890)
  PROVIDER_CLINIC_NAME  (e.g., "City Medical Center")

Optional:
  PROVIDER_SPECIALTY    (e.g., "Wound Care")
    `);
        process.exit(1);
    }

    return {
        email,
        phone,
        npi,
        clinicName,
        specialty: process.env.PROVIDER_SPECIALTY,
    };
}

async function getOrCreateAuthUser(cfg: ProviderConfig) {
    const supabase = getSupabaseAdminClient();

    console.log(`Checking Supabase Auth for user: ${cfg.email}...`);

    // Try to create the user first
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: cfg.email,
        phone: cfg.phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
            role: "provider",
            clinic_name: cfg.clinicName,
        },
    });

    if (createData.user) {
        console.log(`Created new Supabase Auth user: ${createData.user.id}`);
        return createData.user.id;
    }

    // If creation fails, we try to locate the user by email or phone.
    // This handles both "Email already registered" and "Phone already registered" errors.
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

        // Ensure the user's phone/email match what we want
        await supabase.auth.admin.updateUserById(existing.id, {
            email: cfg.email,
            phone: cfg.phone,
            phone_confirm: true,
            email_confirm: true,
        });

        return existing.id;
    }

    throw createError || new Error("Failed to create or locate auth user");
}

async function main() {
    const cfg = getProviderConfig();
    const db = getDb();

    const userId = await getOrCreateAuthUser(cfg);

    console.log("Syncing to provider_acct table...");

    await db
        .insert(providerAcct)
        .values({
            userId,
            email: cfg.email,
            accountPhone: cfg.phone,
            npiNumber: cfg.npi,
            clinicName: cfg.clinicName,
            providerSpecialty: cfg.specialty || null,
            role: "provider",
            active: true,
        })
        .onConflictDoUpdate({
            target: providerAcct.userId,
            set: {
                email: cfg.email,
                accountPhone: cfg.phone,
                npiNumber: cfg.npi,
                clinicName: cfg.clinicName,
                providerSpecialty: cfg.specialty || null,
                updatedAt: new Date(),
            },
        });

    console.log("Success! Provider account created/updated.");
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
