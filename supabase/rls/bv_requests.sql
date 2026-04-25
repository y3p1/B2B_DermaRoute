/*
========================================================
BV Requests RLS Policies
Table: public.bv_requests

Purpose:
- Allow server-side operations via service_role key (bypasses RLS)
- Allow providers to view/create/update their own BV requests
- Allow admins and clinic staff to view/update all BV requests
- Block anonymous access
========================================================
*/

-- Enable RLS
alter table public.bv_requests enable row level security;

-- Block all operations for anonymous users
drop policy if exists "block anon bv requests" on public.bv_requests;
create policy "block anon bv requests"
on public.bv_requests
for all
to anon
using (false);

-- Allow providers to view their own BV requests
drop policy if exists "providers can view own bv requests" on public.bv_requests;
create policy "providers can view own bv requests"
on public.bv_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.provider_acct
    where provider_acct.id = bv_requests.provider_id
      and provider_acct.user_id = auth.uid()
  )
);

-- Allow providers to create BV requests
drop policy if exists "providers can insert bv requests" on public.bv_requests;
create policy "providers can insert bv requests"
on public.bv_requests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.provider_acct
    where provider_acct.id = bv_requests.provider_id
      and provider_acct.user_id = auth.uid()
  )
);

-- Allow providers to update their own BV requests
drop policy if exists "providers can update own bv requests" on public.bv_requests;
create policy "providers can update own bv requests"
on public.bv_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.provider_acct
    where provider_acct.id = bv_requests.provider_id
      and provider_acct.user_id = auth.uid()
  )
);

-- Allow admins full access to all BV requests
drop policy if exists "admins full access bv requests" on public.bv_requests;
create policy "admins full access bv requests"
on public.bv_requests
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

-- Allow clinic staff to view and update BV requests
drop policy if exists "clinic staff can manage bv requests" on public.bv_requests;
create policy "clinic staff can manage bv requests"
on public.bv_requests
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

-- Allow admins to delete BV requests
drop policy if exists "admins can delete bv requests" on public.bv_requests;
create policy "admins can delete bv requests"
on public.bv_requests
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
