-- Add commercial boolean to products table
-- true = commercial insurance product, false = non-commercial (Medicare/Medicaid)
ALTER TABLE "products" ADD COLUMN "commercial" boolean NOT NULL DEFAULT false;
