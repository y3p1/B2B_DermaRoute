/*
========================================================
Insurance Routing RLS Policies
Table: public.insurance_routing

Purpose:
- Read-only for anyone (used for routing logic on UI side natively)
- Admins can manage (insert/update/delete)
- Block anonymous access to modifications
========================================================
*/

-- Enable RLS
alter table public.insurance_routing enable row level security;

-- Allow anyone to read insurance routing
drop policy if exists "anyone can view insurance routing" on public.insurance_routing;
create policy "anyone can view insurance routing"
on public.insurance_routing
for select
to public
using (true);

-- Block anonymous insert
drop policy if exists "block anon insert insurance routing" on public.insurance_routing;
create policy "block anon insert insurance routing"
on public.insurance_routing
for insert
to anon
with check (false);

-- Block anonymous update
drop policy if exists "block anon update insurance routing" on public.insurance_routing;
create policy "block anon update insurance routing"
on public.insurance_routing
for update
to anon
using (false);

-- Block anonymous delete
drop policy if exists "block anon delete insurance routing" on public.insurance_routing;
create policy "block anon delete insurance routing"
on public.insurance_routing
for delete
to anon
using (false);

-- Allow admins to manage insurance routing
drop policy if exists "admins can manage insurance routing" on public.insurance_routing;
create policy "admins can manage insurance routing"
on public.insurance_routing
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
