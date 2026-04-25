-- Migration: add wound_measurements table (Roadmap #9 — Healing Factor Tracker)
-- Each row = one wound size reading anchored to a bv_request (the wound case).
-- The earliest row per bv_request_id is the baseline.

CREATE TABLE IF NOT EXISTS "wound_measurements" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "bv_request_id"    uuid NOT NULL REFERENCES "bv_requests"("id") ON DELETE CASCADE,
  "size_cm2"         numeric(10, 2) NOT NULL,
  "measured_at"      date NOT NULL DEFAULT now(),
  "recorded_by"      uuid,
  "recorded_by_type" varchar(32),
  "notes"            text,
  "created_at"       timestamp DEFAULT now(),
  "updated_at"       timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "wound_measurements_bv_request_id_idx"
  ON "wound_measurements" ("bv_request_id");

CREATE INDEX IF NOT EXISTS "wound_measurements_measured_at_idx"
  ON "wound_measurements" ("bv_request_id", "measured_at");
