# RLS Policies and Drizzle Workflow

## Problem: Drizzle Push Removes RLS Policies

When you run `drizzle-kit push`, it can drop and recreate tables, which **removes all RLS policies** because Drizzle doesn't track them in the schema definitions.

## Solution

### Workflow After Schema Changes

**Always follow this workflow when making database schema changes:**

```bash
# 1. Make your schema changes in db/ folder
# 2. Push schema changes to database
npx drizzle-kit push

# 3. Re-apply RLS policies (CRITICAL!)
./scripts/apply-rls-policies.sh
```

### Alternative: Use Migrations Instead of Push

For production, use migrations which are more controlled:

```bash
# 1. Generate migration from schema changes
npx drizzle-kit generate

# 2. Apply migration
npx drizzle-kit migrate

# 3. Re-apply RLS policies
./scripts/apply-rls-policies.sh
```

## RLS Policy Files

RLS policies are organized by table in separate SQL files:

**Location**: `supabase/rls/`

- **[provider_acct.sql](../supabase/rls/provider_acct.sql)** - Provider account RLS policies
- **[admin_acct.sql](../supabase/rls/admin_acct.sql)** - Admin account RLS policies
- **[clinic_staff_acct.sql](../supabase/rls/clinic_staff_acct.sql)** - Clinic staff RLS policies
- **[baa_provider.sql](../supabase/rls/baa_provider.sql)** - BAA provider RLS policies
- **[bv_requests.sql](../supabase/rls/bv_requests.sql)** - BV requests RLS policies
- **[bv_products.sql](../supabase/rls/bv_products.sql)** - BV product tables RLS policies
- **[manufacturers.sql](../supabase/rls/manufacturers.sql)** - Manufacturers RLS policies
- **[products.sql](../supabase/rls/products.sql)** - Products RLS policies

See [supabase/rls/README.md](../supabase/rls/README.md) for more details.

## How RLS Works with Service Role

### Important Notes

1. **Service Role Bypasses RLS**: When using Supabase service role key (admin client), RLS policies are bypassed
2. **Direct Postgres Connections**: The `DATABASE_URL` connects as `postgres` user, which is a superuser and bypasses RLS
3. **Drizzle ORM**: Uses direct Postgres connection, so superuser privileges bypass RLS during insert

### Why Provider Signup Works

The provider signup flow works despite RLS because:

```typescript
// backend/services/providerSignup.service.ts
const supabase = getSupabaseAdminClient(); // Uses service role key
const db = getDb(); // Uses postgres superuser via DATABASE_URL

// This bypasses RLS policies
await db.insert(providerAcct).values({
  userId: createdUserId,
  ...details,
});
```

## Current RLS Setup

### Provider Account (`provider_acct`)

**[supabase/provider_acct_rls.sql](supabase/provider_acct_rls.sql)**

- ✅ RLS enabled
- 🚫 Anonymous users: Blocked from all operations
- ✅ Service role: Bypasses all policies (used for server-side signup)
- ✅ Authenticated users: Can SELECT/UPDATE only their own record (`user_id = auth.uid()`)
- ✅ Admins: Full access to all records
- 🚫 DELETE: Blocked for all users (soft delete recommended)

### Admin Account (`admin_acct`)

**[supabase/admin_and_clinic_staff_rls.sql](supabase/admin_and_clinic_staff_rls.sql)**

- ✅ RLS enabled
- 🚫 Anonymous users: Blocked from all operations
- ✅ Service role: Bypasses all policies
- ✅ Authenticated users: Can SELECT/UPDATE only their own record
- 🚫 DELETE: Blocked for all users

### Clinic Staff Account (`clinic_staff_acct`)

**[supabase/admin_and_clinic_staff_rls.sql](supabase/admin_and_clinic_staff_rls.sql)**

- ✅ RLS enabled
- 🚫 Anonymous users: Blocked from all operations
- ✅ Service role: Bypasses all policies
- ✅ Authenticated users: Can SELECT/UPDATE only their own record
- 🚫 DELETE: Blocked for all users

## Testing RLS Policies

To verify RLS is working:

```bash
# Check if RLS is enabled on a table
psql "$DATABASE_URL" -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'provider_acct';"

# List all policies on a table
psql "$DATABASE_URL" -c "\d+ provider_acct" | grep -A 10 "Policies"
```

## Common Issues

### Issue: "new row violates row level security policy"

**Cause**: Direct database operations with non-superuser role when RLS is enabled

**Solution**:

- Use service role key for server-side operations
- OR ensure the database user is a superuser (like `postgres`)
- OR modify RLS policies to allow the operation

### Issue: RLS policies disappear after `drizzle-kit push`

**Cause**: Drizzle doesn't track RLS policies in schema

**Solution**: Always run `./scripts/apply-rls-policies.sh` after Drizzle operations

## Best Practices

1. ✅ **Always re-apply RLS policies** after `drizzle-kit push` or `drizzle-kit migrate`
2. ✅ **Use service role** for server-side operations that need to bypass RLS
3. ✅ **Use migrations in production** instead of `drizzle-kit push`
4. ✅ **Test RLS policies** with different user roles after applying them
5. ✅ **Document RLS policies** in the SQL files themselves
