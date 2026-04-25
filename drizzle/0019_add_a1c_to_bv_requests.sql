-- Migration: add A1C fields to bv_requests (Roadmap #10a — Admin Analytics foundation)
-- A1C is needed for the risk scoring engine (block threshold + warn threshold).
-- Nullable so existing rows remain valid.

ALTER TABLE "bv_requests"
  ADD COLUMN IF NOT EXISTS "a1c_percent"     numeric(4, 2),
  ADD COLUMN IF NOT EXISTS "a1c_measured_at" date;
