/*
========================================================
Coverage Plans & Policy Monitors RLS Policies
Tables: public.coverage_plans, public.policy_monitors

Purpose:
- Read-only for admins and clinic staff
- Admins can manage (insert/update/delete)
- Block anonymous access
========================================================
*/

-- ==================== coverage_plans ====================

ALTER TABLE public.coverage_plans ENABLE ROW LEVEL SECURITY;

-- Admins and clinic staff can read
DROP POLICY IF EXISTS "staff can view coverage plans" ON public.coverage_plans;
CREATE POLICY "staff can view coverage plans"
ON public.coverage_plans
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

-- Admins can manage
DROP POLICY IF EXISTS "admins can manage coverage plans" ON public.coverage_plans;
CREATE POLICY "admins can manage coverage plans"
ON public.coverage_plans
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_acct
    WHERE admin_acct.user_id = auth.uid()
      AND admin_acct.role = 'admin'
  )
);

-- Block anonymous
DROP POLICY IF EXISTS "block anon coverage plans" ON public.coverage_plans;
CREATE POLICY "block anon coverage plans"
ON public.coverage_plans
FOR ALL
TO anon
USING (false);

-- ==================== policy_monitors ====================

ALTER TABLE public.policy_monitors ENABLE ROW LEVEL SECURITY;

-- Admins and clinic staff can read
DROP POLICY IF EXISTS "staff can view policy monitors" ON public.policy_monitors;
CREATE POLICY "staff can view policy monitors"
ON public.policy_monitors
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

-- Admins can manage
DROP POLICY IF EXISTS "admins can manage policy monitors" ON public.policy_monitors;
CREATE POLICY "admins can manage policy monitors"
ON public.policy_monitors
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_acct
    WHERE admin_acct.user_id = auth.uid()
      AND admin_acct.role = 'admin'
  )
);

-- Block anonymous
DROP POLICY IF EXISTS "block anon policy monitors" ON public.policy_monitors;
CREATE POLICY "block anon policy monitors"
ON public.policy_monitors
FOR ALL
TO anon
USING (false);

-- Service role full access (for cron jobs)
DROP POLICY IF EXISTS "service role coverage plans" ON public.coverage_plans;
CREATE POLICY "service role coverage plans"
ON public.coverage_plans
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "service role policy monitors" ON public.policy_monitors;
CREATE POLICY "service role policy monitors"
ON public.policy_monitors
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
