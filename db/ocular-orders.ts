import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  varchar,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { providerAcct } from "./provider";
import { ocularProducts } from "./ocular-products";

// RLS policies: supabase/rls/ocular_orders.sql (finding #12)
export const ocularOrders = pgTable("ocular_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").references(() => providerAcct.id, {
    onDelete: "set null",
  }),
  submittedBy: uuid("submitted_by"),
  orderingProviderId: uuid("ordering_provider_id").references(
    () => providerAcct.id,
    { onDelete: "set null" },
  ),
  patient: jsonb("patient"),
  primaryDiagnosis: text("primary_diagnosis"),
  secondaryDiagnosis: text("secondary_diagnosis"),
  eye: varchar("eye", { length: 16 }),
  productVariant: varchar("product_variant", { length: 16 }),
  sizeMm: integer("size_mm"),
  sku: text("sku"),
  quantity: integer("quantity"),
  dateNeededBy: date("date_needed_by"),
  shipTo: jsonb("ship_to"),
  specialInstructions: text("special_instructions"),
  insurancePayer: text("insurance_payer"),
  insuranceMemberId: text("insurance_member_id"),
  pdfUrl: text("pdf_url"),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  submissionEmailUsed: text("submission_email_used"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  ocularProductId: uuid("ocular_product_id").references(
    () => ocularProducts.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
