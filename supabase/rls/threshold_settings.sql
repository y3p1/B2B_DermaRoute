/*
========================================================
Threshold Settings RLS Policies
Table: public.threshold_settings
========================================================
*/

-- Enable RLS
alter table public.threshold_settings enable row level security;

-- Block anon
drop policy if exists "block anon threshold settings" on public.threshold_settings;
create policy "block anon threshold settings" on public.threshold_settings for all to anon using (false);

-- Admins full access
drop policy if exists "admins full access threshold settings" on public.threshold_settings;
create policy "admins full access threshold settings" on public.threshold_settings for all to authenticated
using (exists (select 1 from public.admin_acct where admin_acct.user_id = auth.uid() and admin_acct.role = 'admin'));

-- All authenticated standard users (clinic staff, providers) can view the settings for reading threshold data
drop policy if exists "authenticated can view threshold settings" on public.threshold_settings;
create policy "authenticated can view threshold settings" on public.threshold_settings for select to authenticated
using (true);
