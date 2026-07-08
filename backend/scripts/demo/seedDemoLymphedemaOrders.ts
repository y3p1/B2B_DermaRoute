import dotenv from "dotenv";
process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { lymphedemaOrders, providerAcct } from "../../../db/schema";
import { closeDb, getDb } from "../../services/db";

const ORDERS = [
  {
    patient: { firstName: "Barbara", lastName: "Hensley", dob: "1952-03-14", mrn: "LY-001" },
    insurance: "Medicare",
    placeOfService: "11 - Office",
    diagnosis: { primary: "I89.0 Lymphedema", secondary: "I87.2 Venous insufficiency" },
    conservativeTherapyCompleted: true,
    extremity: { side: "left", type: "lower" },
    skinChanges: { fibrosis: true, pitting: true, thickening: false },
    measurements: { thigh: "52cm", calf: "44cm", ankle: "34cm" },
    device: "AIROS 8",
    hcpcs: "E0652",
    deviceRecommended: true,
    garmentType: "compression_pump",
    garmentStyle: "sequential",
    compressionLevel: "gradient",
    quantity: 1,
    customMade: false,
    timesPerDay: 2,
    minutesPerSession: 45,
    status: "pending",
    submissionEmailUsed: "shawn.druzali04@gmail.com",
    submittedAt: new Date("2026-06-10T09:15:00Z"),
  },
  {
    patient: { firstName: "Gerald", lastName: "Watkins", dob: "1948-07-22", mrn: "LY-002" },
    insurance: "Blue Cross Blue Shield",
    placeOfService: "11 - Office",
    diagnosis: { primary: "I89.0 Lymphedema" },
    conservativeTherapyCompleted: true,
    extremity: { side: "right", type: "upper" },
    skinChanges: { fibrosis: false, pitting: true, thickening: true },
    measurements: { upperArm: "38cm", forearm: "32cm", wrist: "22cm" },
    device: "AIROS 6P",
    hcpcs: "E0651",
    deviceRecommended: true,
    garmentType: "compression_pump",
    garmentStyle: "peristaltic",
    compressionLevel: "gradient",
    quantity: 1,
    customMade: false,
    timesPerDay: 2,
    minutesPerSession: 30,
    status: "approved",
    submissionEmailUsed: "shawn.druzali04@gmail.com",
    submittedAt: new Date("2026-06-03T14:22:00Z"),
  },
  {
    patient: { firstName: "Sylvia", lastName: "Nguyen", dob: "1961-11-05", mrn: "LY-003" },
    insurance: "Aetna",
    placeOfService: "11 - Office",
    diagnosis: { primary: "I89.0 Lymphedema", secondary: "E11.69 Type 2 diabetes mellitus" },
    conservativeTherapyCompleted: true,
    extremity: { side: "bilateral", type: "lower" },
    skinChanges: { fibrosis: true, pitting: true, thickening: true },
    measurements: { leftCalf: "47cm", rightCalf: "49cm", leftAnkle: "35cm", rightAnkle: "36cm" },
    device: "AIROS 6",
    hcpcs: "E0651",
    deviceRecommended: true,
    garmentType: "compression_pump",
    garmentStyle: "sequential",
    compressionLevel: "gradient",
    quantity: 1,
    customMade: false,
    timesPerDay: 1,
    minutesPerSession: 60,
    status: "shipped",
    submissionEmailUsed: "shawn.druzali04@gmail.com",
    submittedAt: new Date("2026-05-28T11:05:00Z"),
  },
  {
    patient: { firstName: "Donald", lastName: "Larson", dob: "1955-04-30", mrn: "LY-004" },
    insurance: "UnitedHealthcare",
    placeOfService: "22 - Outpatient Hospital",
    diagnosis: { primary: "I89.0 Lymphedema" },
    conservativeTherapyCompleted: false,
    extremity: { side: "left", type: "lower" },
    skinChanges: { fibrosis: false, pitting: false, thickening: false },
    measurements: { calf: "41cm", ankle: "30cm" },
    device: "AIROS 8",
    hcpcs: "E0652",
    deviceRecommended: false,
    garmentType: "compression_pump",
    garmentStyle: "sequential",
    compressionLevel: "gradient",
    quantity: 1,
    customMade: false,
    timesPerDay: 2,
    minutesPerSession: 45,
    status: "denied",
    submissionEmailUsed: "shawn.druzali04@gmail.com",
    submittedAt: new Date("2026-05-20T16:40:00Z"),
  },
  {
    patient: { firstName: "Patricia", lastName: "Coleman", dob: "1967-09-18", mrn: "LY-005" },
    insurance: "Humana",
    placeOfService: "11 - Office",
    diagnosis: { primary: "I89.0 Lymphedema", secondary: "C50.912 Breast cancer, right" },
    conservativeTherapyCompleted: true,
    extremity: { side: "right", type: "upper" },
    skinChanges: { fibrosis: true, pitting: false, thickening: false },
    measurements: { upperArm: "35cm", forearm: "29cm" },
    device: "AIROS 6P",
    hcpcs: "E0651",
    deviceRecommended: true,
    garmentType: "compression_pump",
    garmentStyle: "peristaltic",
    compressionLevel: "gradient",
    quantity: 1,
    customMade: false,
    timesPerDay: 1,
    minutesPerSession: 30,
    status: "completed",
    submissionEmailUsed: "shawn.druzali04@gmail.com",
    submittedAt: new Date("2026-05-05T10:00:00Z"),
  },
];

export async function seedDemoLymphedemaOrders(): Promise<number> {
  const db = getDb();

  const providerRows = await db
    .select({ id: providerAcct.id })
    .from(providerAcct)
    .where(eq(providerAcct.email, "demo-provider@dermaroute-demo.example.com"))
    .limit(1);

  if (!providerRows[0]) {
    throw new Error("Demo provider not found — run seedDemoUsers first");
  }

  const providerId = providerRows[0].id;

  const rows = ORDERS.map((o) => ({
    ...o,
    diagnosis: Object.values(o.diagnosis),
    extremity: Object.values(o.extremity),
    skinChanges: Object.entries(o.skinChanges)
      .filter(([, v]) => v)
      .map(([k]) => k),
    providerId,
    submittedBy: providerId,
    orderingProviderId: providerId,
  }));

  await db.insert(lymphedemaOrders).values(rows);

  console.log(`  [demo-lymphedema-orders] ${rows.length} orders created`);
  return rows.length;
}

if (require.main === module) {
  seedDemoLymphedemaOrders()
    .then((n) => console.log(`\nDone: ${n} lymphedema orders created`))
    .catch((err) => {
      console.error("Failed:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try { await closeDb(); } catch { /* ignore */ }
      process.exit(process.exitCode ?? 0);
    });
}
