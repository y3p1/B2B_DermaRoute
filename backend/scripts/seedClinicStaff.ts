import { getDb } from "../services/db";
import { faker } from "@faker-js/faker";
import { clinicStaffAcct } from "../../db/clinic-staff";

async function seedClinicStaff() {
  const staff = Array.from({ length: 10 }).map(() => ({
    accountPhone: faker.phone.number(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: "clinic_staff" as const,
    userId: faker.string.uuid(),
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const db = getDb();
  for (const s of staff) {
    await db.insert(clinicStaffAcct).values(s);
  }
  console.log("Seeded clinic staff accounts");
}

seedClinicStaff().catch(console.error);
