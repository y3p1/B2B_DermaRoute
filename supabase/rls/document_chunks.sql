/*
========================================================
Document Chunks RLS Policies
Table: public.document_chunks

Purpose:
- Internal RAG vector-store table, never queried from the client
- Allow server-side operations via service_role key (bypasses RLS)
- Admins can read for debugging; block everyone else

Finding #12 (security review): table previously had no RLS enabled.
========================================================
*/

alter table public.document_chunks enable row level security;

drop policy if exists "block anon document chunks" on public.document_chunks;
create policy "block anon document chunks"
on public.document_chunks
for all
to anon
using (false);

drop policy if exists "admins can manage document chunks" on public.document_chunks;
create policy "admins can manage document chunks"
on public.document_chunks
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
