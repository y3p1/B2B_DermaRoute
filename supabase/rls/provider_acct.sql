/*
========================================================
Provider Account RLS Policies
Table: public.provider_acct

Purpose:
- INSERT: Allowed for anonymous users (registration/signup flow)
- SELECT: Requires authentication - all authenticated users can view all records
- UPDATE: Requires authentication - users can only update their own record
- DELETE: Blocked for all users (soft delete recommended)

FLOW:
1. Signup (Unauthenticated):
   - Anonymous users can INSERT new provider accounts
   - SELECT is blocked until authenticated

2. Post-Authentication:
   - All authenticated users can SELECT all provider records
   - Authenticated users can UPDATE only their own record (user_id = auth.uid())
   - Admins have full access to all provider accounts
   - DELETE is blocked (use soft delete instead)
========================================================
*/

--------------------------------------------------------
-- 1) Enable Row Level Security
--------------------------------------------------------
alter table public.provider_acct enable row level security;

-- (Optional but recommended) Force RLS even for table owners.
-- NOTE: superusers can still bypass RLS.
-- alter table public.provider_acct force row level security;

--------------------------------------------------------
-- 2) Allow INSERT for anonymous users (registration/signup)
--------------------------------------------------------
drop policy if exists "anon can insert provider account" on public.provider_acct;
create policy "anon can insert provider account"
on public.provider_acct
for insert
to anon
with check (true);

--------------------------------------------------------
-- 3) Block SELECT for anonymous users
--------------------------------------------------------
drop policy if exists "block anon select provider account" on public.provider_acct;
create policy "block anon select provider account"
on public.provider_acct
for select
to anon
using (false);

--------------------------------------------------------
-- 4) Block UPDATE for anonymous users
--------------------------------------------------------
drop policy if exists "block anon update provider account" on public.provider_acct;
create policy "block anon update provider account"
on public.provider_acct
for update
to anon
using (false);

--------------------------------------------------------
-- 5) Block DELETE for anonymous users
--------------------------------------------------------
drop policy if exists "block anon delete provider account" on public.provider_acct;
create policy "block anon delete provider account"
on public.provider_acct
for delete
to anon
using (false);

--------------------------------------------------------
-- 6) Allow authenticated users to SELECT all records
--------------------------------------------------------
drop policy if exists "authenticated can view all providers" on public.provider_acct;
create policy "authenticated can view all providers"
on public.provider_acct
for select
to authenticated
using (true);

--------------------------------------------------------
-- 7) Allow authenticated users to UPDATE their own record
--------------------------------------------------------
drop policy if exists "provider can update own record" on public.provider_acct;
create policy "provider can update own record"
on public.provider_acct
for update
to authenticated
using (
  auth.uid() = user_id
);

--------------------------------------------------------
-- 8) (Optional but recommended) Block DELETE for authenticated users
--    If you want to allow soft deletes or admin-only deletes, keep this.
--------------------------------------------------------
drop policy if exists "block provider delete" on public.provider_acct;
create policy "block provider delete"
on public.provider_acct
for delete
to authenticated
using (false);

--------------------------------------------------------
-- 9) Allow admin users full access
--    Admins (identified by role in admin_acct table) can do anything
--------------------------------------------------------
drop policy if exists "admin full access to provider accounts" on public.provider_acct;
create policy "admin full access to provider accounts"
on public.provider_acct
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_acct
    where admin_acct.user_id = auth.uid()
      and admin_acct.role = 'admin'
  )
);

/*
========================================================
SUMMARY:
- Anonymous (anon) users: Can INSERT (registration), BLOCKED from SELECT/UPDATE/DELETE
- Authenticated users: Can SELECT all records, UPDATE only their own record (user_id = auth.uid())
- Authenticated admins: Full access to all provider_acct records
- All users: BLOCKED from DELETE (soft delete recommended instead)
========================================================
*/
