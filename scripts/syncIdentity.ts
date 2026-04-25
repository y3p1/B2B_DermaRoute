import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const phones = ["+639107345790"]; // Update both target phones

async function syncAllIdentities() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log("🚀 STARTING GLOBAL IDENTITY RE-SYNC...");

    // 1. Fetch ALL Auth Users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    for (const phone of phones) {
      const cleanPhone = phone.replace(/\D/g, "");
      const authUser = authData.users.find(u => u.phone?.replace(/\D/g, "") === cleanPhone);

      if (!authUser) {
        console.warn(`⚠️ No Supabase Auth user found for phone: ${phone}. Skipping...`);
        continue;
      }

      console.log(`\n📦 SYNCING PHONE: ${phone} to ID: ${authUser.id}`);

      // 2. Update All Database Tables
      try {
        const pMod = await sql`UPDATE provider_acct SET user_id = ${authUser.id} WHERE account_phone = ${phone} RETURNING id`;
        const aMod = await sql`UPDATE admin_acct SET user_id = ${authUser.id} WHERE account_phone = ${phone} RETURNING id`;
        const sMod = await sql`UPDATE clinic_staff_acct SET user_id = ${authUser.id} WHERE account_phone = ${phone} RETURNING id`;

        console.log(` ✅ provider_acct:   ${pMod.length > 0 ? "Updated" : "Not Found"}`);
        console.log(` ✅ admin_acct:      ${aMod.length > 0 ? "Updated" : "Not Found"}`);
        console.log(` ✅ clinic_staff:    ${sMod.length > 0 ? "Updated" : "Not Found"}`);
      } catch (err) {
        console.error(` ❌ FAILED to update database for ${phone}:`, err);
      }
    }

    console.log("\n✨ IDENTITY RE-SYNC COMPLETE!");

  } catch (error) {
    console.error("\n❌ CRITICAL SYNC ERROR:", error);
  } finally {
    await sql.end();
    process.exit();
  }
}

void syncAllIdentities();
