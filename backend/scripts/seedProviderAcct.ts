import { getDb } from "../services/db";
import { faker } from "@faker-js/faker";
import { providerAcct } from "../../db/provider";

async function seedProviderAcct() {
  const providers = Array.from({ length: 10 }).map(() => ({
    accountPhone: faker.phone.number(),
    email: faker.internet.email(),
    npiNumber: faker.string.numeric(10),
    clinicName: faker.company.name(),
    role: "provider" as const,
    userId: faker.string.uuid(),
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const db = getDb();
  for (const p of providers) {
    await db.insert(providerAcct).values(p);
  }
  console.log("Seeded provider accounts");
}

seedProviderAcct().catch(console.error);
