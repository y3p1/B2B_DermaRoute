import dotenv from "dotenv";
process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });

import { systemSettings } from "../../../db/schema";
import { closeDb, getDb } from "../../services/db";

const SETTINGS = [
  { key: "lymphedema_submission_email", value: "shawn.druzali04@gmail.com" },
  { key: "ocular_submission_email", value: "shawn.druzali04@gmail.com" },
  { key: "bv_submission_email", value: "shawn.druzali04@gmail.com" },
  { key: "wound_care_submission_email", value: "shawn.druzali04@gmail.com" },
];

export async function seedDemoSystemSettings(): Promise<number> {
  const db = getDb();

  for (const setting of SETTINGS) {
    await db
      .insert(systemSettings)
      .values(setting)
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: setting.value, updatedAt: new Date() },
      });
  }

  console.log(`  [demo-system-settings] ${SETTINGS.length} settings upserted`);
  return SETTINGS.length;
}

if (require.main === module) {
  seedDemoSystemSettings()
    .then((n) => console.log(`\nDone: ${n} settings upserted`))
    .catch((err) => {
      console.error("Failed:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try { await closeDb(); } catch { /* ignore */ }
      process.exit(process.exitCode ?? 0);
    });
}
