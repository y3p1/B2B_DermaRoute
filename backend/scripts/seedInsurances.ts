import dotenv from "dotenv";
process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });

import { getDb, closeDb } from "../services/db";
import { insurances } from "../../db/insurances";

// Government / non-commercial payers – everything else is treated as commercial
const NON_COMMERCIAL = new Set([
  "Medicare",
  "Medicaid",
  "Medicare Advantage",
  "Tricare",
  "VA (Veterans Affairs)",
]);

// All insurance names from lib/insurance.ts used as seed data
const INSURANCE_NAMES: string[] = [
  "Aetna",
  "Ambetter",
  "Anthem",
  "Blue Cross Blue Shield Association",
  "Blue Cross Blue Shield of Alabama",
  "Blue Cross Blue Shield of Alaska",
  "Blue Cross Blue Shield of Arizona",
  "Blue Cross Blue Shield of Arkansas",
  "Blue Cross Blue Shield of California",
  "Blue Cross Blue Shield of Colorado",
  "Blue Cross Blue Shield of Connecticut",
  "Blue Cross Blue Shield of Delaware",
  "Blue Cross Blue Shield of District of Columbia",
  "Blue Cross Blue Shield of Florida",
  "Blue Cross Blue Shield of Georgia",
  "Blue Cross Blue Shield of Hawaii",
  "Blue Cross Blue Shield of Idaho",
  "Blue Cross Blue Shield of Illinois",
  "Blue Cross Blue Shield of Indiana",
  "Blue Cross Blue Shield of Iowa",
  "Blue Cross Blue Shield of Kansas",
  "Blue Cross Blue Shield of Kentucky",
  "Blue Cross Blue Shield of Louisiana",
  "Blue Cross Blue Shield of Maine",
  "Blue Cross Blue Shield of Maryland",
  "Blue Cross Blue Shield of Massachusetts",
  "Blue Cross Blue Shield of Michigan",
  "Blue Cross Blue Shield of Minnesota",
  "Blue Cross Blue Shield of Mississippi",
  "Blue Cross Blue Shield of Missouri",
  "Blue Cross Blue Shield of Montana",
  "Blue Cross Blue Shield of Nebraska",
  "Blue Cross Blue Shield of Nevada",
  "Blue Cross Blue Shield of New Hampshire",
  "Blue Cross Blue Shield of New Jersey",
  "Blue Cross Blue Shield of New Mexico",
  "Blue Cross Blue Shield of New York",
  "Blue Cross Blue Shield of North Carolina",
  "Blue Cross Blue Shield of North Dakota",
  "Blue Cross Blue Shield of Ohio",
  "Blue Cross Blue Shield of Oklahoma",
  "Blue Cross Blue Shield of Oregon",
  "Blue Cross Blue Shield of Pennsylvania",
  "Blue Cross Blue Shield of Puerto Rico",
  "Blue Cross Blue Shield of Rhode Island",
  "Blue Cross Blue Shield of South Carolina",
  "Blue Cross Blue Shield of South Dakota",
  "Blue Cross Blue Shield of Tennessee",
  "Blue Cross Blue Shield of Texas (BCBSTX)",
  "Blue Cross Blue Shield of Utah",
  "Blue Cross Blue Shield of Vermont",
  "Blue Cross Blue Shield of Virginia",
  "Blue Cross Blue Shield of Washington",
  "Blue Cross Blue Shield of West Virginia",
  "Blue Cross Blue Shield of Wisconsin",
  "Blue Cross Blue Shield of Wyoming",
  "Blue Shield of California",
  "Bright Health",
  "CareSource",
  "Centene",
  "Cigna",
  "Community Health Choice",
  "EmblemHealth",
  "Excellus BlueCross BlueShield",
  "Florida Blue",
  "Geisinger Health Plan",
  "Harvard Pilgrim Health Care",
  "Hawaii Medical Service Association (HMSA)",
  "Health Care Service Corporation (HCSC)",
  "HealthPartners",
  "Highmark",
  "Horizon Blue Cross Blue Shield of New Jersey",
  "Humana",
  "Independence Blue Cross",
  "Kaiser Permanente",
  "Magellan Health",
  "Medicaid",
  "Medical Mutual",
  "Medicare",
  "Medicare Advantage",
  "Medica",
  "Mercy Health Plan",
  "Molina Healthcare",
  "Oscar Health",
  "Other / Self-pay",
  "Priority Health",
  "Regence BlueCross BlueShield",
  "Tricare",
  "Tufts Health Plan",
  "UnitedHealthcare",
  "UPMC Health Plan",
  "VA (Veterans Affairs)",
  "WellCare",
  "Wellmark",
];

export async function seedInsurances() {
  const db = getDb();
  let inserted = 0;
  let skipped = 0;

  for (const name of INSURANCE_NAMES) {
    try {
      const result = await db
        .insert(insurances)
        .values({
          name,
          commercial: !NON_COMMERCIAL.has(name),
        })
        .onConflictDoNothing()
        .returning();

      if (result.length > 0) {
        inserted++;
        console.log(`  ✓ ${name} (commercial=${!NON_COMMERCIAL.has(name)})`);
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`  ✗ Error inserting "${name}":`, err);
    }
  }

  console.log(
    `\nDone. Inserted: ${inserted}, Already existed (skipped): ${skipped}`,
  );
}

if (require.main === module) {
  seedInsurances()
    .then(() => closeDb())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
