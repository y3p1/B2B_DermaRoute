/*
========================================================
Admin Account RLS Policies
Table: public.admin_acct

Purpose:
- INSERT: Allowed for anonymous users (registration/signup flow)
- SELECT: Requires authentication - all authenticated users can view all records
- UPDATE: Requires authentication - users can only update their own record
- DELETE: Blocked for all users (soft delete recommended)

FLOW:
1. Admin Signup (Unauthenticated):
   - Anonymous users can INSERT new admin accounts
   - SELECT is blocked until authenticated

2. Post-Authentication:
   - All authenticated users can SELECT all admin records
   - Authenticated users can UPDATE only their own record (user_id = auth.uid())
   - DELETE is blocked (use soft delete instead)
========================================================
*/

-- Enable RLS
alter table public.admin_acct enable row level security;

-- Allow INSERT for anonymous users (registration/signup)
drop policy if exists "anon can insert admin account" on public.admin_acct;
create policy "anon can insert admin account"
on public.admin_acct
for insert
to anon
with check (true);

-- Block SELECT for anonymous users
drop policy if exists "block anon select admin" on public.admin_acct;
create policy "block anon select admin"
on public.admin_acct
for select
to anon
using (false);

-- Block UPDATE for anonymous users
drop policy if exists "block anon update admin" on public.admin_acct;
create policy "block anon update admin"
on public.admin_acct
for update
to anon
using (false);

-- Block DELETE for anonymous users
drop policy if exists "block anon delete admin" on public.admin_acct;
create policy "block anon delete admin"
on public.admin_acct
for delete
to anon
using (false);

-- Allow authenticated users to SELECT all records
drop policy if exists "authenticated can view all admins" on public.admin_acct;
create policy "authenticated can view all admins"
on public.admin_acct
for select
to authenticated
using (true);

-- Allow authenticated users to UPDATE their own record
drop policy if exists "admin can update own record" on public.admin_acct;
create policy "admin can update own record"
on public.admin_acct
for update
to authenticated
using (
  auth.uid() = user_id
);

-- Block DELETE for authenticated users
drop policy if exists "block admin delete" on public.admin_acct;
create policy "block admin delete"
on public.admin_acct
for delete
to authenticated
using (false);


