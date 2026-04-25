-- Migration: Remove ordering_providers and insurance_provider_mappings tables
-- These tables are being removed as the ordering provider logic now fetches
-- directly from provider_acct table instead of using predefined ordering providers

-- Drop foreign key constraint from order_products first
ALTER TABLE order_products DROP COLUMN IF EXISTS ordering_providers;

-- Drop insurance_provider_mappings table (depends on ordering_providers)
DROP TABLE IF EXISTS insurance_provider_mappings;

-- Drop ordering_providers table
DROP TABLE IF EXISTS ordering_providers;

-- Drop indexes if they exist
DROP INDEX IF EXISTS idx_ordering_providers_name;
DROP INDEX IF EXISTS idx_insurance_provider_mappings_insurance_provider;
DROP INDEX IF EXISTS idx_insurance_provider_mappings_insurance;
