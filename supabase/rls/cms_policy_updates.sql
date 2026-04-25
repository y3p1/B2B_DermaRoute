/*
========================================================
CMS Feed Sources & CMS Policy Updates RLS Policies
Tables: public.cms_feed_sources, public.cms_policy_updates

Purpose:
- Read for admins and clinic staff
- Admins can manage
- Service role full access (for cron RSS sync)
- Block anonymous access
========================================================
*/

-- ==================== cms_feed_sources ====================

ALTER TABLE public.cms_feed_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff can view feed sources" ON public.cms_feed_sources;
CREATE POLICY "staff can view feed sources"
ON public.cms_feed_sources
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_acct
    WHERE admin_acct.user_id = auth.uid()
      AND admin_acct.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.clinic_staff_acct
    WHERE clinic_staff_acct.user_id = auth.uid()
      AND clinic_staff_acct.active = true
  )
);

DROP POLICY IF EXISTS "admins can manage feed sources" ON public.cms_feed_sources;
CREATE POLICY "admins can manage feed sources"
ON public.cms_feed_sources
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_acct
    WHERE admin_acct.user_id = auth.uid()
      AND admin_acct.role = 'admin'
  )
);

DROP POLICY IF EXISTS "block anon feed sources" ON public.cms_feed_sources;
CREATE POLICY "block anon feed sources"
ON public.cms_feed_sources
FOR ALL
TO anon
USING (false);

DROP POLICY IF EXISTS "service role feed sources" ON public.cms_feed_sources;
CREATE POLICY "service role feed sources"
ON public.cms_feed_sources
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ==================== cms_policy_updates ====================

ALTER TABLE public.cms_policy_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff can view cms updates" ON public.cms_policy_updates;
CREATE POLICY "staff can view cms updates"
ON public.cms_policy_updates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_acct
    WHERE admin_acct.user_id = auth.uid()
      AND admin_acct.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.clinic_staff_acct
    WHERE clinic_staff_acct.user_id = auth.uid()
      AND clinic_staff_acct.active = true
  )
);

DROP POLICY IF EXISTS "admins can manage cms updates" ON public.cms_policy_updates;
CREATE POLICY "admins can manage cms updates"
ON public.cms_policy_updates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_acct
    WHERE admin_acct.user_id = auth.uid()
      AND admin_acct.role = 'admin'
  )
);

DROP POLICY IF EXISTS "block anon cms updates" ON public.cms_policy_updates;
CREATE POLICY "block anon cms updates"
ON public.cms_policy_updates
FOR ALL
TO anon
USING (false);

DROP POLICY IF EXISTS "service role cms updates" ON public.cms_policy_updates;
CREATE POLICY "service role cms updates"
ON public.cms_policy_updates
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
