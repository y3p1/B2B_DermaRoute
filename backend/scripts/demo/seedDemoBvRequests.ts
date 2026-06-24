import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { bvRequests, providerAcct } from "../../../db/schema";
import { getDb } from "../../services/db";

faker.seed(42);

const STATUSES = [
  "pending", "pending", "pending",
  "downloaded", "downloaded", "downloaded", "downloaded",
  "pending_review", "pending_review", "pending_review",
  "approved", "approved", "approved", "approved", "approved",
  "rejected", "rejected",
  "completed", "completed", "completed",
] as const;

// Smaller, still-varied set for the second wound-care provider so its
// dashboard is populated and it has an approved+verified request to order against.
const WOUND2_STATUSES = [
  "pending", "downloaded", "pending_review",
  "approved", "approved", "rejected", "completed",
] as const;

// Both wound-care providers get their own requests so each provider account
// dashboard is populated (not just the main demo provider).
const WOUND_PROVIDERS = [
  { email: "demo-provider@dermaroute-demo.example.com", clinic: "Cedar Hills Wound Center", statuses: STATUSES },
  { email: "demo-wound2@dermaroute-demo.example.com", clinic: "Summit Wound Specialists", statuses: WOUND2_STATUSES },
] as const;

const INSURANCES = [
  "Medicare", "Medicare Advantage", "Blue Cross Blue Shield",
  "Aetna", "UnitedHealthcare", "Cigna", "Humana",
];
const WOUND_TYPES = ["diabetic_foot_ulcer", "venous_leg_ulcer", "pressure_ulcer", "surgical_wound"];
const WOUND_SIZES = ["2x2", "4x4", "4x8", "6x6", "disc_20cm2", "disc_40cm2"];
const WOUND_LOCATIONS = [
  "Left plantar heel", "Right lateral ankle", "Sacrum", "Right dorsal foot",
  "Left lower leg", "Abdominal midline", "Right plantar metatarsal",
];
const ICD10_CODES = ["L97.319", "L97.429", "L89.154", "L97.512", "L97.112"];
const INITIALS = ["J.S.", "M.K.", "R.T.", "A.B.", "C.D.", "L.N.", "P.W.", "D.H.", "S.M.", "T.R."];

export async function seedDemoBvRequests(): Promise<number> {
  const db = getDb();
  let total = 0;

  for (const wp of WOUND_PROVIDERS) {
    const providerRows = await db
      .select({ id: providerAcct.id })
      .from(providerAcct)
      .where(eq(providerAcct.email, wp.email))
      .limit(1);

    if (!providerRows[0]) {
      throw new Error(`Demo provider ${wp.email} not found — run seedDemoUsers/seedDemoPracticeTracks first`);
    }

    const providerId = providerRows[0].id;

    const rows = wp.statuses.map((status) => {
      const appDate = faker.date.recent({ days: 60 });
      // Approved/completed requests carry verified manufacturer proof so the
      // provider is eligible to order against them. Requests under review show
      // a pending proof; everything else has no proof yet.
      const proofStatus =
        status === "approved" || status === "completed"
          ? "verified"
          : status === "pending_review"
            ? "pending_review"
            : null;
      return {
        providerId,
        provider: wp.clinic,
        placeOfService: faker.helpers.arrayElement(["11 - Office", "22 - Outpatient Hospital", "31 - Skilled Nursing"]),
        insurance: faker.helpers.arrayElement(INSURANCES),
        woundType: faker.helpers.arrayElement(WOUND_TYPES),
        woundSize: faker.helpers.arrayElement(WOUND_SIZES),
        woundLocation: faker.helpers.arrayElement(WOUND_LOCATIONS),
        icd10: faker.helpers.arrayElement(ICD10_CODES),
        conservativeTherapy: faker.datatype.boolean(),
        diabetic: faker.datatype.boolean(),
        a1cPercent: String(faker.number.float({ min: 6.5, max: 11.0, fractionDigits: 1 })),
        tunneling: faker.datatype.boolean(),
        infected: faker.datatype.boolean(),
        initials: faker.helpers.arrayElement(INITIALS),
        applicationDate: appDate.toISOString().slice(0, 10),
        status,
        proofStatus,
        healingTrackerActive: status === "completed" || status === "approved",
      };
    });

    await db.insert(bvRequests).values(rows);
    total += rows.length;
  }

  return total;
}
