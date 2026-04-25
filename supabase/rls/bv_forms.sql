/*
========================================================
BV Forms RLS Policies
Table: public.bv_forms

Purpose:
- Any authenticated user (admin, clinic_staff, provider) can read forms.
- Only admins or clinic_staff can insert / update / delete records.
- Anonymous access is blocked for all write operations.
========================================================
*/

-- Enable RLS
alter table public.bv_forms enable row level security;

-- ── SELECT ──────────────────────────────────────────────────────────────────
-- All authenticated users can read BV forms.
drop policy if exists "authenticated users can view bv_forms" on public.bv_forms;
create policy "authenticated users can view bv_forms"
on public.bv_forms
for select
to authenticated
using (true);

-- Block anonymous select
drop policy if exists "block anon select bv_forms" on public.bv_forms;
create policy "block anon select bv_forms"
on public.bv_forms
for select
to anon
using (false);

-- ── INSERT ───────────────────────────────────────────────────────────────────
-- Only admins and clinic_staff can insert.
drop policy if exists "admins and clinic_staff can insert bv_forms" on public.bv_forms;
create policy "admins and clinic_staff can insert bv_forms"
on public.bv_forms
for insert
to authenticated
with check (
  exists (
    select 1 from public.admin_acct
    where admin_acct.user_id = auth.uid()
      and admin_acct.role in ('admin', 'clinic_staff')
  )
);

-- Block anonymous insert
drop policy if exists "block anon insert bv_forms" on public.bv_forms;
create policy "block anon insert bv_forms"
on public.bv_forms
for insert
to anon
with check (false);

-- ── UPDATE ───────────────────────────────────────────────────────────────────
-- Only admins and clinic_staff can update.
drop policy if exists "admins and clinic_staff can update bv_forms" on public.bv_forms;
create policy "admins and clinic_staff can update bv_forms"
on public.bv_forms
for update
to authenticated
using (
  exists (
    select 1 from public.admin_acct
    where admin_acct.user_id = auth.uid()
      and admin_acct.role in ('admin', 'clinic_staff')
  )
);

-- Block anonymous update
drop policy if exists "block anon update bv_forms" on public.bv_forms;
create policy "block anon update bv_forms"
on public.bv_forms
for update
to anon
using (false);

-- ── DELETE ───────────────────────────────────────────────────────────────────
-- Only admins can delete (clinic_staff cannot delete).
drop policy if exists "admins can delete bv_forms" on public.bv_forms;
create policy "admins can delete bv_forms"
on public.bv_forms
for delete
to authenticated
using (
  exists (
    select 1 from public.admin_acct
    where admin_acct.user_id = auth.uid()
      and admin_acct.role = 'admin'
  )
);

-- Block anonymous delete
drop policy if exists "block anon delete bv_forms" on public.bv_forms;
create policy "block anon delete bv_forms"
on public.bv_forms
for delete
to anon
using (false);
