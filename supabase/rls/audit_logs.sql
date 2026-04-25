/*
========================================================
Audit Logs — RLS Policies & PostgreSQL Trigger Functions
Table: public.audit_logs

Purpose:
- Automatically capture every INSERT, UPDATE, DELETE on
  audited tables via database-level triggers.
- Admins can read audit logs. No one modifies them via app.
- Triggers capture auth.uid() as the actor automatically.
========================================================
*/

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read audit logs
DROP POLICY IF EXISTS "admins can view audit logs" ON public.audit_logs;
CREATE POLICY "admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_acct
    WHERE admin_acct.user_id = auth.uid()
      AND admin_acct.role = 'admin'
  )
);

-- Block anonymous access entirely
DROP POLICY IF EXISTS "block anon select audit logs" ON public.audit_logs;
CREATE POLICY "block anon select audit logs"
ON public.audit_logs
FOR SELECT
TO anon
USING (false);

DROP POLICY IF EXISTS "block anon insert audit logs" ON public.audit_logs;
CREATE POLICY "block anon insert audit logs"
ON public.audit_logs
FOR INSERT
TO anon
WITH CHECK (false);

DROP POLICY IF EXISTS "block anon update audit logs" ON public.audit_logs;
CREATE POLICY "block anon update audit logs"
ON public.audit_logs
FOR UPDATE
TO anon
USING (false);

DROP POLICY IF EXISTS "block anon delete audit logs" ON public.audit_logs;
CREATE POLICY "block anon delete audit logs"
ON public.audit_logs
FOR DELETE
TO anon
USING (false);

-- Allow authenticated users to insert (triggers run as the session user)
DROP POLICY IF EXISTS "authenticated can insert audit logs" ON public.audit_logs;
CREATE POLICY "authenticated can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow service_role full access (for triggers running under service context)
DROP POLICY IF EXISTS "service role full access audit logs" ON public.audit_logs;
CREATE POLICY "service role full access audit logs"
ON public.audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Block updates and deletes from authenticated (audit logs are immutable)
DROP POLICY IF EXISTS "block authenticated update audit logs" ON public.audit_logs;
CREATE POLICY "block authenticated update audit logs"
ON public.audit_logs
FOR UPDATE
TO authenticated
USING (false);

DROP POLICY IF EXISTS "block authenticated delete audit logs" ON public.audit_logs;
CREATE POLICY "block authenticated delete audit logs"
ON public.audit_logs
FOR DELETE
TO authenticated
USING (false);

-- ============================================================
-- Trigger Function: audit_trigger_func()
-- Captures INSERT / UPDATE / DELETE and writes to audit_logs.
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_data jsonb;
  v_new_data jsonb;
  v_record_id text;
  v_actor_id uuid;
BEGIN
  -- Attempt to get the current Supabase auth user
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  IF (TG_OP = 'INSERT') THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    v_record_id := NEW.id::text;

  ELSIF (TG_OP = 'UPDATE') THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_record_id := NEW.id::text;

  ELSIF (TG_OP = 'DELETE') THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    v_record_id := OLD.id::text;
  END IF;

  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    actor_id,
    old_data,
    new_data,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    v_actor_id,
    v_old_data,
    v_new_data,
    NOW()
  );

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- Attach triggers to all audited tables
-- ============================================================

-- bv_requests
DROP TRIGGER IF EXISTS audit_bv_requests ON public.bv_requests;
CREATE TRIGGER audit_bv_requests
AFTER INSERT OR UPDATE OR DELETE ON public.bv_requests
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- order_products
DROP TRIGGER IF EXISTS audit_order_products ON public.order_products;
CREATE TRIGGER audit_order_products
AFTER INSERT OR UPDATE OR DELETE ON public.order_products
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- baa_provider
DROP TRIGGER IF EXISTS audit_baa_provider ON public.baa_provider;
CREATE TRIGGER audit_baa_provider
AFTER INSERT OR UPDATE OR DELETE ON public.baa_provider
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- provider_acct
DROP TRIGGER IF EXISTS audit_provider_acct ON public.provider_acct;
CREATE TRIGGER audit_provider_acct
AFTER INSERT OR UPDATE OR DELETE ON public.provider_acct
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- admin_acct
DROP TRIGGER IF EXISTS audit_admin_acct ON public.admin_acct;
CREATE TRIGGER audit_admin_acct
AFTER INSERT OR UPDATE OR DELETE ON public.admin_acct
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- clinic_staff_acct
DROP TRIGGER IF EXISTS audit_clinic_staff_acct ON public.clinic_staff_acct;
CREATE TRIGGER audit_clinic_staff_acct
AFTER INSERT OR UPDATE OR DELETE ON public.clinic_staff_acct
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- products
DROP TRIGGER IF EXISTS audit_products ON public.products;
CREATE TRIGGER audit_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- manufacturers
DROP TRIGGER IF EXISTS audit_manufacturers ON public.manufacturers;
CREATE TRIGGER audit_manufacturers
AFTER INSERT OR UPDATE OR DELETE ON public.manufacturers
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- insurances
DROP TRIGGER IF EXISTS audit_insurances ON public.insurances;
CREATE TRIGGER audit_insurances
AFTER INSERT OR UPDATE OR DELETE ON public.insurances
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- insurance_routing
DROP TRIGGER IF EXISTS audit_insurance_routing ON public.insurance_routing;
CREATE TRIGGER audit_insurance_routing
AFTER INSERT OR UPDATE OR DELETE ON public.insurance_routing
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- threshold_settings
DROP TRIGGER IF EXISTS audit_threshold_settings ON public.threshold_settings;
CREATE TRIGGER audit_threshold_settings
AFTER INSERT OR UPDATE OR DELETE ON public.threshold_settings
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- wound_measurements
DROP TRIGGER IF EXISTS audit_wound_measurements ON public.wound_measurements;
CREATE TRIGGER audit_wound_measurements
AFTER INSERT OR UPDATE OR DELETE ON public.wound_measurements
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- order_outcomes
DROP TRIGGER IF EXISTS audit_order_outcomes ON public.order_outcomes;
CREATE TRIGGER audit_order_outcomes
AFTER INSERT OR UPDATE OR DELETE ON public.order_outcomes
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- coverage_plans
DROP TRIGGER IF EXISTS audit_coverage_plans ON public.coverage_plans;
CREATE TRIGGER audit_coverage_plans
AFTER INSERT OR UPDATE OR DELETE ON public.coverage_plans
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- policy_monitors
DROP TRIGGER IF EXISTS audit_policy_monitors ON public.policy_monitors;
CREATE TRIGGER audit_policy_monitors
AFTER INSERT OR UPDATE OR DELETE ON public.policy_monitors
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- cms_feed_sources
DROP TRIGGER IF EXISTS audit_cms_feed_sources ON public.cms_feed_sources;
CREATE TRIGGER audit_cms_feed_sources
AFTER INSERT OR UPDATE OR DELETE ON public.cms_feed_sources
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- cms_policy_updates
DROP TRIGGER IF EXISTS audit_cms_policy_updates ON public.cms_policy_updates;
CREATE TRIGGER audit_cms_policy_updates
AFTER INSERT OR UPDATE OR DELETE ON public.cms_policy_updates
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
