import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function debugAuthSync() {
  const phone = "+639107345790";
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log(`\n DEBUGGING AUTH SYNC FOR: ${phone}`);

    // 1. Check Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const authUser = authData.users.find(u => u.phone === phone || u.email === "admin@gmail.com");
    if (authUser) {
      console.log(`Found Auth User: ${authUser.id} (Phone: ${authUser.phone})`);
    } else {
      console.log("No Auth User found for this phone/email.");
    }

    // 2. Check Database Tables
    const provider = await sql`SELECT user_id, account_phone FROM provider_acct WHERE account_phone = ${phone}`;
    const admin = await sql`SELECT user_id, account_phone FROM admin_acct WHERE account_phone = ${phone}`;
    const staff = await sql`SELECT user_id, account_phone FROM clinic_staff_acct WHERE account_phone = ${phone}`;

    console.log("Database Records:");
    console.log(" - provider_acct:", provider[0] || "None");
    console.log(" - admin_acct:   ", admin[0] || "None");
    console.log(" - clinic_staff: ", staff[0] || "None");

    if (authUser && admin[0]) {
      if (authUser.id !== admin[0].user_id) {
        console.log("\n❌ MISMATCH DETECTED: Auth UID and Database user_id do not match.");
        console.log(`Auth ID: ${authUser.id}`);
        console.log(`DB ID:   ${admin[0].user_id}`);
      } else {
        console.log("\n✅ MATCH: Auth UID and Database user_id are synchronized.");
      }
    }

  } catch (error) {
    console.error(error);
  } finally {
    await sql.end();
    process.exit();
  }
}

void debugAuthSync();
