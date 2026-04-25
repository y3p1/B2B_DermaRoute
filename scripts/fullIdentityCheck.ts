import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function fullIdentityCheck() {
  const phone = "+639107345790";
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log(`\n🔍 FULL IDENTITY CHECK FOR: ${phone}`);

    // 1. Supabase Auth
    console.log("Checking Supabase Auth...");
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    // Supabase stores phone in the format it was registered, often without '+' or with spaces.
    // We normalize to digits only for searching.
    const cleanPhone = phone.replace(/\D/g, "");
    const authUser = authData.users.find(u => u.phone?.replace(/\D/g, "") === cleanPhone);
    
    if (authUser) {
      console.log(`✅ Supabase Auth UID: ${authUser.id}`);
    } else {
      console.log("❌ No Supabase Auth User found for this phone.");
    }

    // 2. Database Tables
    const provider = await sql`SELECT user_id, account_phone FROM provider_acct WHERE account_phone = ${phone}`;
    const admin = await sql`SELECT user_id, account_phone FROM admin_acct WHERE account_phone = ${phone}`;
    const staff = await sql`SELECT user_id, account_phone FROM clinic_staff_acct WHERE account_phone = ${phone}`;

    console.log("\nDatabase Records (Stored UID):");
    console.log(" - provider_acct:", provider[0]?.user_id || "None");
    console.log(" - admin_acct:   ", admin[0]?.user_id || "None");
    console.log(" - clinic_staff: ", staff[0]?.user_id || "None");

    if (authUser) {
      console.log("\nSync Status:");
      const checkSync = (name: string, record: any) => {
        if (!record) return;
        if (record.user_id !== authUser.id) {
          console.log(` ❌ ${name}: Mismatched ID! (DB: ${record.user_id})`);
        } else {
          console.log(` ✅ ${name}: Synchronized.`);
        }
      };
      checkSync("provider_acct", provider[0]);
      checkSync("admin_acct", admin[0]);
      checkSync("clinic_staff", staff[0]);
    }

  } catch (error) {
    console.error(error);
  } finally {
    await sql.end();
    process.exit();
  }
}

void fullIdentityCheck();
