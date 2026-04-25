# Fix for "new row violates row level security policy" Error

## Root Cause

When you run `drizzle-kit push`, it removes RLS policies from tables because Drizzle ORM doesn't track RLS policies in the schema definitions.

## Immediate Fix

Run this command to re-apply RLS policies:

```bash
./scripts/apply-rls-policies.sh
```

Or use the npm script:

```bash
npm run db:rls
```

## Future Prevention

### Option 1: Use the Updated db:push Script (RECOMMENDED)

Now when you run:

```bash
npm run db:push
```

It will **automatically re-apply RLS policies** after pushing schema changes.

### Option 2: Manual Workflow

If you need to push without RLS:

```bash
npm run db:push-only  # Push schema only
npm run db:rls        # Apply RLS separately
```

## What Changed

### 1. Created Individual RLS Policy Files

Each table now has its own RLS policy file in `supabase/rls/`:

- **[provider_acct.sql](supabase/rls/provider_acct.sql)** - Provider account policies
- **[admin_acct.sql](supabase/rls/admin_acct.sql)** - Admin account policies
- **[clinic_staff_acct.sql](supabase/rls/clinic_staff_acct.sql)** - Clinic staff policies
- **[baa_provider.sql](supabase/rls/baa_provider.sql)** - BAA provider policies
- **[bv_requests.sql](supabase/rls/bv_requests.sql)** - BV requests policies
- **[bv_products.sql](supabase/rls/bv_products.sql)** - BV product tables policies
- **[manufacturers.sql](supabase/rls/manufacturers.sql)** - Manufacturers policies
- **[products.sql](supabase/rls/products.sql)** - Products policies

This makes it easier to manage and update policies for each table independently.

### 2. Created Auto-Apply Script

- **[scripts/apply-rls-policies.sh](scripts/apply-rls-policies.sh)** - Automatically applies all RLS policies

### 3. Updated Package Scripts

- `db:push` now applies RLS automatically
- `db:rls` to manually apply RLS
- `db:push-only` to push without RLS

### 4. Documentation

- **[docs/RLS_AND_DRIZZLE.md](docs/RLS_AND_DRIZZLE.md)** - Complete guide on RLS and Drizzle workflow

## Testing the Fix

After applying RLS policies, test provider signup:

1. Go to provider signup page
2. Fill in the form
3. Submit

You should no longer see the "new row violates row level security policy" error.

## Why This Works

The new RLS policies:

- ✅ **Block anonymous users** from direct database access
- ✅ **Allow service role** (used by backend) to bypass RLS and insert records
- ✅ **Allow authenticated users** to view/update their own records
- ✅ **Persist after** `drizzle-kit push` when re-applied with the script

## Quick Reference

| Command                           | Description                                   |
| --------------------------------- | --------------------------------------------- |
| `npm run db:push`                 | Push schema changes + apply RLS (recommended) |
| `npm run db:rls`                  | Re-apply RLS policies only                    |
| `npm run db:push-only`            | Push schema without RLS (use with caution)    |
| `./scripts/apply-rls-policies.sh` | Manual RLS application                        |
