-- Migration: seed risk-scoring admin_settings keys (Roadmap #10a — Admin Analytics foundation)
-- These thresholds are read by the risk scoring service (Phase 10b).
-- Admins can edit values from the dashboard later (Phase 10d).

INSERT INTO "admin_settings" ("key", "value", "description") VALUES
  ('risk_a1c_block_threshold',  '12.0', 'A1C percentage above which an order is hard-blocked at submission.'),
  ('risk_a1c_warn_threshold',   '9.0',  'A1C percentage above which an order is flagged as elevated risk.'),
  ('risk_digest_hour_utc',      '13',   'UTC hour for the daily admin risk digest email (13 = 8am ET).'),
  ('risk_critical_sms_enabled', 'true', 'Whether to send immediate SMS alerts for critical-risk orders.')
ON CONFLICT ("key") DO NOTHING;
