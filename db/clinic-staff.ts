import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

import { providerRoleEnum } from "./enums";

// Clinic Staff Account table (linked to Supabase auth.users via user_id)
// Stores clinic staff identities and uses account_phone for OTP authentication
export const clinicStaffAcct = pgTable("clinic_staff_acct", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountPhone: text("account_phone").notNull().unique(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: providerRoleEnum("role").notNull().default("clinic_staff"),
  userId: uuid("user_id").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
