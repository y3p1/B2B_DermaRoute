import { faker } from "@faker-js/faker";
import { cmsPolicyUpdates } from "../../../db/schema";
import { getDb } from "../../services/db";

faker.seed(42);

const TITLES = [
  "CMS Updates Coverage for Skin Substitute Grafts Q2 2026",
  "LCD L37760 Amendment: Bioengineered Skin Substitutes",
  "Medicare Advantage Plan Policy Revision — Wound Care Products",
  "Novitas Solutions: Wound Matrix Coverage Policy Update",
  "CGS Administrators Policy Article A58412 Revision",
  "CMS Transmittal 12453: HCPCS Q-Code Reimbursement Rates",
  "WPS Government Health Administrators LCD Update",
  "Palmetto GBA Jurisdiction J Coverage Determination",
];

const SOURCES = [
  "CMS.gov", "Novitas Solutions", "CGS Administrators",
  "WPS GHA", "Palmetto GBA", "NGS Medicare",
];

const IMPACT_LEVELS = ["high", "high", "medium", "medium", "medium", "low", "low", "low"] as const;

export async function seedDemoCmsPolicy(): Promise<number> {
  const db = getDb();

  const rows = TITLES.map((title, i) => ({
    title,
    sourceUrl: `https://demo.cms.gov/policy-updates/${faker.string.uuid()}`,
    sourceName: SOURCES[i % SOURCES.length],
    publishedAt: faker.date.recent({ days: 90 }),
    summary: faker.lorem.sentences(2),
    keywords: ["wound care", "skin substitute", "Q-code"],
    impactLevel: IMPACT_LEVELS[i % IMPACT_LEVELS.length],
    isRead: i < 3,
  }));

  await db.insert(cmsPolicyUpdates).values(rows);

  return rows.length;
}
