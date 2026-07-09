/*
========================================================
Ocular Products RLS Policies
Table: public.ocular_products

Purpose:
- Read-only reference catalog for all authenticated users
- Admins can manage (insert/update/delete)
- Block anonymous access to modifications

Finding #12 (security review): table previously had no RLS enabled.
========================================================
*/

alter table public.ocular_products enable row level security;

drop policy if exists "authenticated can view ocular products" on public.ocular_products;
create policy "authenticated can view ocular products"
on public.ocular_products
for select
to authenticated
using (true);

drop policy if exists "block anon modify ocular products" on public.ocular_products;
create policy "block anon modify ocular products"
on public.ocular_products
for all
to anon
using (false);

drop policy if exists "admins can manage ocular products" on public.ocular_products;
create policy "admins can manage ocular products"
on public.ocular_products
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
