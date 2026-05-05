import dotenv from "dotenv";
process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });

import { getDb, closeDb } from "../services/db";
import { manufacturers } from "../../db/manufacturers";

export async function seedManufacturers() {
  const db = getDb();

  // Non-commercial manufacturers (Medicare / Medicaid)
  const nonCommercial = ["Ox", "Tides", "Tiger", "Extremity Care"];

  // Commercial manufacturers
  const commercial = [
    "Venture",
    // Add more commercial manufacturers here if needed
  ];

  for (const name of nonCommercial) {
    try {
      await db
        .insert(manufacturers)
        .values({ name, commercial: false, quarter: 1, year: 2026 })
        .onConflictDoNothing();
    } catch (err) {
      console.error(`Error inserting manufacturer ${name}:`, err);
    }
  }

  for (const name of commercial) {
    try {
      await db
        .insert(manufacturers)
        .values({ name, commercial: true, quarter: 1, year: 2026 })
        .onConflictDoNothing();
    } catch (err) {
      console.error(`Error inserting manufacturer ${name}:`, err);
    }
  }

  console.log("Manufacturers seeded for Q1 2026!");
}

if (require.main === module) {
  seedManufacturers()
    .then(() => closeDb())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
