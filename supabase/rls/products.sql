/*
========================================================
Products RLS Policies
Table: public.products

Purpose:
- Read-only for all authenticated users
- Admins can manage (insert/update/delete)
- Block anonymous access to modifications
========================================================
*/

-- Enable RLS
alter table public.products enable row level security;

-- Allow anyone (even anon) to read products
drop policy if exists "anyone can view products" on public.products;
create policy "anyone can view products"
on public.products
for select
to public
using (true);

-- Block anonymous insert
drop policy if exists "block anon insert products" on public.products;
create policy "block anon insert products"
on public.products
for insert
to anon
with check (false);

-- Block anonymous update
drop policy if exists "block anon update products" on public.products;
create policy "block anon update products"
on public.products
for update
to anon
using (false);

-- Block anonymous delete
drop policy if exists "block anon delete products" on public.products;
create policy "block anon delete products"
on public.products
for delete
to anon
using (false);

-- Allow admins to manage products
drop policy if exists "admins can manage products" on public.products;
create policy "admins can manage products"
on public.products
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
