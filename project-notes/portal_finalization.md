# Portal Expansion — Finalization Plan

**Source of truth:** [Roadmap_Portal_Expansion.md](Roadmap_Portal_Expansion.md)
**PRD:** [PRD_Portal_Expansion.md](PRD_Portal_Expansion.md)

## Current Status (as of 2026-06-17)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0 (Discovery) | Partial | Remaining items are non-blocking human/client tasks |
| Phase 1 (Foundation) | **Complete** | Track system, landing page, admin UI, nav routing all done |
| Phase 2 (Medical Devices / Equipment) | **Complete** | All items done including PDF, ITS Rep dashboard, status management, detail view; product catalog + Orders/Catalog toggle added post-QA |
| Phase 3 (Ocular) | **Complete** | Full module done; product catalog + Orders/Catalog toggle added post-QA |
| Phase 4 (Polish & Ship) | **QA Complete — Deploy Pending** | Cross-module dashboard done, RLS audit done, QA Run 1 & 2 done, fixes applied. Deploy remaining. |
| Phase 5 (Post-QA Additions) | **Complete** | Delivery prefill extension, product catalogs, tab + status unification. Needs pre-deploy migration step. |

> **Naming:** Track key in code is `lymphedema`. Client-facing display name is **"Medical Devices / Equipment"** throughout UI, emails, and dashboard tabs.

---

## Session 1 — Phase 2: Medical Devices / Equipment Module

**Progress: Complete (2026-06-08)**

**All items done (Roadmap Days 6–9):**
- [x] `lymphedema_orders` table: schema, migration, RLS (practice-scoped reads, admin all-access)
- [x] Backend service (`backend/services/lymphedema.service.ts`) — `createOrder`, `getOrder`, `listOrders`, `updateStatus`, `listForRep` (rep-scoped)
- [x] Backend controller (`backend/controllers/lymphedema.controller.ts`) — full RBAC (provider/rep/admin)
- [x] Route handlers — `app/api/lymphedema/orders/route.ts` (GET, POST) + `app/api/lymphedema/orders/[id]/route.ts` (GET, PATCH)
- [x] Modal-based 3-step flow — `LymphedemaModal.tsx` wrapping `LymphedemaSteps/Step1Clinical.tsx`, `Step2Device.tsx`, `Step3Review.tsx`
- [x] Step 1 UI — Insurance, demographics, clinical eligibility, conservative therapy gate, skin changes, extremity, measurements
- [x] Step 2 UI — Device auto-recommendation engine (`recommendDevice()`), override, garment type/style, compression level, treatment protocol
- [x] Step 3 UI — Review summary + submit + PDF download
- [x] SendGrid email template (purple-themed, device order details, HIPAA footer, 4-week processing warning)
- [x] Provider dashboard integration — "Medical Devices / Equipment" tab with orders table + purple "New Order" button
- [x] **PDF generation** — `@react-pdf/renderer` template (`LymphedemaOrderPdf.tsx`) matching ReMarx Standard Written Order layout, all fields pre-filled, blank physician signature line
- [x] **"Download Order Form" button** in Step 3 — client-side PDF generation via `pdf().toBlob()`
- [x] **ITS Rep dashboard tab** — `MedicalDevicesTab.tsx` added to `ClinicStaffDashboardClient.tsx` with search, status filter, pagination
- [x] **Admin status management UI** — inline status dropdown (pending → sent → approved) per order row
- [x] **Order detail view** — expandable row with 3-column layout (Patient, Clinical, Device & Protocol) including all garment, measurement, and treatment details
- [x] **Admin PDF re-download** — provider can re-download from Step 3; admin sees full detail in expandable row

**Build status:** Passes (`npm run build` clean). Compiled successfully.

**Next session:** Phase 3 — Ocular Module (Roadmap Days 10–13).

---

## Session 2 — Phase 3: Ocular Module (Roadmap Days 10–13)

**Progress: Complete (2026-06-08)**

**Backend:**
- [x] `ocular_orders` table — schema pre-existing from Phase 1, RLS applied
- [x] Backend service (`backend/services/ocular.service.ts`) — CRUD + rep-scoped + provider-scoped queries
- [x] Backend controller (`backend/controllers/ocular.controller.ts`) — full RBAC (provider/rep/admin), Zod validation
- [x] Route handlers — `app/api/ocular/orders/route.ts` (GET, POST) + `app/api/ocular/orders/[id]/route.ts` (GET, PATCH)
- [x] SendGrid email template (`sendOcularOrderNotification`) — teal gradient, order details, link to ITS dashboard

**Provider-facing UI:**
- [x] Ocular layout `app/ocular/layout.tsx` — sidebar nav (Dashboard / Product Info / New Order / Order History), teal branding, sign-out, mobile drawer, auth guard (ocular track only)
- [x] Dashboard `app/ocular/dashboard/page.tsx` — 3 quick-action cards, recent orders table (last 5), pending count
- [x] Product Info `app/ocular/product-info/page.tsx` — overview, variants with SKU tables, ICD-10 codes (14), video placeholders, CPT 65778 reimbursement guide, best practices
- [x] Order form `app/ocular/orders/new/page.tsx` — single-page, ICD-10 searchable dropdown (20+ codes), SKU auto-derivation (`VS45XX` / `VS200XX`), Zod + React Hook Form, success screen
- [x] Order history `app/ocular/orders/page.tsx` — practice-scoped table, search, status badges, link to detail
- [x] Order detail `app/ocular/orders/[id]/page.tsx` — patient, product (teal accent), diagnosis, shipping, insurance, metadata

**ITS Rep/Admin dashboard:**
- [x] `OcularOrdersTab.tsx` — teal theme, expandable detail rows (3-column: Patient, Diagnosis & Insurance, Product & Shipping), inline status dropdown (pending → sent → fulfilled), search + filter + pagination
- [x] Wired into `ClinicStaffDashboardClient.tsx` as `ocular_orders` tab with Eye icon
- [x] Admin ocular submission email already in Settings tab (Phase 1)

**Deferred to Phase 4:**
- [ ] CMS-lite for Product Info content (admin editing without code deploy)
- [ ] PDF generation for ocular orders (no signature required per PRD; lower priority)
- [ ] Supabase Storage upload (deferred with PDF)

**Remaining smoke tests (Day 13):**
- [ ] Fresh ocular-only practice → no wound/medical-devices nav visible
- [ ] Toggle practice from `wound_care + lymphedema` → `ocular` → exclusivity warning fires, user re-routed on next login
- [ ] Cross-browser pass (Chrome, Safari, Firefox)
- [ ] Mobile pass on landing page + both modules

**Build status:** Passes (`npm run build` clean). All ocular routes registered.

**Next session:** Phase 4 — Polish & Ship (Roadmap Days 14–15).

---

## Session 3 — Phase 4: Polish & Ship (Roadmap Days 14–15)

**Cross-module dashboard integration (PRD §8):**
- [x] `AllSubmissionsTab.tsx` — unified table combining BV (blue), Medical Devices (purple), Ocular (teal) with Type badge column
- [x] Type filter dropdown — All / Wound Care / Medical Devices / Ocular
- [x] Status filter — All / Pending / Sent / Approved / Fulfilled / Rejected
- [x] "View tab →" per-row action that switches to the relevant module tab
- [x] System admin view: all three API calls return cross-practice data for admin role (existing RBAC handles this); unified tab shows all practices' submissions
- [x] Wired into `ClinicStaffDashboardClient.tsx` as first nav item "All Submissions" with Layers icon

**Quality & security:**
- [x] **RLS audit** — all 4 new tables pass: `lymphedema_orders`, `ocular_orders`, `system_settings`, `practice_tracks`. Anon blocked, provider scoped to own `practice_id`, system_settings write-locked to admin only, no cross-practice leaks. App-layer RBAC double-enforces in controllers.
- [x] **Type-check + lint clean** — `npm run build` passes; pre-commit hook verified on commit.
- [x] **PRD §12 acceptance criteria** — 21/21 confirmed. All human-test items completed in QA Run 1 & 2.
- [x] **Color contrast** — all badge classes pass WCAG AA (min 4.5:1): Wound Care blue ~8.1:1, Medical Devices purple ~7.2:1, Ocular teal ~6.5:1, status badges all ≥6.4:1.
- [x] **Email deliverability test** — PASS (QA Run 1 #86, Run 2 #102)
- [x] **PDF visual QA** — PASS (QA Run 1 #116–119): all fields pre-filled, signature blank, no overflow
- [x] **Accessibility pass** — PASS (QA Run 2 #126–129): full keyboard navigation through all flows
- [x] **Responsive QA** — PASS (QA Run 1 #120–125): 390×844 viewport, all modules

**QA Run 1 results (2026-06-10) — Tests #67–86, 116–125 (30 tests):**
- 29 PASS / 1 FAIL
- FAIL #82: Medical Devices name search → **Fixed in commit 20d3a43**
- Minor notes: Override scrollbar (#73), "Stocking Type" label (#74), gap width on mobile expanded row (#125)

**QA Run 2 results (2026-06-10) — Tests #62–66, 87–115, 126–129 (38 tests):**
- 35 PASS / 1 FAIL / 1 PENDING / 1 skipped
- FAIL #64: ITS Rep Edit Tracks "request failed" → **Fixed in commit 20d3a43**
- PENDING #65: Direct API call test (rep → unassigned provider → 403) — no API testing tool; deferred to post-ship verification
- Minor notes: New Order highlights Order History tab (#90), city/state/zip optional (#91), exact-match search bug in All Submissions (#111), dashboard flicker on track redirect (#103/#104)

**Deploy:**
- [ ] Merge to `staging`, deploy preview, smoke test with real Supabase + SendGrid
- [ ] Run `npx ts-node scripts/applyRls.ts` in staging
- [ ] **Run `npx tsx scripts/migrateOrderStatuses.ts`** against staging DB (remaps `sent → shipped`, `fulfilled → completed` for existing lymphedema/ocular orders)
- [ ] Run `npm run db:push` to apply new enum values and `lymphedema_products`/`ocular_products` tables
- [ ] Run `npx tsx scripts/seedProductCatalogs.ts` to seed initial catalog data
- [ ] Client UAT window (2-hour block)
- [ ] Merge `staging` → `main`, production deploy via Vercel
- [ ] Apply RLS to production, seed `system_settings` with confirmed emails
- [ ] Enable `lymphedema` track on client-designated practices
- [ ] Quick-reference doc: "How to enable a track" + "How to update submission email"
- [ ] Monitor SendGrid + Vercel logs ~1 hour post-deploy

---

## Session 4 — Phase 5: Post-QA Additions (2026-06-14 to 2026-06-16)

These features were added to `feat/portal-expansion` after QA Run 2 passed, before merge to `main`.

### 5.1 — Delivery Details Prefill Extension (commit a382b16, 2026-06-14)

**Problem:** Provider signup only captured `clinic_address` (free text). No city/state/zip, so delivery prefill in BV requests and product orders was incomplete. `ProductOrderModal` was also not pre-filling delivery from the linked BV request.

**Changes:**
- [x] `db/provider.ts` — `clinic_city`, `clinic_state`, `clinic_zip` added to `provider_acct` (nullable)
- [x] `backend/services/providerAcct.service.ts` + `providerSignup.service.ts` — new fields persisted + exposed
- [x] `components/auth/signup/providers/SignupStep1ClinicDetails.tsx` — City, State, Zip now required in signup
- [x] `components/dashboard/ProductOrderModal.tsx` — delivery address/city/state/zip/date/contact pre-populated from BV request selection; reset on modal close
- [x] `components/dashboard/EnhancedOrderModal.tsx` — delivery prefill aligned with BV data
- [x] `components/dashboard/DashboardNavbar.tsx` — clinic address fields in nav context
- [x] `app/ocular/orders/new/page.tsx` — ship-to pre-populated from practice profile
- [x] `store/auth.ts` — `clinicCity`, `clinicState`, `clinicZip` added to auth store
- [x] `backend/__tests__/providerSignup.test.ts` — updated for new required fields; passes

### 5.2 — Product Catalog Management: Lymphedema + Ocular (commit 9c331e1, 2026-06-16)

**Problem:** Admins had no in-portal way to manage the list of products available for medical device and ocular orders. Wound care had an existing product catalog; the new tracks needed the same capability.

**Changes:**
- [x] New schema tables pushed to Supabase:
  - `lymphedema_products` — `name`, `device`, `hcpcs`, `garment_type`, `garment_style`, `compression_level`, `manufacturer`, `extremity_type`, `description`, `archived`
  - `ocular_products` — `name`, `product_variant`, `size_mm`, `sku` (unique), `description`, `archived`
- [x] Services: `lymphedemaProducts.service.ts`, `ocularProducts.service.ts` — full CRUD
- [x] Controllers: `lymphedemaProducts.controller.ts`, `ocularProducts.controller.ts` — admin-only write; rep/provider read-only
- [x] API routes: `app/api/lymphedema/products/[id]/route.ts` + `app/api/ocular/products/[id]/route.ts` (GET/PATCH/DELETE); collection routes (GET/POST)
- [x] Admin UI: `LymphedemaProductsCatalogTab.tsx` + `OcularProductsCatalogTab.tsx` — full CRUD with archive toggle; added as "Product Catalog" pill in existing tabs
- [x] `MedicalDevicesTab.tsx` + `OcularOrdersTab.tsx` — Orders / Product Catalog pill toggle
- [x] `LymphedemaSteps/Step2Device.tsx` — catalog product picker; selecting a catalog item pre-fills device, HCPCS, garment type/style, compression level, manufacturer; manual entry still available as fallback
- [x] `lymphedema_orders.lymphedema_product_id` + `ocular_orders.ocular_product_id` — nullable FKs (`onDelete: set null`) for catalog traceability
- [x] `scripts/seedProductCatalogs.ts` — seeds initial AIROS 6/8/6P + all 8 VisiDisc SKUs

### 5.3 — Unify Wound Care Orders + Product Catalog Tab (commit a853515, 2026-06-16)

**Problem:** The ITS Rep/Admin dashboard had separate "Product Orders" and "Products" sidebar items for wound care, while the lymphedema and ocular tabs used an Orders/Catalog pill toggle pattern. Inconsistent UX.

**Changes:**
- [x] `components/clinic-staff/ClinicStaffDashboardClient.tsx`:
  - "Product Orders" sidebar item renamed to "Wound Care Products"
  - Orders / Product Catalog pill toggle added (matching lymphedema + ocular pattern)
  - Separate "Products" sidebar item removed; catalog now accessible within the Wound Care Products tab

### 5.4 — Unified Order Status Enum (commit 907d4cb, 2026-06-16)

**Problem:** Lymphedema orders used `pending | sent | approved`; ocular orders used `pending | sent | fulfilled`. Wound care product orders used `pending | approved | shipped | completed | denied | cancelled`. Three different enums made cross-module status filtering inconsistent and the AllSubmissionsTab status dropdown confusing.

**Changes:**
- [x] `db/lymphedema-orders.ts` — `lymphedema_status` enum: `pending | approved | shipped | completed | denied | cancelled`
- [x] `db/ocular-orders.ts` — `ocular_status` enum: `pending | approved | shipped | completed | denied | cancelled`
- [x] All services, controllers, UI tabs (`MedicalDevicesTab`, `OcularOrdersTab`, `AllSubmissionsTab`), and order detail pages updated to use unified enum
- [x] `scripts/migrateOrderStatuses.ts` — migrates existing data: `sent → shipped`, `fulfilled → completed`; idempotent

**Pre-deploy requirement:** Run `npx tsx scripts/migrateOrderStatuses.ts` against staging (then prod) before `npm run db:push` to avoid constraint violations on existing rows.

**Build status (2026-06-17):** `npm run build` passes clean on all Phase 5 changes.
