/*
========================================================
Storage Policies: bv-forms bucket

Purpose:
- Create the bucket if it doesn't already exist
- Allow admins full access (upload, view, delete)
- Allow clinic staff to view/download forms
- Allow providers to view/download forms (read-only)
- Block all anonymous access
========================================================
*/

-- Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('bv-forms', 'bv-forms', false)
on conflict (id) do nothing;

-- ── Block all anonymous access ──────────────────────────────────────────────
drop policy if exists "block anon select bv forms" on storage.objects;
create policy "block anon select bv forms"
on storage.objects
for select
to anon
using (bucket_id != 'bv-forms');

drop policy if exists "block anon insert bv forms" on storage.objects;
create policy "block anon insert bv forms"
on storage.objects
for insert
to anon
with check (bucket_id != 'bv-forms');

drop policy if exists "block anon delete bv forms" on storage.objects;
create policy "block anon delete bv forms"
on storage.objects
for delete
to anon
using (bucket_id != 'bv-forms');

-- ── Allow admins full access ────────────────────────────────────────────────
drop policy if exists "admins full access bv forms" on storage.objects;
create policy "admins full access bv forms"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'bv-forms'
  and exists (
    select 1 from public.admin_acct
    where admin_acct.user_id = auth.uid()
      and admin_acct.role = 'admin'
  )
)
with check (
  bucket_id = 'bv-forms'
  and exists (
    select 1 from public.admin_acct
    where admin_acct.user_id = auth.uid()
      and admin_acct.role = 'admin'
  )
);

-- ── Allow clinic staff to view/download bv forms ────────────────────────────
drop policy if exists "clinic staff can view bv forms" on storage.objects;
create policy "clinic staff can view bv forms"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bv-forms'
  and exists (
    select 1 from public.clinic_staff_acct
    where clinic_staff_acct.user_id = auth.uid()
      and clinic_staff_acct.role = 'clinic_staff'
  )
);

-- ── Allow providers to view/download bv forms (read-only) ───────────────────
drop policy if exists "providers can view bv forms" on storage.objects;
create policy "providers can view bv forms"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bv-forms'
  and exists (
    select 1 from public.provider_acct
    where provider_acct.user_id = auth.uid()
  )
);
