/*
========================================================
Manufacturers RLS Policies
Table: public.manufacturers

Purpose:
- Read-only for all authenticated users
- Admins can manage (insert/update/delete)
- Block anonymous access to modifications
========================================================
*/

-- Enable RLS
alter table public.manufacturers enable row level security;

-- Allow anyone (even anon) to read manufacturers
drop policy if exists "anyone can view manufacturers" on public.manufacturers;
create policy "anyone can view manufacturers"
on public.manufacturers
for select
to public
using (true);

-- Block anonymous insert
drop policy if exists "block anon insert manufacturers" on public.manufacturers;
create policy "block anon insert manufacturers"
on public.manufacturers
for insert
to anon
with check (false);

-- Block anonymous update
drop policy if exists "block anon update manufacturers" on public.manufacturers;
create policy "block anon update manufacturers"
on public.manufacturers
for update
to anon
using (false);

-- Block anonymous delete
drop policy if exists "block anon delete manufacturers" on public.manufacturers;
create policy "block anon delete manufacturers"
on public.manufacturers
for delete
to anon
using (false);

-- Allow admins to manage manufacturers
drop policy if exists "admins can manage manufacturers" on public.manufacturers;
create policy "admins can manage manufacturers"
on public.manufacturers
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
