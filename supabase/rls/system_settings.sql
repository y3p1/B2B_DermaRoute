/*
========================================================
System Settings RLS Policies
Table: public.system_settings

Purpose:
- Admin-only table for global configuration values
- Allow server-side operations via service_role key (bypasses RLS)
- Block anonymous and non-admin authenticated access entirely

Finding #12 (security review): table previously had no RLS enabled.
========================================================
*/

alter table public.system_settings enable row level security;

drop policy if exists "block anon system settings" on public.system_settings;
create policy "block anon system settings"
on public.system_settings
for all
to anon
using (false);

drop policy if exists "admins can manage system settings" on public.system_settings;
create policy "admins can manage system settings"
on public.system_settings
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
