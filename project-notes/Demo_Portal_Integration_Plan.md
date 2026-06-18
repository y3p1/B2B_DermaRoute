# Demo Branch — Portal Expansion Integration Plan

**Branch:** `Demo`
**Source of truth for features:** `PRD_Portal_Expansion.md`, `pre-portal-expansion-changes.md`, `portal_finalization.md`
**Goal:** Port all portal expansion features from the production app into the Demo branch, adapted for demo use.

**Status legend:** ✅ Done · ⬜ Not started · 🔄 Partial

---

## Demo-Specific Constraints

These apply throughout every phase below:

| Concern | Demo Handling |
|---|---|
| Email sending | Route all submission emails to a single fixed demo address (e.g., `shawn.druzali04@gmail.com`) regardless of `system_settings` value |
| PDF generation | Port as-is; demo can download real PDFs with fake patient data |
| Supabase migrations | Run `npm run db:push` against demo Supabase project (not production) |
| RLS policies | Port identical to production — demo DB must respect same row-level security |
| Commission / AOC | Preserve existing Demo branch commits; do NOT overwrite |
| Seed data | All new tables get demo seed scripts; realistic fake patients/orders pre-populated |
| Practice setup | 3 demo practices: one `wound_care + lymphedema`, one `ocular` only, one `wound_care` only |
| `resetDemo.ts` | Must be updated to truncate + reseed all new tables |

---

## Phase 0 — Pre-Expansion Changes ⬜

These are foundational changes that must land before any new module code.

### 0.1 — Wound Size Input: Manual Only ⬜

**Files to modify:**
- `components/dashboard/BVSteps/Step1ClinicalInfo.tsx` — remove dropdown/manual toggle, `woundSizeInputMode` state, `woundSizesList` state, wound-sizes fetch; replace with single `<Input>` field + helper text
- `db/bv-requests.ts` — widen `woundSize` from `varchar(32)` to `varchar(128)`

### 0.2 — BV Delivery Address Fields ⬜

**DB:**
- `db/bv-requests.ts` — add nullable columns: `delivery_address varchar(256)`, `delivery_city varchar(128)`, `delivery_state varchar(2)`, `delivery_zip varchar(10)`
- Run `npm run db:push-only`

**Backend:**
- `backend/services/bvRequests.service.ts` — add 4 fields to `createBvRequestSchema` (optional), `createBvRequest()`, `updateBvRequest()`, and all 4 query functions' select clauses

**Frontend:**
- `components/dashboard/BVSteps/Step2PatientDelivery.tsx` — add Street Address, City, State, Zip fields (required, between dates and instructions textarea)
- `components/dashboard/BVSteps/Step3Recommendation.tsx` — include 4 delivery fields in submission payload
- `components/dashboard/EnhancedOrderModal.tsx` — add 4 fields to `BvRequest` type; `handleBvSelect` prefills from selected BV

### 0.3 — Track/Section Renaming ✅

Display labels only. DB enum keys unchanged.

| DB Key | New Display Name |
|---|---|
| `wound_care` | Tissue Products & PRP (Biologics) |
| `lymphedema` | Medical Devices / Equipment |
| `ocular` | Ocular Products *(unchanged)* |

**Files to modify:**
- `components/landing/LandingPage.tsx` — update card titles; reorder: Tissue Products, Ocular, Medical Devices; Medical Devices subtitle = "AIROS Compression Pump & Garment Ordering"
- `components/clinic-staff/PracticeTracksTab.tsx` — update `TRACK_LABELS` map + exclusivity dialog text
- `components/dashboard/ProviderDashboardClient.tsx` — rename nav tab "Lymphedema Orders" → "Medical Devices / Equipment"
- `components/clinic-staff/SystemSettingsTab.tsx` — rename "Lymphedema Order Submission Email" → "Medical Devices / Equipment Order Submission Email"
- `app/page.tsx` — update page metadata description

### 0.4 — BAA Vendor Disclaimer ⬜

**File:** `components/auth/signup/providers/agreement/AgreementPage6.tsx`
- Add `disclaimerAcknowledged` boolean state
- Add amber disclaimer box: "Important Notice Regarding Business Associate Agreements (BAA)" with two paragraphs + checkbox "I understand and wish to proceed"
- Disable "Agree and Continue" until form valid AND checkbox checked
- No backend changes

### 0.5 — Rep Territory / Account Assignment Security ⬜

**Backend — helper functions:**
- `backend/services/providerAdmin.service.ts` — add `isProviderAssignedToRep(providerId, repId)` and `getAssignedProviderIds(repId)`

**BV request endpoints:**
- `app/api/bv-requests/[id]/route.ts` — split admin/clinic-staff GET block; clinic staff must pass ownership check
- `app/api/bv-requests/[id]/verify/route.ts` — add ownership check on PATCH
- `app/api/bv-requests/[id]/proof/verify/route.ts` — add ownership check on PATCH

**Product orders controller:**
- `backend/controllers/productOrders.controller.ts` — add ownership checks to `getOrderProductController`, `updateOrderProductController`, `deleteOrderProductController`, `createOrderProductController`

**Healing tracker:**
- `backend/services/healingTracker.service.ts` — add optional `repId` param to `getWoundCases()` and `listApprovedBvOptions()`; use `innerJoin` when scoped
- `backend/controllers/healingTracker.controller.ts` — pass `actor.id` as repId for clinic_staff role

**Reorder tracking:**
- `backend/services/reorderTracking.service.ts` — add optional `repId` to `getReorderTrackingData()`; `innerJoin` when scoped
- `backend/controllers/reorderTracking.controller.ts` — read `res.locals.clinicStaffAcctId`, pass as repId

**BAA providers:**
- `backend/services/baaProviderAdmin.service.ts` — add `listBaaProvidersForRep(repId)` and `listProvidersWithoutBaaForRep(repId)`
- `backend/controllers/baaProvidersAdmin.controller.ts` — add ownership checks on list/get/sign/upload/create; route clinic_staff to rep-scoped functions

**Practice tracks controller:**
- `backend/services/tracks.service.ts` — add `getTracksForRepProviders(repId)`
- `backend/controllers/practiceTracks.controller.ts` — add ownership checks; route clinic_staff to rep-scoped function

**Bug fix (pre-existing):**
- `components/clinic-staff/ProviderAccountsTab.tsx` — fix "Unterminated regexp literal" in `{isAdmin && <td>...</td>}` → add parentheses

### 0.6 — Provider Clinic Address Fields ⬜

**DB:**
- `db/provider.ts` — add nullable columns: `clinic_city text`, `clinic_state text`, `clinic_zip text`

**Backend:**
- `backend/services/providerAcct.service.ts` — expose 3 fields in profile queries + update functions
- `backend/services/providerSignup.service.ts` — persist on signup

**Frontend:**
- `components/auth/signup/providers/SignupStep1ClinicDetails.tsx` — City, State (auto-uppercase), Zip now required fields
- `store/auth.ts` — add `clinicCity`, `clinicState`, `clinicZip` to Zustand auth store; populate from `/api/me`
- `components/dashboard/DashboardNavbar.tsx` — surface clinic address fields from auth store
- `components/dashboard/ProductOrderModal.tsx` — add delivery state; `handleBvSelect` prefills address/city/state/zip/date/contact; reset on close
- `components/dashboard/EnhancedOrderModal.tsx` — align delivery prefill with BV data

---

## Phase 1 — Track System Foundation ✅

### 1.1 — New Schema Tables ✅

All 6 tables created via direct SQL script (`scripts/apply-phase1-schema.ts`) — bypassed drizzle-kit TUI issue on Windows.

- ✅ `db/practice-tracks.ts`
- ✅ `db/system-settings.ts`
- ✅ `db/lymphedema-orders.ts`
- ✅ `db/ocular-orders.ts`
- ✅ `db/lymphedema-products.ts`
- ✅ `db/ocular-products.ts`
- ✅ `db/schema.ts` updated to re-export all 6

> ⚠️ RLS policies not yet applied (scripts/applyRls.ts not updated)

### 1.2 — Track Service + `/api/me` Extension ✅

- ✅ `backend/services/tracks.service.ts` — `getEnabledTracks`, `getTracksForAllProviders`, `updateProviderTracks`
- ✅ `app/api/me` — now returns `enabledTracks: TrackKey[]`
- ✅ `store/auth.ts` — `enabledTracks: TrackKey[]` added; populated from `/api/me`

### 1.3 — Track-Based Routing + Nav ✅

- ✅ `lib/routeGuard.ts` — rewritten with `isOpenPath`, `getAuthenticatedRedirect`
- ✅ `hooks/useRouteGuard.ts` — updated; authenticated users not bounced from `/` or `/no-tracks`
- ✅ `app/no-tracks/page.tsx` — created

### 1.4 — Landing Page ✅

- ✅ `app/page.tsx` — renders `<LandingPage />`
- ✅ `components/landing/LandingPage.tsx` — 3 service cards, locked state for disabled tracks, sign-in CTA

### 1.5 — Admin Practice Track Management ✅

- ✅ `components/clinic-staff/PracticeTracksTab.tsx` — provider table with per-track toggles + save
- ✅ `components/clinic-staff/SystemSettingsTab.tsx` — key-value settings table with inline edit
- ✅ `backend/controllers/practiceTracks.controller.ts`
- ✅ `backend/controllers/systemSettings.controller.ts`
- ✅ `app/api/practice-tracks/route.ts`
- ✅ `app/api/practice-tracks/[providerId]/route.ts`
- ✅ `app/api/system-settings/route.ts`
- ✅ Wired into `ClinicStaffDashboardClient.tsx` (admin-only tabs)

---

## Phase 2 — Medical Devices / Equipment Module 🔄

> Track key in code: `lymphedema`. Display name: "Medical Devices / Equipment" (Phase 0.3 rename not yet applied)

### 2.1 — Backend ✅

- ✅ `backend/services/lymphedema.service.ts` — `createLymphedemaOrder`, `getLymphedemaOrders`, `getLymphedemaOrder`, `updateLymphedemaOrderStatus`
- ✅ `backend/controllers/lymphedema.controller.ts` — RBAC: provider creates/views own; admin/rep views all or filtered; sends email on create (demo: fixed address)
- ✅ `app/api/lymphedema-orders/route.ts` (GET, POST)
- ✅ `app/api/lymphedema-orders/[id]/route.ts` (GET, PATCH)

> ⚠️ Routes landed at `/api/lymphedema-orders/` not `/api/lymphedema/orders/` as originally specced — consistent throughout codebase

### 2.2 — Provider UI (3-Step Modal) 🔄

- ✅ `components/dashboard/LymphedemaOrderModal.tsx` — single-file 3-step modal (Step 1: patient/insurance/eligibility gate, Step 2: device recommendation + garment, Step 3: review + submit)
- ✅ `components/dashboard/ProviderDashboardClient.tsx` — "Lymphedema Orders" tab + "New Order" button + orders table; tab gated by `enabledTracks.includes("lymphedema")`
- ⬜ `components/dashboard/LymphedemaOrderPdf.tsx` — PDF download not yet built

### 2.3 — ITS Rep / Admin UI ✅

- ✅ `components/clinic-staff/LymphedemaOrdersTab.tsx` — expandable table, inline status dropdown, per-row update via `apiPatch`
- ✅ Wired into `ClinicStaffDashboardClient.tsx` as "Lymphedema Orders" tab (visible to admin + clinic_staff)

### 2.4 — Product Catalog: Medical Devices ⬜

- ⬜ `backend/services/lymphedemaProducts.service.ts`
- ⬜ `backend/controllers/lymphedemaProducts.controller.ts`
- ⬜ `app/api/lymphedema/products/route.ts`
- ⬜ `app/api/lymphedema/products/[id]/route.ts`
- ⬜ `components/clinic-staff/LymphedemaProductsCatalogTab.tsx`

---

## Phase 3 — Ocular Module ⬜

### 3.1 — Backend ⬜

- ⬜ `backend/services/ocular.service.ts`
- ⬜ `backend/controllers/ocular.controller.ts`
- ⬜ `app/api/ocular/orders/route.ts` (GET, POST)
- ⬜ `app/api/ocular/orders/[id]/route.ts` (GET, PATCH)
- ⬜ `sendOcularOrderNotification` in `backend/services/sendgrid.service.ts`

### 3.2 — Ocular Layout + Navigation ⬜

- ⬜ `app/ocular/layout.tsx` — sidebar nav, teal branding, auth guard (ocular track only)

### 3.3 — Ocular Pages ⬜

- ⬜ `app/ocular/dashboard/page.tsx`
- ⬜ `app/ocular/product-info/page.tsx`
- ⬜ `app/ocular/orders/new/page.tsx`
- ⬜ `app/ocular/orders/page.tsx`
- ⬜ `app/ocular/orders/[id]/page.tsx`

### 3.4 — ITS Rep / Admin UI ⬜

- ⬜ `components/clinic-staff/OcularOrdersTab.tsx`
- ⬜ Wire into `ClinicStaffDashboardClient.tsx`

### 3.5 — Product Catalog: Ocular ⬜

- ⬜ `backend/services/ocularProducts.service.ts`
- ⬜ `backend/controllers/ocularProducts.controller.ts`
- ⬜ `app/api/ocular/products/route.ts`
- ⬜ `app/api/ocular/products/[id]/route.ts`
- ⬜ `components/clinic-staff/OcularProductsCatalogTab.tsx`

---

## Phase 4 — Cross-Module Features ⬜

### 4.1 — All Submissions Unified Tab ⬜

- ⬜ `components/clinic-staff/AllSubmissionsTab.tsx` — parallel fetch BV + Medical Devices + Ocular, type badge, type/status filter, "View tab →" per row
- ⬜ Wire as first nav item in `ClinicStaffDashboardClient.tsx`

### 4.2 — Wound Care Tab Unification ⬜

- ⬜ Rename "Product Orders" sidebar item → "Wound Care Products"
- ⬜ Add Orders / Product Catalog pill toggle inside that tab
- ⬜ Remove separate "Products" sidebar item (catalog moved inside Wound Care tab)

### 4.3 — Unified Order Status Enum ✅

Already implemented: all three order types use `pending | approved | shipped | completed | denied | cancelled`

---

## Phase 5 — Demo-Specific Seeding ⬜

### 5.1 — System Settings Seed ⬜

- ⬜ `backend/scripts/demo/seedDemoSystemSettings.ts`

### 5.2 — Practice Tracks Seed ⬜

- ⬜ `backend/scripts/demo/seedDemoPracticeTracks.ts`

### 5.3 — Product Catalog Seed ⬜

- ⬜ `backend/scripts/demo/seedDemoProductCatalogs.ts` — AIROS 6/8/6P + all 8 VisiDisc SKUs

### 5.4 — Demo Lymphedema Orders Seed ⬜

- ⬜ `backend/scripts/demo/seedDemoLymphedemaOrders.ts` — 4–6 fake orders across statuses

### 5.5 — Demo Ocular Orders Seed ⬜

- ⬜ `backend/scripts/demo/seedDemoOcularOrders.ts` — 3–5 fake orders across statuses

### 5.6 — Update `resetDemo.ts` ⬜

- ⬜ Add new tables to TRUNCATE block (dependency order)
- ⬜ Import + call all new seed functions in correct order

---

## Summary

| Phase | Status | Notes |
|---|---|---|
| 0 — Pre-Expansion Changes | ⬜ Not started | Wound size, delivery address, renaming, BAA disclaimer, rep security, clinic address |
| 1 — Track System Foundation | ✅ Done | Schema, service, routing, landing page, admin tabs all wired |
| 2.1 — Lymphedema Backend | ✅ Done | Routes at `/api/lymphedema-orders/` |
| 2.2 — Provider Modal | 🔄 Partial | Modal + tab done; PDF download missing |
| 2.3 — Rep/Admin Tab | ✅ Done | `LymphedemaOrdersTab` wired into clinic-staff dashboard |
| 2.4 — Lymphedema Product Catalog | ⬜ Not started | |
| 3 — Ocular Module | ⬜ Not started | Backend, pages, admin tab, product catalog |
| 4 — Cross-Module Features | ⬜ Not started | All Submissions tab, wound care tab unification |
| 5 — Demo Seeding | ⬜ Not started | System settings, practice tracks, product catalogs, order seeds, resetDemo |

**Next up:** Phase 0.1 (wound size input manual only), then 0.2 (BV delivery address fields), then 0.4 (BAA disclaimer), then Phase 3 (Ocular).
