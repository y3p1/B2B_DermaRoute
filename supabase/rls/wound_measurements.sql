/*
========================================================
Wound Measurements RLS Policies
Table: public.wound_measurements
========================================================
*/

-- Enable RLS
alter table public.wound_measurements enable row level security;

-- Block anon
drop policy if exists "block anon wound measurements" on public.wound_measurements;
create policy "block anon wound measurements" on public.wound_measurements for all to anon using (false);

-- Admins full access
drop policy if exists "admins full access wound measurements" on public.wound_measurements;
create policy "admins full access wound measurements" on public.wound_measurements for all to authenticated
using (exists (select 1 from public.admin_acct where admin_acct.user_id = auth.uid() and admin_acct.role = 'admin'));

-- Clinic staff full access
drop policy if exists "clinic staff full access wound measurements" on public.wound_measurements;
create policy "clinic staff full access wound measurements" on public.wound_measurements for all to authenticated
using (exists (select 1 from public.clinic_staff_acct where clinic_staff_acct.user_id = auth.uid() and clinic_staff_acct.role = 'clinic_staff'));

-- Providers can view own measurements
drop policy if exists "providers can view own wound measurements" on public.wound_measurements;
create policy "providers can view own wound measurements" on public.wound_measurements for select to authenticated
using (
  exists (
    select 1 
    from public.bv_requests
    join public.provider_acct on provider_acct.id = bv_requests.provider_id
    where bv_requests.id = wound_measurements.bv_request_id
      and provider_acct.user_id = auth.uid()
  )
);

-- Providers can insert own measurements
drop policy if exists "providers can insert own wound measurements" on public.wound_measurements;
create policy "providers can insert own wound measurements" on public.wound_measurements for insert to authenticated
with check (
  exists (
    select 1 
    from public.bv_requests
    join public.provider_acct on provider_acct.id = bv_requests.provider_id
    where bv_requests.id = wound_measurements.bv_request_id
      and provider_acct.user_id = auth.uid()
  )
);

-- Providers can update own measurements
drop policy if exists "providers can update own wound measurements" on public.wound_measurements;
create policy "providers can update own wound measurements" on public.wound_measurements for update to authenticated
using (
  exists (
    select 1 
    from public.bv_requests
    join public.provider_acct on provider_acct.id = bv_requests.provider_id
    where bv_requests.id = wound_measurements.bv_request_id
      and provider_acct.user_id = auth.uid()
  )
);
