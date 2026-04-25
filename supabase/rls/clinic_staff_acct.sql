/*
========================================================
Clinic Staff Account RLS Policies
Table: public.clinic_staff_acct

Purpose:
- INSERT: Allowed for anonymous users (registration/signup flow)
- SELECT: Requires authentication - all authenticated users can view all records
- UPDATE: Requires authentication - staff can only update their own record
- DELETE: Blocked for all users (soft delete recommended)

FLOW:
1. Clinic Staff Signup (Unauthenticated):
   - Anonymous users can INSERT new clinic staff accounts
   - SELECT is blocked until authenticated

2. Post-Authentication:
   - All authenticated users can SELECT all clinic staff records
   - Authenticated staff can UPDATE only their own record (user_id = auth.uid())
   - DELETE is blocked (use soft delete instead)
========================================================
*/

-- Enable RLS
alter table public.clinic_staff_acct enable row level security;

-- Allow INSERT for anonymous users (registration/signup)
drop policy if exists "anon can insert clinic staff account" on public.clinic_staff_acct;
create policy "anon can insert clinic staff account"
on public.clinic_staff_acct
for insert
to anon
with check (true);

-- Block SELECT for anonymous users
drop policy if exists "block anon select clinic staff" on public.clinic_staff_acct;
create policy "block anon select clinic staff"
on public.clinic_staff_acct
for select
to anon
using (false);

-- Block UPDATE for anonymous users
drop policy if exists "block anon update clinic staff" on public.clinic_staff_acct;
create policy "block anon update clinic staff"
on public.clinic_staff_acct
for update
to anon
using (false);

-- Block DELETE for anonymous users
drop policy if exists "block anon delete clinic staff" on public.clinic_staff_acct;
create policy "block anon delete clinic staff"
on public.clinic_staff_acct
for delete
to anon
using (false);

-- Allow authenticated users to SELECT all records
drop policy if exists "authenticated can view all clinic staff" on public.clinic_staff_acct;
create policy "authenticated can view all clinic staff"
on public.clinic_staff_acct
for select
to authenticated
using (true);

-- Allow authenticated users to UPDATE their own record
drop policy if exists "clinic staff can update own record" on public.clinic_staff_acct;
create policy "clinic staff can update own record"
on public.clinic_staff_acct
for update
to authenticated
using (
  auth.uid() = user_id
);

-- Block DELETE for authenticated users
drop policy if exists "block clinic staff delete" on public.clinic_staff_acct;
create policy "block clinic staff delete"
on public.clinic_staff_acct
for delete
to authenticated
using (false);


