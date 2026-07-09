import {
  pgTable,
  varchar,
  text,
  date,
  boolean,
  uuid,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { providerAcct } from "./provider";

export const bvRequests = pgTable("bv_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").references(() => providerAcct.id, {
    onDelete: "set null",
  }), // FK to provider_acct table
  provider: varchar("provider", { length: 128 }),
  placeOfService: varchar("place_of_service", { length: 64 }),
  insurance: varchar("insurance", { length: 64 }),
  woundType: varchar("wound_type", { length: 64 }),
  woundSize: varchar("wound_size", { length: 128 }),
  woundLocation: varchar("wound_location", { length: 128 }),
  icd10: varchar("icd10", { length: 32 }),
  conservativeTherapy: boolean("conservative_therapy"),
  diabetic: boolean("diabetic"),
  a1cPercent: numeric("a1c_percent", { precision: 4, scale: 2 }),
  a1cMeasuredAt: date("a1c_measured_at"),
  tunneling: boolean("tunneling"),
  infected: boolean("infected"),
  initials: varchar("initials", { length: 64 }),
  applicationDate: date("application_date"),
  deliveryDate: date("delivery_date"),
  deliveryAddress: varchar("delivery_address", { length: 256 }),
  deliveryCity: varchar("delivery_city", { length: 128 }),
  deliveryState: varchar("delivery_state", { length: 2 }),
  deliveryZip: varchar("delivery_zip", { length: 10 }),
  instructions: text("instructions"),
  status: varchar("status", { length: 32 }).notNull().default("pending"), // pending, downloaded, approved, rejected
  verifiedBy: uuid("verified_by"), // Can be admin_acct.id, clinic_staff_acct.id, or provider_acct.id
  verifiedByType: varchar("verified_by_type", { length: 32 }), // 'admin', 'clinic_staff', or 'provider'
  // --- NEW: Manufacturer proof upload (Phase 2 #5) ---
  approvalProofUrl: text("approval_proof_url"),          // Supabase Storage path
  proofStatus: varchar("proof_status", { length: 32 }),  // null | "pending_review" | "verified"
  // ---------------------------------------------------
  healingTrackerActive: boolean("healing_tracker_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("bv_requests_provider_id_idx").on(t.providerId),
  index("bv_requests_status_idx").on(t.status),
  index("bv_requests_created_at_idx").on(t.createdAt),
]);
