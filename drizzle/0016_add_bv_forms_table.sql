-- Migration: add bv_forms table
-- Stores metadata for BV PDF forms; actual files live in Supabase Storage "bv-forms" bucket.

CREATE TABLE IF NOT EXISTS "bv_forms" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"         varchar(255) NOT NULL,
  "manufacturer" varchar(100) NOT NULL,
  "category"     varchar(100),
  "description"  text,
  "file_path"    varchar(1024) NOT NULL,
  "file_name"    varchar(255) NOT NULL,
  "file_size"    integer,
  "created_at"   timestamp DEFAULT now(),
  "updated_at"   timestamp DEFAULT now()
);
