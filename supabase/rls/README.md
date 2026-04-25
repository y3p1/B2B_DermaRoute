# RLS Policy Files

This folder contains Row Level Security (RLS) policies for each database table, split into individual files for better maintainability.

## Files

Each file corresponds to one table (or a group of related tables):

| File                                           | Table(s)                        | Description                                        |
| ---------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| [provider_acct.sql](provider_acct.sql)         | `provider_acct`                 | Provider account RLS policies                      |
| [admin_acct.sql](admin_acct.sql)               | `admin_acct`                    | Admin account RLS policies                         |
| [clinic_staff_acct.sql](clinic_staff_acct.sql) | `clinic_staff_acct`             | Clinic staff account RLS policies                  |
| [baa_provider.sql](baa_provider.sql)           | `baa_provider`                  | Business Associate Agreement RLS policies          |
| [bv_requests.sql](bv_requests.sql)             | `bv_requests`                   | BV (Biological Verification) requests RLS policies |
| [bv_products.sql](bv_products.sql)             | `wound_sizes`, `order_products` | BV product-related tables RLS policies             |
| [manufacturers.sql](manufacturers.sql)         | `manufacturers`                 | Manufacturers RLS policies                         |
| [products.sql](products.sql)                   | `products`                      | Products RLS policies                              |

## Applying RLS Policies

### Automatic (Recommended)

Run the apply script after any schema changes:

```bash
npm run db:push  # Automatically applies RLS after pushing schema
```

Or apply RLS separately:

```bash
npm run db:rls
```

### Manual

Apply all RLS policies manually:

```bash
./scripts/apply-rls-policies.sh
```

Apply a specific table's RLS policies:

```bash
psql "$DATABASE_URL" -f supabase/rls/provider_acct.sql
```

## RLS Policy Patterns

### User Account Tables (provider_acct, admin_acct, clinic_staff_acct)

- ✅ **Service role bypasses** - Server-side signup works
- 🚫 **Anonymous users** - Blocked from all operations
- ✅ **Authenticated users** - Can SELECT/UPDATE their own record (`user_id = auth.uid()`)
- ✅ **Admins** - Can view all accounts
- 🚫 **DELETE** - Blocked for all users (soft delete recommended)

### Data Tables (baa_provider, bv_requests)

- 🚫 **Anonymous users** - Blocked from all operations
- ✅ **Providers** - Can view/create/update their own records
- ✅ **Admins** - Full access to all records
- ✅ **Clinic staff** - Can view/update all records
- ⚠️ **DELETE** - Admins only

### Reference Tables (manufacturers, products, bv_products)

- ✅ **Everyone** - Can SELECT (read-only)
- 🚫 **Anonymous users** - Blocked from INSERT/UPDATE/DELETE
- ✅ **Admins** - Can manage (INSERT/UPDATE/DELETE)

## Modifying RLS Policies

1. Edit the specific table's `.sql` file
2. Test the changes locally first
3. Apply the updated policies:
   ```bash
   npm run db:rls
   ```
4. Verify the policies are working as expected

## Important Notes

- **Service role bypasses RLS** - Backend operations using `getDb()` bypass RLS because they use the postgres superuser
- **Always re-apply after Drizzle push** - Drizzle doesn't track RLS policies, so they must be re-applied after schema changes
- **Test before production** - Always test RLS policy changes in a staging environment first
