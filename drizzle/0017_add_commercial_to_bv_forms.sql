-- Add commercial flag to bv_forms so forms can be filtered by insurance type.
-- commercial = TRUE  → shown when provider selects a commercial insurance plan
-- commercial = FALSE → shown when provider selects a non-commercial (Medicare/Medicaid) plan
-- Default NULL means the form applies to both types (backward-compatible).

ALTER TABLE "bv_forms"
  ADD COLUMN IF NOT EXISTS "commercial" boolean;
