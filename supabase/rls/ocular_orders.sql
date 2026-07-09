/*
========================================================
Ocular Orders RLS Policies
Table: public.ocular_orders

Purpose:
- Allow server-side operations via service_role key (bypasses RLS)
- Allow providers to view/create/update their own orders
- Allow admins and clinic staff to view/update all orders
- Block anonymous access

Finding #12 (security review): table previously had no RLS enabled.
========================================================
*/

alter table public.ocular_orders enable row level security;

drop policy if exists "block anon ocular orders" on public.ocular_orders;
create policy "block anon ocular orders"
on public.ocular_orders
for all
to anon
using (false);

drop policy if exists "providers can view own ocular orders" on public.ocular_orders;
create policy "providers can view own ocular orders"
on public.ocular_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.provider_acct
    where provider_acct.id = ocular_orders.provider_id
      and provider_acct.user_id = auth.uid()
  )
);

drop policy if exists "providers can insert ocular orders" on public.ocular_orders;
create policy "providers can insert ocular orders"
on public.ocular_orders
for insert
to authenticated
with check (
  exists (
    select 1
    from public.provider_acct
    where provider_acct.id = ocular_orders.provider_id
      and provider_acct.user_id = auth.uid()
  )
);

drop policy if exists "providers can update own ocular orders" on public.ocular_orders;
create policy "providers can update own ocular orders"
on public.ocular_orders
for update
to authenticated
using (
  exists (
    select 1
    from public.provider_acct
    where provider_acct.id = ocular_orders.provider_id
      and provider_acct.user_id = auth.uid()
  )
);

drop policy if exists "admins full access ocular orders" on public.ocular_orders;
create policy "admins full access ocular orders"
on public.ocular_orders
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

drop policy if exists "clinic staff can manage ocular orders" on public.ocular_orders;
create policy "clinic staff can manage ocular orders"
on public.ocular_orders
for all
to authenticated
using (
  exists (
    select 1
    from public.clinic_staff_acct
    where clinic_staff_acct.user_id = auth.uid()
      and clinic_staff_acct.role = 'clinic_staff'
  )
);
