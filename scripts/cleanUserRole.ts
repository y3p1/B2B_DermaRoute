import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

/**
 * utility script to cleanly remove a specific role profile 
 * from the database without breaking the Supabase Auth link.
 * 
 * Usage: npx tsx scripts/cleanUserRole.ts <role>
 * Roles: admin, provider, staff
 */

async function cleanRole() {
  const role = process.argv[2];

  if (!role || !["admin", "provider", "staff"].includes(role)) {
    console.error("Usage: npx tsx scripts/cleanUserRole.ts <admin|provider|staff>");
    process.exit(1);
  }

  let phone = "";
  if (role === "admin") {
    phone = process.env.ADMIN_ACCOUNT_PHONE || "+639107345790";
  } else if (role === "provider") {
    phone = process.env.PROVIDER_PHONE || "+639107345790";
  } else if (role === "staff") {
    phone = process.env.STAFF_ACCOUNT_PHONE || "+639107345790";
  }

  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  try {
    console.log(`\n🗑️  Cleaning ${role} profile for phone: ${phone}...`);

    let deleted = false;
    if (role === "admin") {
      const res = await sql`DELETE FROM admin_acct WHERE account_phone = ${phone} RETURNING id`;
      deleted = res.length > 0;
    } else if (role === "provider") {
      const res = await sql`DELETE FROM provider_acct WHERE account_phone = ${phone} RETURNING id`;
      deleted = res.length > 0;
    } else if (role === "staff") {
      const res = await sql`DELETE FROM clinic_staff_acct WHERE account_phone = ${phone} RETURNING id`;
      deleted = res.length > 0;
    }

    if (deleted) {
      console.log(`✅ SUCCESS: ${role} profile removed from database.`);
      console.log(`💡 Your Supabase Auth account is kept intact. You can now run your 'Create' script for a different role.`);
    } else {
      console.log(`ℹ️  No ${role} profile found in database for this phone.`);
    }

  } catch (error) {
    console.error("❌ Error cleaning role:", error);
  } finally {
    await sql.end();
    process.exit();
  }
}

void cleanRole();
