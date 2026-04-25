import {
  pgTable,
  uuid,
  numeric,
  date,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { bvRequests } from "./bv-requests";

// Wound healing measurements (Roadmap #9 — Healing Factor Tracker)
// Each row is one wound size reading for a wound case (anchored to a bv_request).
// The earliest row per bvRequestId is the baseline; subsequent rows feed % reduction.
export const woundMeasurements = pgTable("wound_measurements", {
  id: uuid("id").primaryKey().defaultRandom(),
  bvRequestId: uuid("bv_request_id")
    .references(() => bvRequests.id, { onDelete: "cascade" })
    .notNull(),
  sizeCm2: numeric("size_cm2", { precision: 10, scale: 2 }).notNull(),
  measuredAt: date("measured_at").notNull().defaultNow(),
  recordedBy: uuid("recorded_by"),
  recordedByType: varchar("recorded_by_type", { length: 32 }), // 'admin' | 'clinic_staff' | 'provider'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
