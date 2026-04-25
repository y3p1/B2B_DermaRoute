import {
  pgTable,
  text,
  uuid,
  numeric,
  boolean,
  integer,
  timestamp,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";
import { products } from "./products";
import { manufacturers } from "./manufacturers";
import { bvRequests } from "./bv-requests";

// Wound size options (dropdown list values)
export const woundSizes = pgTable("wound_sizes", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  areaCm2: numeric("area_cm2").notNull(),
  category: varchar("category", { length: 32 }).notNull().default("rectangular"), // 'disc' | 'rectangular'
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Order products table (BV templates / product metadata)
export const orderProducts = pgTable("order_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  sku: text("sku"),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "set null" }),
  manufacturerId: uuid("manufacturer_id")
    .references(() => manufacturers.id)
    .notNull(),
  description: text("description"),
  woundTypes: jsonb("wound_types"),
  allowedWoundSizes: jsonb("allowed_wound_sizes"),
  insuranceCoverage: jsonb("insurance_coverage"),
  requiresManualSubmission: boolean("requires_manual_submission").default(true),
  approvalProofUrl: text("approval_proof_url"),
  benefitsVerificationFormVersion: text("benefits_verification_form_version"),
  formChangeNote: text("form_change_note"),
  active: boolean("active").default(true),
  // Product Order fields
  bvRequestId: uuid("bv_request_id").references(() => bvRequests.id),
  status: varchar("status", { length: 32 }).default("pending"), // pending, shipped, completed, cancelled
  createdBy: uuid("created_by"),
  createdByType: varchar("created_by_type", { length: 32 }), // 'admin', 'clinic_staff', or 'provider'
  notes: text("notes"),
  // Delivery details
  deliveryAddress: text("delivery_address"),
  deliveryCity: text("delivery_city"),
  deliveryState: varchar("delivery_state", { length: 2 }),
  deliveryZip: varchar("delivery_zip", { length: 10 }),
  deliveryDate: text("delivery_date"),
  contactPhone: text("contact_phone"),
  // Risk scoring (Phase 10b)
  riskScore: integer("risk_score"),
  riskTier: varchar("risk_tier", { length: 16 }), // 'critical' | 'high' | 'standard' | 'low'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
