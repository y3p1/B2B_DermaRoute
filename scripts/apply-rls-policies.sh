#!/bin/bash
set -e

# This script applies RLS policies after drizzle push
# Run this AFTER every `drizzle-kit push` or `drizzle-kit migrate`

echo "Applying RLS policies..."

# Load DATABASE_URL from .env.local
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | grep DATABASE_URL | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not found in .env.local"
  exit 1
fi

# Apply RLS policies for each table (one file per table)
echo "→ Applying provider_acct RLS policies..."
psql "$DATABASE_URL" -f supabase/rls/provider_acct.sql

echo "→ Applying admin_acct RLS policies..."
psql "$DATABASE_URL" -f supabase/rls/admin_acct.sql

echo "→ Applying clinic_staff_acct RLS policies..."
psql "$DATABASE_URL" -f supabase/rls/clinic_staff_acct.sql

echo "→ Applying baa_provider RLS policies..."
psql "$DATABASE_URL" -f supabase/rls/baa_provider.sql

echo "→ Applying bv_requests RLS policies..."
psql "$DATABASE_URL" -f supabase/rls/bv_requests.sql

echo "→ Applying bv_products RLS policies..."
psql "$DATABASE_URL" -f supabase/rls/bv_products.sql

echo "→ Applying manufacturers RLS policies..."
psql "$DATABASE_URL" -f supabase/rls/manufacturers.sql

echo "→ Applying products RLS policies..."
psql "$DATABASE_URL" -f supabase/rls/products.sql

echo "→ Applying insurances RLS policies..."
psql "$DATABASE_URL" -f supabase/rls/insurances.sql

echo "→ Applying bv_forms RLS policies..."
psql "$DATABASE_URL" -f supabase/rls/bv_forms.sql

echo "→ Applying storage policies for baa-signatures bucket..."
psql "$DATABASE_URL" -f supabase/rls/storage_baa_signatures.sql

echo "→ Applying storage policies for bv-forms bucket..."
psql "$DATABASE_URL" -f supabase/rls/storage_bv_forms.sql

echo "✓ All RLS policies applied successfully!"
