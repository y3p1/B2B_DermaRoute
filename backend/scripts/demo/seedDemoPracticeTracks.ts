import dotenv from "dotenv";
process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { practiceTracks, providerAcct } from "../../../db/schema";
import { closeDb, getDb } from "../../services/db";
import { getSupabaseAdminClient } from "../../services/supabaseAdmin";
import { DEMO_USER_IDS, type DemoRole } from "../../../lib/demoMode";

const EXTRA_PROVIDERS = [
  {
    demoRole: "provider_ocular" as DemoRole,
    email: "demo-ocular@dermaroute-demo.example.com",
    password: "DemoOcular2024!",
    phone: "+15550003001",
    firstName: "Taylor",
    lastName: "Nguyen",
    clinicName: "Coastal Eye Clinic",
    clinicAddress: "101 Harbor View Blvd",
    clinicCity: "San Diego",
    clinicState: "CA",
    clinicZip: "92101",
    npiNumber: "9876543210",
    specialty: "Ophthalmology",
    tracks: ["ocular"] as string[],
  },
  {
    demoRole: "provider_wound2" as DemoRole,
    email: "demo-wound2@dermaroute-demo.example.com",
    password: "DemoWound2024!",
    phone: "+15550003002",
    firstName: "Casey",
    lastName: "Morrison",
    clinicName: "Summit Wound Specialists",
    clinicAddress: "450 Mountain View Pkwy",
    clinicCity: "Denver",
    clinicState: "CO",
    clinicZip: "80203",
    npiNumber: "1122334455",
    specialty: "Wound Care",
    tracks: ["wound_care"] as string[],
  },
];

async function getOrCreateProviderId(cfg: (typeof EXTRA_PROVIDERS)[number]): Promise<string> {
  const supabase = getSupabaseAdminClient();

  const createRes = await supabase.auth.admin.createUser({
    email: cfg.email,
    password: cfg.password,
    email_confirm: true,
    phone: cfg.phone,
    user_metadata: {
      full_name: `${cfg.firstName} ${cfg.lastName}`,
      role: "provider",
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
    throw createRes.error ?? new Error(`Failed to create or locate provider ${cfg.email}`);
  }

  return existing.id;
}

export async function seedDemoPracticeTracks(): Promise<number> {
  const db = getDb();

  // Main demo provider → wound_care + lymphedema
  const mainRows = await db
    .select({ id: providerAcct.id })
    .from(providerAcct)
    .where(eq(providerAcct.email, "demo-provider@dermaroute-demo.example.com"))
    .limit(1);

  if (!mainRows[0]) {
    throw new Error("Demo provider not found — run seedDemoUsers first");
  }

  const mainId = mainRows[0].id;

  const providerIds: { id: string; tracks: string[] }[] = [
    { id: mainId, tracks: ["wound_care", "lymphedema"] },
  ];

  // Create extra providers and collect their IDs
  for (const cfg of EXTRA_PROVIDERS) {
    // Ensure auth user exists, but pin providerAcct.userId to the
    // deterministic demo UUID so the role resolves to this provider.
    await getOrCreateProviderId(cfg);
    const userId = DEMO_USER_IDS[cfg.demoRole];

    await db
      .insert(providerAcct)
      .values({
        userId,
        email: cfg.email,
        accountPhone: cfg.phone,
        npiNumber: cfg.npiNumber,
        clinicName: cfg.clinicName,
        clinicAddress: cfg.clinicAddress,
        clinicCity: cfg.clinicCity,
        clinicState: cfg.clinicState,
        clinicZip: cfg.clinicZip,
        clinicPhone: cfg.phone,
        providerSpecialty: cfg.specialty,
        role: "provider",
        active: true,
      })
      .onConflictDoUpdate({
        target: providerAcct.email,
        set: { userId, updatedAt: new Date() },
      });

    const rows = await db
      .select({ id: providerAcct.id })
      .from(providerAcct)
      .where(eq(providerAcct.email, cfg.email))
      .limit(1);

    if (rows[0]) {
      providerIds.push({ id: rows[0].id, tracks: cfg.tracks });
    }
  }

  // Insert track assignments (table is truncated by resetDemo before this runs)
  const trackRows = providerIds.flatMap(({ id, tracks }) =>
    tracks.map((track) => ({ providerId: id, track, enabled: true })),
  );

  if (trackRows.length > 0) {
    await db.insert(practiceTracks).values(trackRows);
  }

  console.log(`  [demo-practice-tracks] ${trackRows.length} track assignments created`);
  return trackRows.length;
}

if (require.main === module) {
  seedDemoPracticeTracks()
    .then((n) => console.log(`\nDone: ${n} track assignments created`))
    .catch((err) => {
      console.error("Failed:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try { await closeDb(); } catch { /* ignore */ }
      process.exit(process.exitCode ?? 0);
    });
}
