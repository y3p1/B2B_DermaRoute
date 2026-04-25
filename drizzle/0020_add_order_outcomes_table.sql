-- Migration: add order_outcomes table (Roadmap #10a — Admin Analytics foundation)
-- One row per logged outcome for an order. Feeds the success-rate lookup
-- and the analytics feedback loop in the admin dashboard.

CREATE TABLE IF NOT EXISTS "order_outcomes" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_product_id"   uuid NOT NULL REFERENCES "order_products"("id") ON DELETE CASCADE,
  "bv_request_id"      uuid REFERENCES "bv_requests"("id") ON DELETE SET NULL,
  "healed"             boolean,
  "weeks_to_heal"      integer,
  "complications"      text,
  "application_count"  integer,
  "recorded_by"        uuid,
  "recorded_by_type"   varchar(32),
  "recorded_at"        timestamp DEFAULT now(),
  "created_at"         timestamp DEFAULT now(),
  "updated_at"         timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "order_outcomes_order_product_id_idx"
  ON "order_outcomes" ("order_product_id");

CREATE INDEX IF NOT EXISTS "order_outcomes_bv_request_id_idx"
  ON "order_outcomes" ("bv_request_id");
