-- Migration: 0005_bv_products.sql
-- Creates tables for Benefits Verification / Order Products, wound sizes, and ordering providers

-- Ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Insurance type enum to help mapping
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'insurance_type') THEN
        CREATE TYPE insurance_type AS ENUM ('commercial', 'medicare', 'medicare_advantage', 'medicaid', 'other');
    END IF;
END$$;

-- Ordering providers table
CREATE TABLE IF NOT EXISTS ordering_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Wound size options (dropdown list values)
CREATE TABLE IF NOT EXISTS wound_sizes (
  id serial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  area_cm2 numeric NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Core product table for ordering / BV templates
CREATE TABLE IF NOT EXISTS order_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text,
  manufacturer text,
  description text,
  -- allowed wound types (eg: "ulcer", "surgical", ...) as an array
  wound_types text[] DEFAULT '{}',
  -- allowed or recommended wound size option keys
  allowed_wound_sizes jsonb DEFAULT '[]'::jsonb,
  -- insurance coverage hints, freeform JSON (can include arrays of insurance_type or custom rules)
  insurance_coverage jsonb DEFAULT '{}'::jsonb,
  -- provider suggestions / allowed providers JSON (list of ordering_providers.id or names)
  ordering_providers jsonb DEFAULT '[]'::jsonb,
  -- whether clinic must manually submit proof to manufacturer (HIPAA flow)
  requires_manual_submission boolean DEFAULT true,
  -- where clinics may upload proof / confirmation (could be url to supabase storage record)
  approval_proof_url text,
  -- BV form version (note: changes quarterly)
  benefits_verification_form_version text,
  -- note about quarterly changes
  form_change_note text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- table mapping insurance types to preferred ordering_providers
CREATE TABLE IF NOT EXISTS insurance_provider_mappings (
  id serial PRIMARY KEY,
  insurance insurance_type NOT NULL,
  provider_id uuid REFERENCES ordering_providers(id) ON DELETE CASCADE,
  priority int DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_products_updated_at
BEFORE UPDATE ON order_products
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

-- Seed: Wound sizes (discs, squares/rectangles)
INSERT INTO wound_sizes (key, label, area_cm2, metadata)
VALUES
('disc_6mm', '6mm Disc (0.283 cm²)', 0.283, '{"type":"disc","diameter_mm":6}'),
('disc_12mm', '12mm Disc (1.131 cm²)', 1.131, '{"type":"disc","diameter_mm":12}'),
('disc_15mm', '15mm Disc (1.767 cm²)', 1.767, '{"type":"disc","diameter_mm":15}'),
('disc_16mm', '16mm Disc (2.011 cm²)', 2.011, '{"type":"disc","diameter_mm":16}'),
('sq_1x1', '1x1 cm (1 cm²)', 1, '{"w":1, "h":1}'),
('sq_1_5x1_5', '1.5x1.5 cm (2.25 cm²)', 2.25, '{"w":1.5, "h":1.5}'),
('sq_1_5x2', '1.5x2 cm (3 cm²)', 3, '{"w":1.5, "h":2}'),
('sq_2x2', '2x2 cm (4 cm²)', 4, '{"w":2, "h":2}'),
('sq_2x3', '2x3 cm (6 cm²)', 6, '{"w":2, "h":3}'),
('sq_2x4', '2x4 cm (8 cm²)', 8, '{"w":2, "h":4}'),
('sq_3x3', '3x3 cm (9 cm²)', 9, '{"w":3, "h":3}'),
('sq_3x3_5', '3x3.5 cm (10.5 cm²)', 10.5, '{"w":3, "h":3.5}'),
('sq_3x4', '3x4 cm (12 cm²)', 12, '{"w":3, "h":4}'),
('sq_4x4', '4x4 cm (16 cm²)', 16, '{"w":4, "h":4}'),
('sq_4x6', '4x6 cm (24 cm²)', 24, '{"w":4, "h":6}'),
('sq_4x8', '4x8 cm (32 cm²)', 32, '{"w":4, "h":8}'),
('sq_5x5', '5x5 cm (25 cm²)', 25, '{"w":5, "h":5}'),
('sq_6x8', '6x8 cm (48 cm²)', 48, '{"w":6, "h":8}'),
('sq_7x7', '7x7 cm (49 cm²)', 49, '{"w":7, "h":7}')
ON CONFLICT (key) DO NOTHING;

-- Seed: ordering providers
INSERT INTO ordering_providers (id, name, display_name, metadata, display_order)
VALUES
(gen_random_uuid(), 'Venture Medical', 'Venture Medical', '{"notes":"handles commercial insurance"}', 10),
(gen_random_uuid(), 'Ox', 'Ox', '{"notes":"Medicare/MA"}', 20),
(gen_random_uuid(), 'Tides', 'Tides', '{"notes":"Medicare/MA"}', 30),
(gen_random_uuid(), 'Tiger', 'Tiger', '{"notes":"Medicare/MA"}', 40),
(gen_random_uuid(), 'Extremity Care', 'Extremity Care', '{"notes":"Medicare/MA"}', 50)
ON CONFLICT DO NOTHING;

-- Map insurance types to providers
-- Note: we look up provider ids by name to create mappings.
WITH provs AS (
  SELECT id, name FROM ordering_providers WHERE name IN ('Venture Medical','Ox','Tides','Tiger','Extremity Care')
)
INSERT INTO insurance_provider_mappings (insurance, provider_id, priority, metadata)
SELECT 'commercial'::insurance_type, id, 0, jsonb_build_object('reason','commercial->venture') FROM provs WHERE name = 'Venture Medical'
ON CONFLICT DO NOTHING;

WITH provs2 AS (
  SELECT id, name FROM ordering_providers WHERE name IN ('Ox','Tides','Tiger','Extremity Care')
)
INSERT INTO insurance_provider_mappings (insurance, provider_id, priority, metadata)
SELECT 'medicare'::insurance_type, id, ROW_NUMBER() OVER (ORDER BY name) - 1, jsonb_build_object('group','medicare_mappings') FROM provs2
ON CONFLICT DO NOTHING;

INSERT INTO insurance_provider_mappings (insurance, provider_id, priority, metadata)
SELECT 'medicare_advantage'::insurance_type, id, ROW_NUMBER() OVER (ORDER BY name) - 1, jsonb_build_object('group','medicare_advantage_mappings') FROM provs2
ON CONFLICT DO NOTHING;

-- Example: insert a sample product (optional, can be removed or extended by app logic)
INSERT INTO order_products (id, name, sku, manufacturer, description, wound_types, allowed_wound_sizes, insurance_coverage, ordering_providers, requires_manual_submission, benefits_verification_form_version)
VALUES (
  gen_random_uuid(),
  'Sample Product A',
  'SPA-001',
  'Sample Manufacturer',
  'Example product for BV flow',
  ARRAY['ulcer','surgical'],
  (SELECT jsonb_agg(key) FROM wound_sizes WHERE key IN ('sq_2x2','sq_3x3','disc_12mm')),
  jsonb_build_object('notes','coverage depends on plan'),
  (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM ordering_providers WHERE name IN ('Venture Medical','Ox')),
  true,
  'v1.0'
)
ON CONFLICT DO NOTHING;
