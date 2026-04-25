/*
========================================================
Storage Policies: baa-signatures bucket

Purpose:
- Create the bucket if it doesn't already exist
- Allow anonymous INSERT during provider signup (unauthenticated flow)
- Allow authenticated providers to view their own signatures
- Allow admins and clinic staff to view all signatures
- Allow admins to delete signatures
- Block all other anonymous access
========================================================
*/

-- Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('baa-signatures', 'baa-signatures', false)
on conflict (id) do nothing;

-- ── Block anonymous SELECT ──────────────────────────────────────────────────
drop policy if exists "block anon select baa signatures" on storage.objects;
create policy "block anon select baa signatures"
on storage.objects
for select
to anon
using (bucket_id != 'baa-signatures');

-- ── Allow anonymous INSERT (provider signup is unauthenticated) ─────────────
drop policy if exists "anon can upload baa signatures" on storage.objects;
create policy "anon can upload baa signatures"
on storage.objects
for insert
to anon
with check (bucket_id = 'baa-signatures');

-- ── Block anonymous DELETE ──────────────────────────────────────────────────
drop policy if exists "block anon delete baa signatures" on storage.objects;
create policy "block anon delete baa signatures"
on storage.objects
for delete
to anon
using (bucket_id != 'baa-signatures');

-- ── Allow admins full access ────────────────────────────────────────────────
drop policy if exists "admins full access baa signatures" on storage.objects;
create policy "admins full access baa signatures"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'baa-signatures'
  and exists (
    select 1 from public.admin_acct
    where admin_acct.user_id = auth.uid()
      and admin_acct.role = 'admin'
  )
)
with check (
  bucket_id = 'baa-signatures'
  and exists (
    select 1 from public.admin_acct
    where admin_acct.user_id = auth.uid()
      and admin_acct.role = 'admin'
  )
);

-- ── Allow clinic staff to view baa signatures ───────────────────────────────
drop policy if exists "clinic staff can view baa signatures" on storage.objects;
create policy "clinic staff can view baa signatures"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'baa-signatures'
  and exists (
    select 1 from public.clinic_staff_acct
    where clinic_staff_acct.user_id = auth.uid()
      and clinic_staff_acct.role = 'clinic_staff'
  )
);

-- ── Allow providers to view their own signatures only ───────────────────────
-- Path format: baa/provider/{providerAcctId}/{baaId}/signatures/...
drop policy if exists "providers can view own baa signatures" on storage.objects;
create policy "providers can view own baa signatures"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'baa-signatures'
  and exists (
    select 1 from public.provider_acct
    where provider_acct.user_id = auth.uid()
      and storage.objects.name like 'baa/provider/' || provider_acct.id || '/%'
  )
);
