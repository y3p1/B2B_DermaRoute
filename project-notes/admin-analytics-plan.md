# Admin Analytics — Phased Implementation Plan

Roadmap item #10. Based on PRD §5.6 and a full schema audit of the current codebase.

---

## What we already have (reuse)

| Piece | Source |
|---|---|
| Wound healing % + benchmarks | `backend/services/healingTracker.service.ts` — on_track/below_target/pending |
| Order ↔ BV ↔ wound link | `order_products.bvRequestId` → `bv_requests.id` ← `wound_measurements.bvRequestId` |
| Admin-configurable thresholds | `admin_settings` key/value pattern (proven with `reorder_days_threshold`) |
| Email dispatch | `sendgrid.service.ts` has `sendBatchEmail` ready to go |
| Tab insertion | `ClinicStaffDashboardClient.tsx` navItems array + TabKey union |

## What's missing

1. **A1C** — doesn't exist anywhere. Only a `diabetic` bool on `bv_requests`.
2. **Outcomes table** — no "healed Y/N, weeks to heal" summary. Everything is computed on the fly from `wound_measurements`.
3. **Cron infrastructure** — zero. No Vercel cron, no Supabase scheduled functions. Daily digest needs one built.
4. **Analytics tab** — doesn't exist.

---

## Phased plan

### Phase 10a — Foundation (schema + config)

Goal: make the rest possible. No user-facing dashboard yet.

1. **Migration: add A1C to `bv_requests`** — `a1c_percent numeric(4,2) null`, `a1c_measured_at date null`. Nullable so existing rows don't break. Add to the BV intake form (step with diabetic checkbox).
2. **Migration: new `order_outcomes` table** — `id`, `orderProductId` FK, `bvRequestId` FK, `healed boolean`, `weeksToHeal int`, `complications text`, `applicationCount int`, `recordedBy`, `recordedByType`, `recordedAt`. This is what the analytics loop feeds on.
3. **Seed `admin_settings` keys** for risk config:
   - `risk_a1c_block_threshold` = 12.0
   - `risk_a1c_warn_threshold` = 9.0
   - `risk_digest_hour_utc` = 13 (8am ET)
   - `risk_critical_sms_enabled` = true

**Deliverable:** schema + config stored, BV form captures A1C, no UI for analytics yet.

---

### Phase 10b — Risk scoring engine (pure logic, no UI)

Goal: a testable service that takes a BV + order and returns a score.

4. **`backend/services/riskScoring.service.ts`** — rule-based. Inputs: `bv_request`, patient flags, wound size, historical outcomes for similar cases. Outputs: `{ score: 0–100, tier: 'critical'|'high'|'standard'|'low', blockers: [], reasons: [] }`.
   - A1C > block threshold → hard blocker
   - Diabetic + large wound + infected → critical
   - Infected or tunneling → bump tier
   - Rules read thresholds from `admin_settings` — zero hardcoding.
5. **Wire risk check into order submission** — in the enhanced order API route, call the scoring service. If `blockers` non-empty, return 422 with reasons. Store resulting score + tier on `order_products` (new columns: `risk_score int`, `risk_tier varchar`).

**Deliverable:** orders get scored + blocked server-side. Admin can't see it yet, but data accrues.

---

### Phase 10c — Product size optimizer (pure function)

6. **`backend/services/sizeOptimizer.service.ts`** — given wound dimensions + allowed sizes from `products.allowedWoundSizes`, return the lowest-waste option. Pure math, no ML. Expose via API and use it in the enhanced order flow as a "recommended size" hint under the product picker.

**Deliverable:** providers see a recommendation when selecting a product.

---

### Phase 10d — Admin analytics dashboard tab

Now the visible surface.

7. **New tab** — add `"analytics"` to `TabKey` in `ClinicStaffDashboardClient.tsx`, new `components/clinic-staff/AnalyticsTab.tsx`. Admin-only.
8. **Four panels**, each a card:
   - **Active risk queue** — orders sorted by tier (critical first), with blockers + reasons visible. Click → order detail with override button.
   - **Success rate lookup** — "patients like this heal X% with Kerecis." Query: `order_outcomes` joined on similar wound type + size bucket + manufacturer. If sample size < 10, show "insufficient data" honestly rather than a fake number.
   - **Outcome logger** — table of recent orders missing outcomes, with a "Log outcome" modal (healed/weeks/complications). Feeds `order_outcomes`.
   - **Threshold settings** — reuses the ReorderTrackingTab pattern for editing the `risk_*` admin_settings.

**Deliverable:** admins can see risk, log outcomes, tune thresholds. Analytics loop is now closed.

---

### Phase 10e — Alerts + daily digest

9. **Critical risk SMS** — on order submission, if `tier === 'critical'`, fire immediate Twilio SMS to admin numbers (already wired for OTP, extend `twilio.service.ts` with a general `sendAdminAlert`).
10. **Vercel cron for daily digest** — `app/api/cron/admin-daily-digest/route.ts` guarded by `CRON_SECRET`. Aggregates last 24h orders + risk summary + healing alerts, calls `sendBatchEmail` to admins. `vercel.json` entry at `0 13 * * *` (8am ET).

**Deliverable:** critical orders page immediately, standard orders bundle into daily email.

---

## What we're cutting from v1

- **"Predicted success rate" as a learned model** — do it as a simple groupby with a minimum sample size. With <50 outcomes logged it's noise anyway. The `order_outcomes` table we're adding in 10a is the unlock; real prediction can come later once data accrues. PRD language ("patients like this heal 60%") is fine to show literally from historical averages.
- **Analytics feedback loop auto-tuning model weights** — manual threshold tuning via `admin_settings` is enough for v1 and matches how `reorder_days_threshold` already works.

---

## Rough effort

| Phase | Scope | Estimate |
|---|---|---|
| 10a | Migrations + A1C field on BV form | 0.5 day |
| 10b | Scoring engine + order wiring + tests | 1 day |
| 10c | Size optimizer | 0.5 day |
| 10d | Analytics tab UI (4 panels) | 2 days |
| 10e | SMS alerts + daily digest cron | 0.5 day |
| **Total** | | **~4.5 days** |

Phased so each step ships independently and work can pause after 10b/10c if priorities shift.
