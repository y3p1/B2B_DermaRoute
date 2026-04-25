-- Migration: Add insurances table and link to products

-- 1. Create insurances lookup table
CREATE TABLE IF NOT EXISTS insurances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL UNIQUE,
  commercial  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- 2. Add insurance_id FK column to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS insurance_id UUID REFERENCES insurances(id);

-- 3. Index for faster joins
CREATE INDEX IF NOT EXISTS idx_products_insurance_id ON products(insurance_id);
