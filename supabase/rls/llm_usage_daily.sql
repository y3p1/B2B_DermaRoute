/*
========================================================
LLM Usage Daily RLS Policies
Table: public.llm_usage_daily

Purpose:
- Internal cost-metering table for the policy assistant (Gemini call counter)
- Only ever read/written server-side via the service_role key (bypasses RLS)
- No client should ever touch it; block anon and authenticated outright
========================================================
*/

alter table public.llm_usage_daily enable row level security;

drop policy if exists "block anon llm usage" on public.llm_usage_daily;
create policy "block anon llm usage"
on public.llm_usage_daily
for all
to anon
using (false);

drop policy if exists "block authenticated llm usage" on public.llm_usage_daily;
create policy "block authenticated llm usage"
on public.llm_usage_daily
for all
to authenticated
using (false);
