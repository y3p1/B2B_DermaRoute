# Demo Branch — Portal Expansion Integration Plan

**Branch:** `Demo`
**Source of truth for features:** `PRD_Portal_Expansion.md`, `pre-portal-expansion-changes.md`, `portal_finalization.md`
**Goal:** Port all portal expansion features from the production app into the Demo branch, adapted for demo use.

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

## Phase 0 — Pre-Expansion Changes

These are foundational changes that must land before any new module code.

### 0.1 — Wound Size Input: Manual Only

**Files to modify:**
- `components/dashboard/BVSteps/Step1ClinicalInfo.tsx` — remove dropdown/manual toggle, `woundSizeInputMode` state, `woundSizesList` state, wound-sizes fetch; replace with single `<Input>` field + helper text
- `db/bv-requests.ts` — widen `woundSize` from `varchar(32)` to `varchar(128)`

### 0.2 — BV Delivery Address Fields

**DB:**
- `db/bv-requests.ts` — add nullable columns: `delivery_address varchar(256)`, `delivery_city varchar(128)`, `delivery_state varchar(2)`, `delivery_zip varchar(10)`
- Run `npm run db:push-only`

**Backend:**
- `backend/services/bvRequests.service.ts` — add 4 fields to `createBvRequestSchema` (optional), `createBvRequest()`, `updateBvRequest()`, and all 4 query functions' select clauses

**Frontend:**
- `components/dashboard/BVSteps/Step2PatientDelivery.tsx` — add Street Address, City, State, Zip fields (required, between dates and instructions textarea)
- `components/dashboard/BVSteps/Step3Recommendation.tsx` — include 4 delivery fields in submission payload
- `components/dashboard/EnhancedOrderModal.tsx` — add 4 fields to `BvRequest` type; `handleBvSelect` prefills from selected BV

### 0.3 — Track/Section Renaming

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

### 0.4 — BAA Vendor Disclaimer

**File:** `components/auth/signup/providers/agreement/AgreementPage6.tsx`
- Add `disclaimerAcknowledged` boolean state
- Add amber disclaimer box: "Important Notice Regarding Business Associate Agreements (BAA)" with two paragraphs + checkbox "I understand and wish to proceed"
- Disable "Agree and Continue" until form valid AND checkbox checked
- No backend changes

### 0.5 — Rep Territory / Account Assignment Security

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

### 0.6 — Provider Clinic Address Fields

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

## Phase 1 — Track System Foundation

### 1.1 — New Schema Tables

**New files:**
- `db/practice-tracks.ts` — `id`, `practice_id`, `track` (enum: `wound_care | lymphedema | ocular`), `enabled`, `enabled_at`, `enabled_by`
- `db/system-settings.ts` — `key` (PK), `value`, `updated_by`, `updated_at`
- `db/lymphedema-orders.ts` — see PRD §5.5 + unified status enum `pending | approved | shipped | completed | denied | cancelled`
- `db/ocular-orders.ts` — see PRD §6.6 + same unified status enum
- `db/lymphedema-products.ts` — `id`, `name`, `device`, `hcpcs`, `garment_type`, `garment_style`, `compression_level`, `manufacturer`, `extremity_type`, `description`, `archived`
- `db/ocular-products.ts` — `id`, `name`, `product_variant`, `size_mm`, `sku` (unique), `description`, `archived`

**Update `db/schema.ts`** — re-export all 6 new schema files

**Run:** `npm run db:generate && npm run db:push`

**RLS:** add policies in `scripts/applyRls.ts`:
- `practice_tracks` — anon blocked; provider read-only own practice; admin all-access
- `system_settings` — anon blocked; provider/rep read-only; admin write
- `lymphedema_orders` — provider scoped to own `practice_id`; admin all-access
- `ocular_orders` — same as lymphedema_orders
- `lymphedema_products` — all authenticated read; admin write
- `ocular_products` — all authenticated read; admin write

### 1.2 — Track Service + `/api/me` Extension

**New file:** `backend/services/tracks.service.ts`
- `getEnabledTracks(practiceId)` — returns `TrackKey[]`
- `getTracksForAllProviders()` — returns map for admin view
- `getTracksForRepProviders(repId)` — rep-scoped
- `updateProviderTracks(providerId, tracks, actingAdminId)` — validates ocular exclusivity server-side; populates `enabled_by` + `enabled_at`

**Modify `app/api/me/route.ts`** — include `enabledTracks: TrackKey[]` in response

**Modify `store/auth.ts`** — add `enabledTracks: TrackKey[]` field; populate from `/api/me`

### 1.3 — Track-Based Routing + Nav

**Modify `hooks/useRouteGuard.ts` + `lib/routeGuard.ts`:**
- Make `/` public (no auth redirect)
- `DEFAULT_AUTHENTICATED_REDIRECT` → `/dashboard`
- Authenticated users not bounced from landing page

**Modify `components/auth/AuthComponent.tsx`:**
- Post-login redirect: `ocular` → `/ocular/dashboard`; `admin` → `/admin`; `clinic_staff` → `/its-representative`; else → `/dashboard`

**Modify `components/dashboard/ProviderDashboardClient.tsx`:**
- Conditionally render nav items: `wound_care` gates BV + Orders + Healing Tracker; `lymphedema` shows Medical Devices nav item

**New file:** `app/no-tracks/page.tsx`
- "No Active Service Lines. Contact your administrator." empty state

### 1.4 — Landing Page

**Modify `app/page.tsx`** — render `<LandingPage />` (public; no auth required)

**Modify `components/landing/LandingPage.tsx`** — already exists; update with:
- Three service cards: Tissue Products & PRP, Ocular Products, Medical Devices / Equipment
- Hero with "Sign In to Portal" CTA → `/auth`
- Logged-in: show "Go to Dashboard" instead of "Sign In"
- Responsive: stacks on mobile, 3-column on desktop

### 1.5 — Admin Practice Track Management

**New file:** `components/clinic-staff/PracticeTracksTab.tsx`
- Table of all providers with track chips
- "Edit Tracks" inline dialog: checkboxes for `wound_care` / `lymphedema` / `ocular`
- Ocular exclusivity confirmation modal on conflict
- `enabled_by` + `enabled_at` populated on save
- Wire into `ClinicStaffDashboardClient.tsx` as new "Practice Tracks" tab

**New file:** `components/clinic-staff/SystemSettingsTab.tsx`
- Editable email fields: "Medical Devices / Equipment Order Submission Email" + "Ocular Order Submission Email"
- Inline email validation + save to `system_settings`
- "Last updated by [name] on [date]" display
- Admin-only tab in `ClinicStaffDashboardClient.tsx`

**New controller/routes:**
- `backend/controllers/practiceTracks.controller.ts` — CRUD with rep/admin RBAC
- `app/api/practice-tracks/route.ts` (GET, POST)
- `app/api/practice-tracks/[providerId]/route.ts` (GET, PATCH)
- `backend/controllers/systemSettings.controller.ts`
- `app/api/system-settings/route.ts` (GET, PATCH — admin only)

---

## Phase 2 — Medical Devices / Equipment Module

> Track key in code: `lymphedema`. Display name everywhere: "Medical Devices / Equipment"

### 2.1 — Backend

**New file:** `backend/services/lymphedema.service.ts`
- `createOrder`, `getOrder`, `listOrders`, `updateStatus`, `listForRep`

**New file:** `backend/controllers/lymphedema.controller.ts`
- Full RBAC: provider creates/views own; rep views assigned practices; admin all
- Triggers `sendLymphedemaOrderNotification` async on create

**New files:** API routes
- `app/api/lymphedema/orders/route.ts` (GET, POST)
- `app/api/lymphedema/orders/[id]/route.ts` (GET, PATCH)

**SendGrid template:**
- `backend/services/sendgrid.service.ts` — add `sendLymphedemaOrderNotification(order, email)`: purple gradient header, order details card, HIPAA footer, 4-week processing warning
- **Demo adaptation:** `email` param ignored; always send to `DEMO_EMAIL` env var or `demo@nvzn.ai`

### 2.2 — Provider UI (3-Step Modal)

**New files:**
- `components/dashboard/LymphedemaModal.tsx` — modal shell managing step state
- `components/dashboard/LymphedemaSteps/Step1Clinical.tsx` — Insurance, demographics, eligibility gate (conservative therapy = No blocks), skin changes validation (min 1 required)
- `components/dashboard/LymphedemaSteps/Step2Device.tsx` — auto-recommendation engine (`recommendDevice()`), override toggle, conditional garment fields (lower vs upper extremity), compression level, quantity, manufacturer, treatment protocol; catalog product picker (pre-fills device/HCPCS/garment from `lymphedema_products`)
- `components/dashboard/LymphedemaSteps/Step3Review.tsx` — read-only summary; "Download Order Form" button + "Submit Order" button
- `components/dashboard/LymphedemaOrderPdf.tsx` — `@react-pdf/renderer` template matching ReMarx Standard Written Order; all fields pre-filled, blank physician signature line

**Modify `components/dashboard/ProviderDashboardClient.tsx`:**
- Add "Medical Devices / Equipment" tab (purple theme, orders table, "New Order" button)

### 2.3 — ITS Rep / Admin UI

**New file:** `components/clinic-staff/MedicalDevicesTab.tsx`
- Purple theme, orders table with search + status filter + pagination
- Expandable detail row: 3-column grid (Patient, Clinical, Device & Protocol)
- Inline status dropdown per row: `pending → approved → shipped → completed | denied | cancelled`
- "Orders / Product Catalog" pill toggle (see Phase 4 for catalog tab)
- Wire into `ClinicStaffDashboardClient.tsx`

### 2.4 — Product Catalog: Medical Devices

**New files:**
- `backend/services/lymphedemaProducts.service.ts` — full CRUD
- `backend/controllers/lymphedemaProducts.controller.ts` — admin-only write; rep/provider read
- `app/api/lymphedema/products/route.ts` (GET, POST)
- `app/api/lymphedema/products/[id]/route.ts` (GET, PATCH, DELETE)
- `components/clinic-staff/LymphedemaProductsCatalogTab.tsx` — admin CRUD with archive toggle

---

## Phase 3 — Ocular Module

### 3.1 — Backend

**New file:** `backend/services/ocular.service.ts`
- `createOcularOrder`, `getOcularOrderById`, `getOcularOrderForProvider`, `listOcularOrdersForProvider`, `listAllOcularOrders`, `listOcularOrdersForRep`, `updateOcularOrderStatus`

**New file:** `backend/controllers/ocular.controller.ts`
- Full RBAC; triggers `sendOcularOrderNotification` on create

**New files:** API routes
- `app/api/ocular/orders/route.ts` (GET, POST)
- `app/api/ocular/orders/[id]/route.ts` (GET, PATCH)

**SendGrid template:**
- `backend/services/sendgrid.service.ts` — add `sendOcularOrderNotification(order, email)`: teal gradient header, order details (practice, patient, SKU, variant, size, qty, eye, diagnosis, timestamp), link to ITS dashboard
- **Demo adaptation:** same as lymphedema — always sends to demo address

### 3.2 — Ocular Layout + Navigation

**New file:** `app/ocular/layout.tsx`
- Sidebar nav: Dashboard / Product Info / New Order / Order History
- Teal branding; sign-out; mobile drawer; auth guard (`ocular` track only)

### 3.3 — Ocular Pages

**New files:**
- `app/ocular/dashboard/page.tsx` — 3 quick-action cards, recent orders table (last 5), pending count badge
- `app/ocular/product-info/page.tsx` — VisiDisc overview, Thin/Thick variants + SKU tables, 14 ICD-10 codes, 3 video placeholders, CPT 65778 reimbursement guide, best practices
- `app/ocular/orders/new/page.tsx` — single-page order form: patient block, ICD-10 searchable dropdown (20+ codes + free text), eye select, Thin/Thick variant, disc size filtered by variant, qty, date needed, ship-to (pre-filled from practice profile), special instructions, optional insurance collapsible; SKU derived on submit (`deriveSku(variant, sizeMm)`); success screen
- `app/ocular/orders/page.tsx` — practice-scoped history: search, status badges, link to detail
- `app/ocular/orders/[id]/page.tsx` — patient, product (teal accent), diagnosis, shipping, insurance, metadata sections

### 3.4 — ITS Rep / Admin UI

**New file:** `components/clinic-staff/OcularOrdersTab.tsx`
- Teal theme; expandable detail rows: 3-column (Patient, Diagnosis & Insurance, Product & Shipping)
- Inline status dropdown: `pending → approved → shipped → completed | denied | cancelled`
- Search + filter + pagination
- "Orders / Product Catalog" pill toggle (see Phase 4)
- Wire into `ClinicStaffDashboardClient.tsx`

### 3.5 — Product Catalog: Ocular

**New files:**
- `backend/services/ocularProducts.service.ts` — full CRUD
- `backend/controllers/ocularProducts.controller.ts` — admin-only write; rep/provider read
- `app/api/ocular/products/route.ts` (GET, POST)
- `app/api/ocular/products/[id]/route.ts` (GET, PATCH, DELETE)
- `components/clinic-staff/OcularProductsCatalogTab.tsx` — admin CRUD with archive toggle

---

## Phase 4 — Cross-Module Features

### 4.1 — All Submissions Unified Tab

**New file:** `components/clinic-staff/AllSubmissionsTab.tsx`
- Fetches BV + Medical Devices + Ocular in parallel via `Promise.allSettled`
- Type badge column: Tissue Products = blue, Medical Devices = purple, Ocular = teal
- Type filter: All / Tissue Products / Medical Devices / Ocular
- Status filter: All / Pending / Approved / Shipped / Completed / Denied / Cancelled
- "View tab →" per row: switches to relevant module tab
- Admin: cross-practice data (RBAC handles this via existing controller logic)
- Wire as first nav item in `ClinicStaffDashboardClient.tsx` with Layers icon

### 4.2 — Wound Care Tab Unification

**Modify `components/clinic-staff/ClinicStaffDashboardClient.tsx`:**
- Rename "Product Orders" sidebar item → "Wound Care Products"
- Add "Orders / Product Catalog" pill toggle inside that tab (matches lymphedema + ocular pattern)
- Remove separate "Products" sidebar item (catalog now inside Wound Care Products tab)

### 4.3 — Unified Order Status Enum

All three order types use: `pending | approved | shipped | completed | denied | cancelled`

**Files to update if enum differs in source:**
- `db/lymphedema-orders.ts` — use unified enum (already specified above)
- `db/ocular-orders.ts` — use unified enum (already specified above)
- All service/controller/UI files for both modules use same status values
- **Demo note:** No migration script needed since Demo DB has no existing lymphedema/ocular orders — seed fresh with unified enum from the start

---

## Phase 5 — Demo-Specific Seeding

### 5.1 — System Settings Seed

**New file:** `backend/scripts/demo/seedDemoSystemSettings.ts`
- Inserts `lymphedema_submission_email` = `demo@nvzn.ai`
- Inserts `ocular_submission_email` = `demo@nvzn.ai`
- Called from `resetDemo.ts`

### 5.2 — Practice Tracks Seed

**New file:** `backend/scripts/demo/seedDemoPracticeTracks.ts`
- Enables `wound_care` for all existing demo wound-care practices
- Enables `wound_care + lymphedema` for one designated demo practice ("Coastal Demo Practice")
- Enables `ocular` only for one designated demo practice ("Ocular Demo Practice")
- Called from `resetDemo.ts`

### 5.3 — Product Catalog Seed

**New file:** `backend/scripts/demo/seedDemoProductCatalogs.ts`
- Inserts AIROS 6, AIROS 8, AIROS 6P into `lymphedema_products` with full HCPCS + garment type data
- Inserts all 8 VisiDisc SKUs into `ocular_products` (VS4508 through VS20015)
- Called from `resetDemo.ts`

### 5.4 — Demo Lymphedema Orders Seed

**New file:** `backend/scripts/demo/seedDemoLymphedemaOrders.ts`
- 4–6 realistic fake orders across statuses: pending, approved, shipped, completed
- Tied to the `wound_care + lymphedema` demo practice
- Called from `resetDemo.ts`

### 5.5 — Demo Ocular Orders Seed

**New file:** `backend/scripts/demo/seedDemoOcularOrders.ts`
- 3–5 realistic fake orders across statuses: pending, approved, shipped
- Tied to the `ocular` demo practice
- Called from `resetDemo.ts`

### 5.6 — Update `resetDemo.ts`

**Modify `scripts/demo/resetDemo.ts`:**
- Add new tables to the TRUNCATE block (in dependency order):
  ```sql
  TRUNCATE TABLE
    ocular_orders,
    lymphedema_orders,
    practice_tracks,
    system_settings,
    lymphedema_products,
    ocular_products,
    -- existing tables...
  RESTART IDENTITY CASCADE
  ```
- Import and call new seed functions in the correct order:
  1. `seedDemoSystemSettings`
  2. `seedDemoProductCatalogs`
  3. `seedDemoUsers` (existing — creates demo practices/users)
  4. `seedDemoPracticeTracks` (after users, needs practice IDs)
  5. Existing BV/BAA/order seeds
  6. `seedDemoLymphedemaOrders` (after practice tracks)
  7. `seedDemoOcularOrders` (after practice tracks)

---

## File Inventory (New Files to Create)

### DB Schema
- `db/practice-tracks.ts`
- `db/system-settings.ts`
- `db/lymphedema-orders.ts`
- `db/ocular-orders.ts`
- `db/lymphedema-products.ts`
- `db/ocular-products.ts`

### Backend Services
- `backend/services/tracks.service.ts`
- `backend/services/lymphedema.service.ts`
- `backend/services/ocular.service.ts`
- `backend/services/lymphedemaProducts.service.ts`
- `backend/services/ocularProducts.service.ts`
- `backend/services/systemSettings.service.ts`

### Backend Controllers
- `backend/controllers/practiceTracks.controller.ts`
- `backend/controllers/systemSettings.controller.ts`
- `backend/controllers/lymphedema.controller.ts`
- `backend/controllers/ocular.controller.ts`
- `backend/controllers/lymphedemaProducts.controller.ts`
- `backend/controllers/ocularProducts.controller.ts`

### API Routes
- `app/api/practice-tracks/route.ts`
- `app/api/practice-tracks/[providerId]/route.ts`
- `app/api/system-settings/route.ts`
- `app/api/lymphedema/orders/route.ts`
- `app/api/lymphedema/orders/[id]/route.ts`
- `app/api/lymphedema/products/route.ts`
- `app/api/lymphedema/products/[id]/route.ts`
- `app/api/ocular/orders/route.ts`
- `app/api/ocular/orders/[id]/route.ts`
- `app/api/ocular/products/route.ts`
- `app/api/ocular/products/[id]/route.ts`

### Frontend Pages
- `app/no-tracks/page.tsx`
- `app/ocular/layout.tsx`
- `app/ocular/dashboard/page.tsx`
- `app/ocular/product-info/page.tsx`
- `app/ocular/orders/new/page.tsx`
- `app/ocular/orders/page.tsx`
- `app/ocular/orders/[id]/page.tsx`

### Frontend Components
- `components/dashboard/LymphedemaModal.tsx`
- `components/dashboard/LymphedemaSteps/Step1Clinical.tsx`
- `components/dashboard/LymphedemaSteps/Step2Device.tsx`
- `components/dashboard/LymphedemaSteps/Step3Review.tsx`
- `components/dashboard/LymphedemaOrderPdf.tsx`
- `components/clinic-staff/MedicalDevicesTab.tsx`
- `components/clinic-staff/LymphedemaProductsCatalogTab.tsx`
- `components/clinic-staff/OcularOrdersTab.tsx`
- `components/clinic-staff/OcularProductsCatalogTab.tsx`
- `components/clinic-staff/PracticeTracksTab.tsx`
- `components/clinic-staff/SystemSettingsTab.tsx`
- `components/clinic-staff/AllSubmissionsTab.tsx`

### Demo Seed Scripts
- `backend/scripts/demo/seedDemoSystemSettings.ts`
- `backend/scripts/demo/seedDemoPracticeTracks.ts`
- `backend/scripts/demo/seedDemoProductCatalogs.ts`
- `backend/scripts/demo/seedDemoLymphedemaOrders.ts`
- `backend/scripts/demo/seedDemoOcularOrders.ts`

---

## Implementation Order

Port in this sequence to keep the build green at every phase:

1. **Phase 0.1–0.4** — wound size, delivery address, renaming, BAA disclaimer (touches existing files only; no new API routes)
2. **Phase 0.5** — rep security (touches existing controllers/services)
3. **Phase 0.6** — provider address fields (schema change → `db:push` required)
4. **Phase 1.1** — all 6 new schema tables → `db:push` (single migration, run once)
5. **Phase 1.2** — tracks service + `/api/me` extension
6. **Phase 1.3–1.5** — routing, landing page, admin track management + system settings
7. **Phase 2** — Medical Devices module (backend → step components → rep/admin UI → product catalog)
8. **Phase 3** — Ocular module (backend → pages → rep/admin UI → product catalog)
9. **Phase 4** — All Submissions tab + wound care tab unification
10. **Phase 5** — Demo seed scripts + `resetDemo.ts` update

After Phase 1.1: run `npm run db:push` once. No further schema migrations should be needed.
After Phase 5: run `npm run demo:reset` to verify full seeding works end-to-end.
