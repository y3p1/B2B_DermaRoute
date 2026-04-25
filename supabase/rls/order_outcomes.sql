/*
========================================================
Order Outcomes RLS Policies
Table: public.order_outcomes
========================================================
*/

-- Enable RLS
alter table public.order_outcomes enable row level security;

-- Block anon
drop policy if exists "block anon order outcomes" on public.order_outcomes;
create policy "block anon order outcomes" on public.order_outcomes for all to anon using (false);

-- Admins full access
drop policy if exists "admins full access order outcomes" on public.order_outcomes;
create policy "admins full access order outcomes" on public.order_outcomes for all to authenticated
using (exists (select 1 from public.admin_acct where admin_acct.user_id = auth.uid() and admin_acct.role = 'admin'));

-- Clinic staff full access
drop policy if exists "clinic staff full access order outcomes" on public.order_outcomes;
create policy "clinic staff full access order outcomes" on public.order_outcomes for all to authenticated
using (exists (select 1 from public.clinic_staff_acct where clinic_staff_acct.user_id = auth.uid() and clinic_staff_acct.role = 'clinic_staff'));

-- Providers can view own outcomes
drop policy if exists "providers can view own order outcomes" on public.order_outcomes;
create policy "providers can view own order outcomes" on public.order_outcomes for select to authenticated
using (
  exists (
    select 1 
    from public.bv_requests
    join public.provider_acct on provider_acct.id = bv_requests.provider_id
    where bv_requests.id = order_outcomes.bv_request_id
      and provider_acct.user_id = auth.uid()
  )
);

-- Providers can insert own outcomes
drop policy if exists "providers can insert own order outcomes" on public.order_outcomes;
create policy "providers can insert own order outcomes" on public.order_outcomes for insert to authenticated
with check (
  exists (
    select 1 
    from public.bv_requests
    join public.provider_acct on provider_acct.id = bv_requests.provider_id
    where bv_requests.id = order_outcomes.bv_request_id
      and provider_acct.user_id = auth.uid()
  )
);

-- Providers can update own outcomes
drop policy if exists "providers can update own order outcomes" on public.order_outcomes;
create policy "providers can update own order outcomes" on public.order_outcomes for update to authenticated
using (
  exists (
    select 1 
    from public.bv_requests
    join public.provider_acct on provider_acct.id = bv_requests.provider_id
    where bv_requests.id = order_outcomes.bv_request_id
      and provider_acct.user_id = auth.uid()
  )
);
