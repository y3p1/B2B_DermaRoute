# Phase 10b – 10e Release Notes

Implementation notes covering the Admin Analytics Engine phases 10b through 10e.

---

## Phase 10b — Risk Scoring Engine

**Goal:** A testable service that scores each order and blocks dangerously risky submissions.

### Files Added / Modified
| File | Change |
|---|---|
| `backend/services/riskScoring.service.ts` | **NEW** — Rule-based engine; inputs: BV request flags; outputs: `{ score, tier, blockers, reasons }` |
| `backend/controllers/productOrders.controller.ts` | Wired `scoreOrder()` into order submission; returns HTTP 422 if blockers are present |
| `db/bv-products.ts` | Added `riskScore integer` and `riskTier varchar(16)` columns to `order_products` |

### Risk Tier Logic
| Condition | Effect |
|---|---|
| A1C > `risk_a1c_block_threshold` (default 12.0) | Hard block — order rejected with 422 |
| A1C > `risk_a1c_warn_threshold` (default 9.0) | Bumps tier to `high` |
| Diabetic + large wound + infected | `critical` tier |
| Infected or tunneling | Tier bumped up by one level |
| No flags | `standard` or `low` |

### Database Note
> [!IMPORTANT]
> The `risk_score` and `risk_tier` columns on `order_products` are **code-side only** via Drizzle schema. You must run the following migration manually in Supabase SQL Editor before orders will persist risk data:
> ```sql
> ALTER TABLE order_products
>   ADD COLUMN risk_score integer,
>   ADD COLUMN risk_tier varchar(16);
> ```

---

## Phase 10c — Product Size Optimizer

**Goal:** A pure backend function that recommends the least-wasteful product size for a given wound area.

### Files Added / Modified
| File | Change |
|---|---|
| `backend/services/sizeOptimizer.service.ts` | **NEW** — Pure math; given wound size, returns recommended product + waste % for all options |
| `app/api/size-optimizer/route.ts` | **NEW** — Exposes `GET /api/size-optimizer?woundSize=<cm2>` (requires Bearer token) |

### Testing the API
Since the endpoint is protected by `requireAuth`, it cannot be tested directly in a browser address bar. Use the browser DevTools Console (on a page where you are already logged in):

```javascript
const sessionData = localStorage.getItem('sb-wsyablsyczwunstmgqqg-auth-token');
const token = JSON.parse(sessionData).access_token;

fetch('/api/size-optimizer?woundSize=10.5', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log);
```

---

## Phase 10d — Admin Analytics Dashboard Tab

**Goal:** A fully visible admin-only UI surface inside the clinic staff dashboard.

### Files Added / Modified
| File | Change |
|---|---|
| `components/clinic-staff/AnalyticsTab.tsx` | **NEW** — Four-panel analytics dashboard |
| `components/clinic-staff/ClinicStaffDashboardClient.tsx` | Added `"analytics"` to `TabKey` union and `navItems` array (admin-only) |
| `app/api/analytics/outcomes/route.ts` | **NEW** — `GET` orders missing outcomes; `POST` to log an outcome |
| `app/api/analytics/success-rate/route.ts` | **NEW** — Success rate lookup by wound type + optional manufacturer |
| `backend/controllers/analytics.controller.ts` | **NEW** — Controller for both analytics routes |
| `backend/services/analytics.service.ts` | **NEW** — DB queries: `getOrdersMissingOutcomes`, `logOutcome`, `getSuccessRate` |

### Four Dashboard Panels
1. **Active Risk Queue** — Critical orders first, with blockers and reasons visible
2. **Success Rate Lookup** — Shows historical heal rate for a wound type + manufacturer. Displays "Insufficient data" if sample size < 10
3. **Outcome Logger** — Table of shipped/completed orders missing outcomes, with a "Log outcome" modal
4. **Threshold Settings** — Edit `risk_*` keys in `admin_settings` directly from the dashboard

---

## Phase 10e — Alerts + Daily Digest

**Goal:** Immediate SMS for critical orders; daily email digest bundling all admin summaries.

### Files Added / Modified
| File | Change |
|---|---|
| `backend/services/twilio.service.ts` | Added `sendAdminAlertSms(to, message)` using existing Twilio client |
| `backend/services/adminAcct.service.ts` | Added `getAllAdminPhones()` — returns phone numbers of all active admins |
| `backend/controllers/productOrders.controller.ts` | Fires `sendAdminAlertSms()` (fire-and-forget) immediately after a `critical` order is created, gated by `risk_critical_sms_enabled` admin setting |
| `app/api/cron/admin-daily-digest/route.ts` | **NEW** — Vercel cron handler; aggregates last 24h orders by risk tier, dispatches HTML email via SendGrid |
| `vercel.json` | Added `"crons"` entry — fires digest at `0 13 * * *` (8AM EST daily) |

### CRON_SECRET Setup
The cron route is secured with a secret key. You must:
1. Add `CRON_SECRET=<your-random-string>` to `.env.local` locally.
2. Add the same variable in your Vercel project → **Settings → Environment Variables**.

Vercel will pass it automatically as a Bearer token. You can also test it manually via the browser using a `?key=` query param:
```
http://localhost:3000/api/cron/admin-daily-digest?key=<CRON_SECRET>
```

### Daily Digest Email Content
```
Subject: Daily Digest - N Orders Processed
Body:
  - Total Orders
  - Critical Risk Orders
  - High Risk Orders
  - Standard/Low Risk Orders
```

---

## ⚠️ Known Issues & Important Notes

### SendGrid — Maximum Credits Exceeded
> [!WARNING]
> The SendGrid API key in use is on a **free-tier plan with a monthly send limit**. When the limit is exceeded, the API returns `401 Unauthorized` with `{ message: 'Maximum credits exceeded' }`.
>
> **Impact:** All email notifications (BV request notifications, order submission emails, daily digest) will fail silently with a 500 error on the cron route until credits are replenished or the plan is upgraded.
>
> **Resolution:** Ask the client to log in to **sendgrid.com → Settings → API Keys** and either:
> - Upgrade the SendGrid plan to a paid tier, or
> - Generate a new API key and update `SENDGRID_API_KEY` in both `.env.local` and Vercel Environment Variables.

### CRON_SECRET vs. Vercel's Built-in Cron Auth
When Vercel fires the cron endpoint automatically at 8AM, it passes the `CRON_SECRET` automatically as a Bearer token header. No manual action is needed in production. The `?key=` parameter was added only as a developer convenience for local browser testing.

### Phase 10e Not Yet in Vercel Staging
> [!NOTE]
> ~~As of the last push, the remote `staging` branch on Vercel contains Phase 10a–10d only. Phase 10e changes are local and must be pushed before the cron job will be active on Vercel.~~
> Phase 10e was pushed to `staging` in commit `7060f13`.

---

## Post-Phase Fix: Wound Type Standardization

### Problem
The BV Request form (`Step1ClinicalInfo.tsx`) had generic wound types (`"ulcer"`, `"burn"`) while the Analytics Success Rate panel used different shorthand codes (`"DFU"`, `"VLU"`, `"pressure"`, `"mohs"`). This mismatch meant the Analytics module could never match wound types from actual BV data.

### Fix
Unified both dropdowns to use the **same 4 canonical wound types**:

| Value (stored in DB) | Display Label |
|---|---|
| `Diabetic foot ulcer` | Diabetic foot ulcer |
| `Venous leg ulcer` | Venous leg ulcer |
| `Pressure ulcer` | Pressure ulcer |
| `MOHS (acute)` | MOHS (acute) |

### Files Modified
| File | Change |
|---|---|
| `components/dashboard/BVSteps/Step1ClinicalInfo.tsx` | Replaced `ulcer`/`burn` dropdown with the 4 canonical wound types |
| `components/clinic-staff/AnalyticsTab.tsx` | Replaced `DFU`/`VLU`/`pressure`/`mohs`/`ulcer` with matching canonical values |

> [!WARNING]
> **Existing BV records** in the database still have the old values (`"ulcer"`, `"burn"`). These won't match the new analytics lookup values. If historical accuracy matters, a one-time SQL update to migrate old wound types is recommended:
> ```sql
> UPDATE bv_requests SET wound_type = 'Diabetic foot ulcer' WHERE wound_type = 'ulcer';
> ```
