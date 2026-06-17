import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { providerRoleEnum } from "./enums";
import { clinicStaffAcct } from "./clinic-staff";

// Provider Account table (linked to Supabase auth.users via user_id)
// This table stores provider signup data and uses account_phone for OTP authentication
export const providerAcct = pgTable("provider_acct", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountPhone: text("account_phone").notNull().unique(), // Used for Supabase OTP signin
  email: text("email").notNull().unique(),
  npiNumber: text("npi_number").notNull(),
  clinicName: text("clinic_name").notNull(),
  clinicAddress: text("clinic_address"),
  clinicCity: text("clinic_city"),
  clinicState: text("clinic_state"),
  clinicZip: text("clinic_zip"),
  clinicPhone: text("clinic_phone"),
  providerSpecialty: text("provider_specialty"),
  taxId: text("tax_id"),
  groupNpi: text("group_npi"),
  assignedRepId: uuid("assigned_rep_id").references(() => clinicStaffAcct.id, {
    onDelete: "set null",
  }),
  role: providerRoleEnum("role").notNull().default("provider"),
  userId: uuid("user_id").notNull().unique(), // References auth.users(id) in Supabase
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
