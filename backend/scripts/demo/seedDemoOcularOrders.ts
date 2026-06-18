import dotenv from "dotenv";
process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { ocularOrders, providerAcct } from "../../../db/schema";
import { closeDb, getDb } from "../../services/db";

const ORDERS = [
  {
    patient: { firstName: "Margaret", lastName: "Sullivan", dob: "1944-02-08", mrn: "OC-001" },
    primaryDiagnosis: "H16.009 Corneal ulcer, unspecified, unspecified eye",
    secondaryDiagnosis: "H16.041 Marginal corneal ulcer, right eye",
    eye: "right",
    productVariant: "thin",
    sizeMm: 10,
    sku: "VS4510",
    quantity: 1,
    dateNeededBy: "2026-06-25",
    shipTo: { address: "2500 Cedar Hill Dr", city: "Austin", state: "TX", zip: "78704" },
    insurancePayer: "Medicare",
    insuranceMemberId: "1EG4-TE5-MK72",
    status: "pending",
    submissionEmailUsed: "shawn.druzali04@gmail.com",
    submittedAt: new Date("2026-06-15T08:30:00Z"),
  },
  {
    patient: { firstName: "Raymond", lastName: "Okafor", dob: "1958-06-17", mrn: "OC-002" },
    primaryDiagnosis: "H04.123 Dry eye syndrome of bilateral lacrimal glands",
    eye: "bilateral",
    productVariant: "thick",
    sizeMm: 12,
    sku: "VS20012",
    quantity: 2,
    dateNeededBy: "2026-06-30",
    shipTo: { address: "2500 Cedar Hill Dr", city: "Austin", state: "TX", zip: "78704" },
    insurancePayer: "Blue Cross Blue Shield",
    insuranceMemberId: "XYZ987654321",
    status: "approved",
    submissionEmailUsed: "shawn.druzali04@gmail.com",
    submittedAt: new Date("2026-06-08T13:45:00Z"),
  },
  {
    patient: { firstName: "Linda", lastName: "Fitzgerald", dob: "1950-10-23", mrn: "OC-003" },
    primaryDiagnosis: "H18.059 Salzmann nodular corneal degeneration, unspecified eye",
    eye: "left",
    productVariant: "thin",
    sizeMm: 8,
    sku: "VS4508",
    quantity: 1,
    dateNeededBy: "2026-07-05",
    shipTo: { address: "2500 Cedar Hill Dr", city: "Austin", state: "TX", zip: "78704" },
    insurancePayer: "UnitedHealthcare",
    insuranceMemberId: "UHC20240099",
    status: "shipped",
    submissionEmailUsed: "shawn.druzali04@gmail.com",
    submittedAt: new Date("2026-05-30T09:00:00Z"),
  },
  {
    patient: { firstName: "James", lastName: "Petrowski", dob: "1962-12-01", mrn: "OC-004" },
    primaryDiagnosis: "H16.251 Phlyctenular keratoconjunctivitis, right eye",
    eye: "right",
    productVariant: "thick",
    sizeMm: 15,
    sku: "VS20015",
    quantity: 1,
    dateNeededBy: "2026-07-10",
    shipTo: { address: "2500 Cedar Hill Dr", city: "Austin", state: "TX", zip: "78704" },
    insurancePayer: "Aetna",
    insuranceMemberId: "AET55512345",
    status: "completed",
    submissionEmailUsed: "shawn.druzali04@gmail.com",
    submittedAt: new Date("2026-05-15T11:20:00Z"),
  },
];

export async function seedDemoOcularOrders(): Promise<number> {
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
    providerId,
    submittedBy: providerId,
    orderingProviderId: providerId,
  }));

  await db.insert(ocularOrders).values(rows);

  console.log(`  [demo-ocular-orders] ${rows.length} orders created`);
  return rows.length;
}

if (require.main === module) {
  seedDemoOcularOrders()
    .then((n) => console.log(`\nDone: ${n} ocular orders created`))
    .catch((err) => {
      console.error("Failed:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try { await closeDb(); } catch { /* ignore */ }
      process.exit(process.exitCode ?? 0);
    });
}
