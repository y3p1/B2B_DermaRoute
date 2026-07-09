import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { providerAcct } from "./provider";
import { lymphedemaProducts } from "./lymphedema-products";

// RLS policies: supabase/rls/lymphedema_orders.sql (finding #12)
export const lymphedemaOrders = pgTable("lymphedema_orders", {
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
  insurance: text("insurance"),
  placeOfService: text("place_of_service"),
  diagnosis: jsonb("diagnosis"),
  conservativeTherapyCompleted: boolean("conservative_therapy_completed"),
  skinChanges: jsonb("skin_changes"),
  extremity: jsonb("extremity"),
  measurements: jsonb("measurements"),
  device: text("device"),
  hcpcs: text("hcpcs"),
  deviceRecommended: boolean("device_recommended"),
  garmentType: text("garment_type"),
  garmentStyle: text("garment_style"),
  compressionLevel: text("compression_level"),
  quantity: integer("quantity"),
  customMade: boolean("custom_made"),
  manufacturerPreference: text("manufacturer_preference"),
  distalPressureMmhg: integer("distal_pressure_mmhg"),
  timesPerDay: integer("times_per_day"),
  minutesPerSession: integer("minutes_per_session"),
  pdfUrl: text("pdf_url"),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  submissionEmailUsed: text("submission_email_used"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  lymphedemaProductId: uuid("lymphedema_product_id").references(
    () => lymphedemaProducts.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
