/*
========================================================
BAA Provider RLS Policies
Table: public.baa_provider

Purpose:
- Allow server-side operations via service_role key (bypasses RLS)
- Allow providers to view/update their own BAA records
- Allow admins and clinic staff to view/update all BAA records
- Block anonymous access
========================================================
*/

-- Enable RLS
alter table public.baa_provider enable row level security;

-- Block all operations for anonymous users
drop policy if exists "block anon baa provider" on public.baa_provider;
create policy "block anon baa provider"
on public.baa_provider
for all
to anon
using (false);

-- Allow providers to view their own BAA records
drop policy if exists "providers can view own baa" on public.baa_provider;
create policy "providers can view own baa"
on public.baa_provider
for select
to authenticated
using (
  exists (
    select 1
    from public.provider_acct
    where provider_acct.id = baa_provider.provider_acct_id
      and provider_acct.user_id = auth.uid()
  )
);

-- Allow providers to update their own BAA records (only certain fields)
drop policy if exists "providers can update own baa" on public.baa_provider;
create policy "providers can update own baa"
on public.baa_provider
for update
to authenticated
using (
  exists (
    select 1
    from public.provider_acct
    where provider_acct.id = baa_provider.provider_acct_id
      and provider_acct.user_id = auth.uid()
  )
);

-- Allow admins full access to all BAA records
drop policy if exists "admins full access baa" on public.baa_provider;
create policy "admins full access baa"
on public.baa_provider
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

-- Allow clinic staff to view and update BAA records
drop policy if exists "clinic staff can manage baa" on public.baa_provider;
create policy "clinic staff can manage baa"
on public.baa_provider
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

-- Block DELETE for all users (soft delete recommended)
drop policy if exists "block baa delete" on public.baa_provider;
create policy "block baa delete"
on public.baa_provider
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_acct
    where admin_acct.user_id = auth.uid()
      and admin_acct.role = 'admin'
  )
);
