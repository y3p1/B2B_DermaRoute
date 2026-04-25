import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  date,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { insurances } from "./insurances";

// Coverage Plans — insurance plan entries with covered product lists
export const coveragePlans = pgTable("coverage_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  insuranceId: uuid("insurance_id").references(() => insurances.id, {
    onDelete: "set null",
  }),
  planName: varchar("plan_name", { length: 255 }).notNull(),
  planType: varchar("plan_type", { length: 64 }).notNull(), // Medicare Advantage, Commercial, Medicaid, Medicare Standard
  coveredProducts: jsonb("covered_products"), // array of product UUIDs
  policyDocUrl: text("policy_doc_url"),
  effectiveDate: date("effective_date"),
  expirationDate: date("expiration_date"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Policy Monitors — URL change-detection entries
export const policyMonitors = pgTable("policy_monitors", {
  id: uuid("id").primaryKey().defaultRandom(),
  coveragePlanId: uuid("coverage_plan_id")
    .references(() => coveragePlans.id, { onDelete: "cascade" })
    .notNull(),
  monitorUrl: text("monitor_url").notNull(),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  lastHttpStatus: integer("last_http_status"),
  contentHash: varchar("content_hash", { length: 128 }), // SHA-256 hex
  changeDetected: boolean("change_detected").notNull().default(false),
  lastChangeAt: timestamp("last_change_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
