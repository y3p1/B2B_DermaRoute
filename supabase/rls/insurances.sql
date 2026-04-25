/*
========================================================
Insurances RLS Policies
Table: public.insurances

Purpose:
- Read-only for all authenticated users
- Admins can manage (insert/update/delete)
- Block anonymous access to modifications
========================================================
*/

-- Enable RLS
alter table public.insurances enable row level security;

-- Allow anyone (even anon) to read insurances
drop policy if exists "anyone can view insurances" on public.insurances;
create policy "anyone can view insurances"
on public.insurances
for select
to public
using (true);

-- Block anonymous insert
drop policy if exists "block anon insert insurances" on public.insurances;
create policy "block anon insert insurances"
on public.insurances
for insert
to anon
with check (false);

-- Block anonymous update
drop policy if exists "block anon update insurances" on public.insurances;
create policy "block anon update insurances"
on public.insurances
for update
to anon
using (false);

-- Block anonymous delete
drop policy if exists "block anon delete insurances" on public.insurances;
create policy "block anon delete insurances"
on public.insurances
for delete
to anon
using (false);

-- Allow admins to manage insurances
drop policy if exists "admins can manage insurances" on public.insurances;
create policy "admins can manage insurances"
on public.insurances
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
