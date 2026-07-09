/*
========================================================
Practice Tracks RLS Policies
Table: public.practice_tracks

Purpose:
- Allow server-side operations via service_role key (bypasses RLS)
- Allow providers to view/manage their own enabled tracks
- Allow admins full access
- Block anonymous access

Finding #12 (security review): table previously had no RLS enabled.
========================================================
*/

alter table public.practice_tracks enable row level security;

drop policy if exists "block anon practice tracks" on public.practice_tracks;
create policy "block anon practice tracks"
on public.practice_tracks
for all
to anon
using (false);

drop policy if exists "providers can view own practice tracks" on public.practice_tracks;
create policy "providers can view own practice tracks"
on public.practice_tracks
for select
to authenticated
using (
  exists (
    select 1
    from public.provider_acct
    where provider_acct.id = practice_tracks.provider_id
      and provider_acct.user_id = auth.uid()
  )
);

drop policy if exists "providers can manage own practice tracks" on public.practice_tracks;
create policy "providers can manage own practice tracks"
on public.practice_tracks
for all
to authenticated
using (
  exists (
    select 1
    from public.provider_acct
    where provider_acct.id = practice_tracks.provider_id
      and provider_acct.user_id = auth.uid()
  )
);

drop policy if exists "admins full access practice tracks" on public.practice_tracks;
create policy "admins full access practice tracks"
on public.practice_tracks
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
