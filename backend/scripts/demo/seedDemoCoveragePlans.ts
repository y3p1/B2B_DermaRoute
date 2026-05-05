import { faker } from "@faker-js/faker";
import { coveragePlans, insurances } from "../../../db/schema";
import { getDb } from "../../services/db";

faker.seed(42);

const PLAN_TYPES = [
  "Medicare Standard", "Medicare Advantage", "Commercial", "Medicaid",
  "Medicare Standard", "Medicare Advantage", "Commercial", "Medicaid",
  "Medicare Standard", "Medicare Advantage",
] as const;

const PLAN_NAMES = [
  "Medicare Part B — Standard Wound Care",
  "Humana Gold Plus HMO",
  "BCBS PPO Plus Wound Care Rider",
  "Texas Medicaid — Wound Matrix Coverage",
  "Medicare Part B — Skin Substitute Q-Codes",
  "Aetna Medicare Advantage Select",
  "UnitedHealthcare SignatureValue Commercial",
  "Medicaid MCO Advanced Wound",
  "Medicare Standard — Biologics Coverage",
  "Cigna Medicare Advantage Preferred",
];

export async function seedDemoCoveragePlans(): Promise<number> {
  const db = getDb();

  const insuranceRows = await db
    .select({ id: insurances.id })
    .from(insurances)
    .limit(10);

  const rows = PLAN_NAMES.map((planName, i) => ({
    planName,
    planType: PLAN_TYPES[i % PLAN_TYPES.length],
    insuranceId: insuranceRows.length > 0 ? insuranceRows[i % insuranceRows.length].id : null,
    coveredProducts: [],
    effectiveDate: faker.date.recent({ days: 365 }).toISOString().slice(0, 10),
    expirationDate: faker.date.future({ years: 1 }).toISOString().slice(0, 10),
    notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
    active: i < 8,
  }));

  await db.insert(coveragePlans).values(rows);

  return rows.length;
}
