/*
========================================================
BV Products RLS Policies
Tables: 
- public.wound_sizes
- public.order_products

Purpose:
- Read-only for all authenticated users
- Admins can manage (insert/update/delete)
- Block anonymous access to modifications
========================================================
*/

-- ============================================================
-- wound_sizes table
-- ============================================================
alter table public.wound_sizes enable row level security;

-- Allow anyone (even anon) to read wound sizes
drop policy if exists "anyone can view wound sizes" on public.wound_sizes;
create policy "anyone can view wound sizes"
on public.wound_sizes
for select
to public
using (true);

-- Block anonymous insert/update/delete
drop policy if exists "block anon modify wound sizes" on public.wound_sizes;
create policy "block anon modify wound sizes"
on public.wound_sizes
for all
to anon
using (false);

-- Allow admins to manage wound sizes
drop policy if exists "admins can manage wound sizes" on public.wound_sizes;
create policy "admins can manage wound sizes"
on public.wound_sizes
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

-- ============================================================
-- order_products table
-- ============================================================
alter table public.order_products enable row level security;

-- Allow anyone (even anon) to read order products
drop policy if exists "anyone can view order products" on public.order_products;
create policy "anyone can view order products"
on public.order_products
for select
to public
using (true);

-- Block anonymous insert/update/delete
drop policy if exists "block anon modify order products" on public.order_products;
create policy "block anon modify order products"
on public.order_products
for all
to anon
using (false);

-- Allow admins to manage order products
drop policy if exists "admins can manage order products" on public.order_products;
create policy "admins can manage order products"
on public.order_products
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
