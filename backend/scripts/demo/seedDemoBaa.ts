import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { baaProvider, providerAcct } from "../../../db/schema";
import { getDb } from "../../services/db";

faker.seed(42);

const CLINIC_NAMES = [
  "Cedar Hills Wound Center", "Riverside Podiatry Group", "Sunrise Dermatology LLC",
  "Lakeside Family Medicine", "Oakwood Orthopedics", "Mountain View Surgical",
  "Coastal Wound Care Institute", "Pinecrest Vascular Clinic",
  "Valley Foot & Ankle Center", "Harborview Specialty Group",
  "Summit Health Partners", "Westside Internal Medicine",
];

const BAA_STATUSES = [
  "approved", "approved", "approved", "approved", "approved",
  "approved", "approved",
  "pending", "pending", "pending",
  "signed", "cancelled",
] as const;

export async function seedDemoBaa(): Promise<number> {
  const db = getDb();

  const providerRows = await db
    .select({ id: providerAcct.id })
    .from(providerAcct)
    .where(eq(providerAcct.email, "demo-provider@dermaroute-demo.example.com"))
    .limit(1);

  if (!providerRows[0]) {
    throw new Error("Demo provider not found — run seedDemoUsers first");
  }

  const providerAcctId = providerRows[0].id;

  const rows = BAA_STATUSES.map((status, i) => {
    const clinicName = CLINIC_NAMES[i % CLINIC_NAMES.length];
    const signedDate = faker.date.recent({ days: 90 }).toISOString().slice(0, 10);

    return {
      providerAcctId,
      coveredEntity: clinicName,
      coveredEntityName: faker.person.fullName(),
      coveredEntityTitle: faker.helpers.arrayElement(["Practice Manager", "Medical Director", "Office Administrator", "Billing Director"]),
      coveredEntityDate: signedDate,
      coveredEntitySignature: faker.person.fullName(),
      businessAssociateName: status === "approved" ? "DermaRoute Demo Admin" : null,
      businessAssociateTitle: status === "approved" ? "Operations Manager" : null,
      businessAssociateDate: status === "approved" ? signedDate : null,
      businessAssociateSignature: status === "approved" ? "DermaRoute Demo" : null,
      status,
    };
  });

  await db.insert(baaProvider).values(rows);

  return rows.length;
}
