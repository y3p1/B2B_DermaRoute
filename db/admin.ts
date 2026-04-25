import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { providerRoleEnum } from "./enums";

// Admin Account table (linked to Supabase auth.users via user_id)
// This table stores admin identities and uses account_phone for OTP authentication
export const adminAcct = pgTable("admin_acct", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountPhone: text("account_phone").notNull().unique(), // Used for Supabase OTP signin
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: providerRoleEnum("role").notNull().default("admin"),
  userId: uuid("user_id").notNull().unique(), // References auth.users(id) in Supabase
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
