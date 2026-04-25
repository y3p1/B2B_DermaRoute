-- Migration: add unique constraints/indexes to support idempotent upserts
-- Adds UNIQUE indexes for ordering_providers.name, order_products.sku,
-- and a composite unique index for insurance_provider_mappings(insurance, provider_id)

BEGIN;

-- ensure provider name uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_ordering_providers_name
  ON public.ordering_providers (name);

-- ensure product SKU uniqueness (nullable SKUs are allowed, index will ignore nulls by default)
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_products_sku
  ON public.order_products (sku);

-- ensure only one mapping row per (insurance, provider_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_insurance_provider_mappings_insurance_provider
  ON public.insurance_provider_mappings (insurance, provider_id);

-- index to speed lookups by insurance
CREATE INDEX IF NOT EXISTS idx_insurance_provider_mappings_insurance
  ON public.insurance_provider_mappings (insurance);

COMMIT;
