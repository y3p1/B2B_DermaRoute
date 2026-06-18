# Development Roadmap — Portal Expansion

**Companion to:** [PRD_Portal_Expansion.md](PRD_Portal_Expansion.md)
**Target duration:** 3 weeks (15 working days)
**Mode:** Solo full-stack engineer, intensive sprint
**Start date:** _<set on kickoff>_
**Target ship date:** _<start + 21 calendar days>_

---

## 0. Why This Timeline

The PRD's "comfortable" estimate is 7–8 weeks at ~30 hrs/week. This roadmap compresses to **3 weeks at ~50–55 hrs/week** by:

1. **Reusing every existing pattern** — BV flow → Medical Devices flow, BV admin CRUD → Ocular CRUD, existing SendGrid service → new templates, existing Supabase Storage usage → new PDF buckets. Almost nothing is greenfield.
2. **Cutting nothing from acceptance criteria** — every checkbox in PRD §12 must still be true at ship.
3. **Frontloading discovery** so the build phase has zero ambiguity and zero context switching for the client.

> ⚠️ **Hard rule:** If a day's deliverable slips, push the slip into the **Polish phase** (days 14–15) — never into the next module. Modules must ship sequentially or the schedule collapses.

---

## 1. Phase Map (At a Glance)

```
Week 1                  Week 2                  Week 3
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│ Wed  Discovery        │ Mon  Devices S2       │ Mon  Ocular Submit
│ Thu  Discovery        │ Tue  Devices S3 + PDF │ Tue  Buffer / QA
│ Fri  Foundation 1     │ Wed  Devices Dashboard│ Wed  Polish & RLS
│ Sat  Foundation 2     │ Thu  Ocular Setup     │ Thu  Deploy + Hand-off
│ Sun  Devices S1       │ Fri  Ocular Form      │ Fri
└─────────────┘         └─────────────┘         └─────────────┘
   Days 1–5                Days 6–10               Days 11–15
```

| Phase | Days | Focus | Outcome |
| --- | --- | --- | --- |
| **0. Discovery** | 1–3 | Read, plan, unblock | Open questions answered, schemas drafted, branches cut |
| **1. Foundation** | 4–5 | Track system + landing page | Architectural backbone live behind feature flag |
| **2. Medical Devices / Equipment** | 6–9 | Full 3-step ordering module | First new track shippable |
| **3. Ocular** | 10–13 | Standalone ocular module | Second new track shippable |
| **4. Polish & Ship** | 14–15 | QA, RLS audit, cross-module dashboard, deploy | Production release |
| **5. Post-QA Additions** | — | Delivery prefill, product catalogs, tab + status unification | Branch additions before final merge to main |

---

## 2. Phase 0 — Discovery & Setup (Days 1–3)

**Status: Partial — remaining items are non-blocking human/client tasks**

### Day 1 — Read & Confirm Scope
- [x] Read [PRD_Portal_Expansion.md](PRD_Portal_Expansion.md) end-to-end
- [ ] Skim existing [PRD.md](PRD.md) §4.5 (BV flow) and §4.7 (Product Orders) — these are the patterns we'll mirror
- [x] Read existing [CLAUDE.md](../CLAUDE.md) sections on API pipeline + schema conventions
- [ ] Open [Lymphedema_Module_PRD.pdf] and skim the original spec to spot any drift from PRD §5
- [x] **Send the 7 open questions** in PRD §16 to the client — answered (see PRD §16 inline responses)

> 🎯 **End of Day 1 deliverable:** Open questions sent. Personal notes file with anything ambiguous.

### Day 2 — Codebase Audit
- [ ] Trace the existing BV submission flow start-to-finish:
  - Form component (`components/dashboard/bv/`)
  - Controller (`backend/controllers/bv.controller.ts`)
  - Service (`backend/services/bv.service.ts`)
  - Email template (`backend/services/sendgrid.service.ts`)
  - Storage upload pattern for PDFs
- [ ] Trace the existing admin BV view + dashboard table component (this is what the Type column will modify)
- [ ] Document any tech debt or refactor that would block the new modules — **do not fix it yet**, just note it
- [x] Sketch the three new tables in a scratch file (no migration yet):
  - `practice_tracks`
  - `lymphedema_orders`
  - `ocular_orders`
  - `system_settings`

> 🎯 **End of Day 2 deliverable:** Mental model of which files you'll touch in Phase 1. Schema sketches saved.

### Day 3 — Setup & Unblock
- [x] Create feature branch: `git checkout -b feat/portal-expansion`
- [x] Client open questions answered — ocular submission email = same emails; existing practices get `wound_care` only; ReMarx PDF confirmed; admin badges confirmed editable (see PRD §16)
- [x] Set up Drizzle schema files (full schemas, not just stubs):
  - `db/practice-tracks.ts`
  - `db/lymphedema-orders.ts`
  - `db/ocular-orders.ts`
  - `db/system-settings.ts`
  - Re-export from `db/schema.ts`
- [x] Confirm SendGrid — using inline HTML templates in `sendgrid.service.ts` (matches existing convention)
- [ ] Confirm Supabase storage buckets needed: `lymphedema-pdfs`, `ocular-pdfs` — deferred until PDF generation implemented

> 🎯 **End of Day 3 deliverable:** Branch cut, schema stubs in place, no unanswered blockers. **Build phase ready to start.**

---

## 3. Phase 1 — Foundation (Days 4–5)

**Status: Complete**

This is the highest-leverage phase: get the track system right and the next two modules slot in cleanly.

### Day 4 — Track System Backend + Landing Page
**Morning (track system):**
- [x] Finalize Drizzle schemas for `practice_tracks` and `system_settings`
- [x] Run `npm run db:generate` + `npm run db:push`
- [x] Add RLS policies in `supabase/rls/` (`practice_tracks.sql`, `system_settings.sql`, `lymphedema_orders.sql`, `ocular_orders.sql`)
- [x] Seed: every existing practice gets `wound_care` = true; `system_settings` gets `lymphedema_submission_email` + `ocular_submission_email` rows (`npm run seed:tracks`)
- [x] Backend service `backend/services/tracks.service.ts` with `getEnabledTracks(practiceId)` helper
- [x] Extended `/api/me` response to include `enabledTracks`; Zustand auth store updated with `TrackKey[]` field

**Afternoon (landing page):**
- [x] Create `app/page.tsx` as the public landing page — renders `<LandingPage />` from `components/landing/LandingPage.tsx`
- [x] Three service cards (Wound Care, Medical Devices / Equipment, Ocular) as part of LandingPage component
- [x] Hero with "Sign In to Portal" CTA → `/auth`
- [x] Logged-in rendering shows "Go to Dashboard" button instead of "Sign In"
- [ ] Responsive: stacks on mobile, three columns on desktop — implemented but not yet device-tested

> 🎯 **End of Day 4:** Landing page deployable. Tracks readable from DB but not yet enforced in UI.

### Day 5 — Track-Based Routing + Nav + Admin UI
**Morning (routing + nav):**
- [x] Update `hooks/useRouteGuard.ts` and `lib/routeGuard.ts` — `/` made public; `DEFAULT_AUTHENTICATED_REDIRECT` → `/dashboard`; authenticated users not bounced from landing page
- [x] Post-login redirect logic in `AuthComponent.tsx`: `ocular` → `/ocular/dashboard`; `admin` → `/admin`; `clinic_staff` → `/its-representative`; else → `/dashboard`
- [x] `ProviderDashboardClient.tsx` conditionally renders nav items based on `enabledTracks` (wound_care gates BV/Orders; lymphedema adds Medical Devices / Equipment item)
- [x] `app/no-tracks/page.tsx` — "No Active Service Lines. Contact your administrator." empty state

**Afternoon (admin practice-track management):**
- [x] `components/clinic-staff/PracticeTracksTab.tsx` — table of all providers with track chips + "Edit Tracks" dialog; added as new tab in `ClinicStaffDashboardClient.tsx`
- [x] Checkboxes for `wound_care` / `lymphedema` / `ocular` in edit dialog
- [x] Confirmation modal when `ocular` is combined with other tracks (client-side exclusivity warning)
- [x] Server-side validation in `practiceTracks.controller.ts` — rejects `ocular` + (`wound_care` | `lymphedema`) combinations
- [x] `enabled_by` + `enabled_at` audit fields in `practice_tracks` schema; `updateProviderTracksController` populates `enabledBy` with acting admin/staff ID
- [x] `components/clinic-staff/SystemSettingsTab.tsx` — editable email fields with audit display; added as new "Settings" tab (admin-only)

> 🎯 **End of Day 5 + Week 1:** Foundation complete. You can toggle a practice between tracks from the admin panel and see the nav change.

---

## 4. Phase 2 — Medical Devices / Equipment Module (Days 6–9)

> **Note:** The track key in code is `lymphedema`. The client-facing display name is **"Medical Devices / Equipment"** throughout the UI, emails, and dashboard tabs.

**Status: Complete**

### Day 6 — Schema, Service, Step 1 UI ✅
- [x] `lymphedema_orders` table: generated, pushed, RLS applied (practice-scoped reads, admin all-access)
- [x] Backend: `backend/services/lymphedema.service.ts` — `createOrder`, `getOrder`, `listOrders`, `updateStatus`, `listForRep` (rep-scoped)
- [x] Backend: `backend/controllers/lymphedema.controller.ts` + route handlers at `app/api/lymphedema/orders/` (GET, POST) and `app/api/lymphedema/orders/[id]/` (GET, PATCH)
- [x] Modal-based 3-step flow inside provider dashboard — `LymphedemaModal.tsx` wrapping `LymphedemaSteps/Step1Clinical.tsx`, `Step2Device.tsx`, `Step3Review.tsx`
- [x] **Step 1 UI** — Insurance, demographics, clinical eligibility form
  - All fields per PRD §5.4 Step 1
  - **Eligibility gate:** conservative therapy = No → blocks progression with warning
  - **Skin change validation:** at least one required to proceed
  - Zod + React Hook Form matching existing BV patterns

> 🎯 **End of Day 6:** Step 1 complete and validated client-side.

### Day 7 — Step 2: Device Recommendation + Garment Selection ✅
- [x] Device auto-recommendation logic (`recommendDevice()` pure function):
  - AIROS 6 (E0651): lower extremity, Medicare Standard — default
  - AIROS 8 (E0652): PPO / Advantage / Commercial, or upper extremity
  - AIROS 6P (E0651): truncal / pants garments, upper extremity peristaltic
- [x] Step 2 UI rendering recommended device prominently with override affordance
- [x] Conditional garment fields (lower vs upper extremity)
- [x] Compression level, quantity, custom-made, manufacturer preference — all captured
- [x] Treatment protocol (distal pressure, frequency, duration)
- [x] State management across steps via React local state in modal wrapper

> 🎯 **End of Day 7:** Two steps usable. Recommendation engine working.

### Day 8 — Step 3: Review, PDF Generation, Submission ✅
- [x] Step 3 review UI — read-only summary organized by section (Patient, Clinical, Device & Garment, Protocol)
- [x] **PDF generation** — `@react-pdf/renderer` template (`LymphedemaOrderPdf.tsx`) matching ReMarx Standard Written Order layout, all fields pre-filled, blank physician signature line
- [x] "Download Order Form" button — client-side PDF generation via `pdf().toBlob()`, auto-named per patient
- [x] "Submit Order" — POST to `/api/lymphedema/orders`, inserts row with status `pending`
- [x] Controller triggers async SendGrid email on creation (`sendLymphedemaOrderNotification`)
- [x] SendGrid email template — purple gradient header, order details card, HIPAA-compliant footer, 4-week processing warning
- [x] Email sent to configured `lymphedema_submission_email` from `system_settings`
- [x] Success screen with order ID + 4-week insurance processing notice

> 🎯 **End of Day 8:** Submission pipeline works end-to-end with PDF download.

### Day 9 — ITS Rep/Admin Dashboard + Detail View ✅
- [x] Provider dashboard: "Medical Devices / Equipment" tab with orders table (date, patient, device, HCPCS, extremity, status) + purple "New Order" button
- [x] Purple branding: progress bars, buttons, table hover states (`purple-50/40`), device text (`text-purple-700`), status badges
- [x] **ITS Rep dashboard** — `MedicalDevicesTab.tsx` added to `ClinicStaffDashboardClient.tsx` with search, status filter, pagination
- [x] **Admin status management UI** — inline status dropdown (pending → sent → approved) per order row in clinic-staff dashboard
- [x] **Order detail view** — expandable row with 3-column grid (Patient, Clinical, Device & Protocol) showing all garment, measurement, and treatment details
- [x] ~~Settings tab: submission email editor~~ — done in Phase 1 (`SystemSettingsTab.tsx`)
- [ ] **Smoke test:** submit order as provider → ITS Rep sees it → admin updates status → verify email received (requires running dev server + real accounts)

> ⚠️ **Cross-module dashboard features** (PRD §8) — Type column with color badges, Type filter dropdown, and unified "All Submissions" admin view — are deferred to **Phase 4** since they require all three modules to be built.

> 🎯 **End of Day 9:** Medical Devices module shippable. ITS Rep and admin can manage orders.

---

## 5. Phase 3 — Ocular Module (Days 10–13)

**Status: Complete**

### Day 10 — Schema, Ocular Shell, Product Info Page ✅
- [x] `ocular_orders` table: schema pre-existing from Phase 1, RLS applied (practice-scoped reads, admin all-access)
- [x] Backend service (`backend/services/ocular.service.ts`) — `createOcularOrder`, `getOcularOrderById`, `getOcularOrderForProvider`, `listOcularOrdersForProvider`, `listAllOcularOrders`, `listOcularOrdersForRep`, `updateOcularOrderStatus`
- [x] Backend controller (`backend/controllers/ocular.controller.ts`) — full RBAC (provider/rep/admin), Zod validation
- [x] Route handlers — `app/api/ocular/orders/route.ts` (GET, POST) + `app/api/ocular/orders/[id]/route.ts` (GET, PATCH)
- [x] Ocular-specific layout `app/ocular/layout.tsx` with sidebar nav (Dashboard / Product Info / New Order / Order History), teal branding, sign-out, mobile drawer
- [x] `app/ocular/dashboard/page.tsx` — 3 quick-action cards, recent orders table (last 5), pending count badge
- [x] **Product Info page** `app/ocular/product-info/page.tsx`:
  - Product overview (FastActing®, BioAware®, HydraTek® technologies)
  - Product variants: Thin (45µm) and Thick (200µm) with SKU tables
  - ICD-10 codes reference (14 codes from PRD §6.2) in 2-column layout
  - Application techniques (3 video placeholders)
  - Reimbursement guide (CPT 65778)
  - Best practices (surgical tray prep, patient selection, post-application care)
- [ ] **CMS-lite**: deferred to Phase 4 polish — content is inline for v1

> 🎯 **End of Day 10:** Ocular practice can navigate the portal and read product info.

### Day 11 — Order Form ✅
- [x] `app/ocular/orders/new/page.tsx` — single-page form (no wizard) per PRD §6.5
- [x] All fields per PRD §6.5:
  - Patient block (firstName, lastName, DOB, MRN)
  - ICD-10 searchable dropdown with type-ahead filtering (20+ codes from PRD §6.2), allows free text
  - Eye treated (Select: right / left / bilateral)
  - Product variant (Thin / Thick)
  - Disc size (filtered by variant: 8mm, 10mm, 12mm, 15mm)
  - Quantity, date needed, ship-to address, special instructions
  - Optional insurance collapsible (payer, member ID)
- [x] SKU derivation logic (`deriveSku(variant, sizeMm)` → `VS45XX` or `VS200XX`)
- [x] Client-side validation with Zod + React Hook Form
- [x] Success screen with order ID and VisiDisc SKU

> 🎯 **End of Day 11:** Order form fillable, validated, and submitting.

### Day 12 — Ocular Submission Pipeline + Order Views ✅
- [x] Submission handler — POST to `/api/ocular/orders`, controller triggers async SendGrid email
- [x] SendGrid email template (`sendOcularOrderNotification`) — teal gradient header, order details card (practice, patient, SKU, variant, size, qty, eye, diagnosis, timestamp), link to ITS Rep dashboard
- [x] Email sent to configured `ocular_submission_email` from `system_settings` + internal recipients
- [x] Insert row in `ocular_orders` with status `pending`
- [x] **Order history page** `app/ocular/orders/page.tsx` — practice-scoped table with search, status badges (pending/sent/fulfilled), link to detail, "New Order" CTA
- [x] **Order detail page** `app/ocular/orders/[id]/page.tsx` — patient info, product details (teal accent), diagnosis, shipping, insurance, metadata sections
- [x] Admin: ocular submission email field already in Settings tab from Phase 1 (`SystemSettingsTab.tsx`)
- [x] **ITS Rep/Admin dashboard tab** — `OcularOrdersTab.tsx` added to `ClinicStaffDashboardClient.tsx` with teal theme, expandable detail rows (Patient, Diagnosis & Insurance, Product & Shipping), inline status dropdown (pending → sent → fulfilled), search + filter + pagination
- [ ] PDF generation for ocular orders — deferred (simpler than medical devices, no signature required per PRD; can add in Phase 4)
- [ ] Supabase Storage upload — deferred with PDF generation

> 🎯 **End of Day 12:** End-to-end ocular submission works.

### Day 13 — Cross-Module Smoke Test & Buffer
- [ ] **Critical test:** Create a fresh ocular-only practice → verify it cannot see wound/medical-devices nav at any point
- [ ] **Critical test:** Toggle a practice from `wound_care + lymphedema` to `ocular` via admin → confirm the exclusivity warning fires + the user is correctly re-routed on next login
- [ ] Cross-browser pass (Chrome, Safari, Firefox)
- [ ] Mobile pass on landing page + both new modules
- [ ] **Buffer day** — catch up on any slipped Phase 2 or Phase 3 work before locking modules

> 🎯 **End of Day 13:** Both modules feature-complete. Lock further scope changes.

---

## 6. Phase 4 — Polish & Ship (Days 14–15)

### Day 14 — QA, Accessibility, RLS Audit, Dashboard Unification

**Cross-module dashboard integration (PRD §8): ✅**
- [x] **`AllSubmissionsTab.tsx`** — unified table in ITS Rep/Admin dashboard; fetches BV + Medical Devices + Ocular in parallel via `Promise.allSettled` (PRD §8.1)
- [x] **Type badge column**: BV = blue, Medical Devices = purple, Ocular = teal (PRD §8.1)
- [x] **Type filter dropdown** — All / Wound Care / Medical Devices / Ocular (PRD §8.2)
- [x] **Status filter** — All / Pending / Sent / Approved / Fulfilled / Rejected
- [x] **"View tab →" per-row** — switches to the relevant module tab (PRD §8.3); expandable-row detail stays in individual tabs
- [x] **Admin "All Practices" view** — existing RBAC on all three APIs returns cross-practice data for admin role; unified tab shows all (PRD §8.3)
- [x] Wired as first nav item in `ClinicStaffDashboardClient.tsx` with Layers icon; `?tab=all_submissions` URL param supported

**Quality & security:**
- [x] **RLS audit** ✅ — all 4 new tables verified: anon blocked, provider scoped to own `practice_id`, `system_settings` write-locked to admin only, `practice_tracks` provider read-only. No cross-practice leaks. App-layer controllers double-enforce via `isProviderAssignedToRep`. (Post-QA additions added `lymphedema_products` and `ocular_products` — admin-write-only; rep/provider read-only.)
- [x] **Type-check + lint** ✅ — `npm run build` passes clean; verified on commit.
- [x] **Acceptance criteria checklist** ✅ — PRD §12 walked: 21/21 confirmed. All human-test items completed in QA Run 1 & 2.
- [x] **Color contrast** ✅ — all new badges pass WCAG AA: Wound Care blue ~8.1:1, Medical Devices purple ~7.2:1, Ocular teal ~6.5:1, all status badges ≥6.4:1.
- [x] **Email deliverability test** ✅ — PASS (QA Run 1 #86, Run 2 #102): purple/teal headers, order details, HIPAA footer, inbox delivery confirmed.
- [x] **PDF visual QA** ✅ — PASS (QA Run 1 #116–119): downloads, opens in Adobe Reader, all fields pre-filled, signature line blank, no overflow.
- [x] **Accessibility pass** ✅ — PASS (QA Run 2 #126–129): full keyboard navigation through landing page, Medical Devices modal, Ocular form, ITS Rep dashboard.
- [x] **Responsive QA** ✅ — PASS (QA Run 1 #120–125): cards stack, drawers work, modals scrollable, tables scroll horizontally on 390×844.

**QA Run 1 & 2 fixes (commit 20d3a43):**
- Fixed #82: Name search not working in Medical Devices tab (ITS Rep)
- Fixed #64: ITS Rep "Edit Tracks" returning request failed
- ⚠️ PENDING #65: Direct API call test for rep → unassigned provider 403 (requires API testing tool — deferred to post-ship verification)

### Day 15 — Deploy & Hand-off
**Morning:**
- [X] Final merge to `staging` branch
- [X] Deploy preview to staging environment
- [X] Smoke test on staging with real Supabase, real SendGrid
- [X] Run RLS application script in staging: `npx ts-node scripts/applyRls.ts`
- [ ] **Client UAT window** — 2-hour block for client to click through and approve

**Afternoon:**
- [ ] Merge `staging` → `main`
- [ ] Production deploy via Vercel
- [X] Apply RLS to production DB
- [ ] Seed `system_settings` in production with confirmed email addresses
- [ ] Enable `lymphedema` track on the practice(s) the client designates for launch
- [ ] Quick-reference doc for the client: "How to enable a track for a new practice" + "How to update the submission email"
- [ ] Monitor SendGrid + Vercel logs for ~1 hour post-deploy

> 🎯 **End of Day 15:** Shipped. 🚀

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Client doesn't answer open questions by Day 4 | ~~Medium~~ **Resolved** | High | ~~Proceed with placeholders~~ Client answered all questions (PRD §16) |
| ReMarx PDF template mismatch — generated PDF needs rework | Medium | Medium | Day 8 is the latest a mismatch surfaces; use the buffer on Day 13 to redo if needed |
| Existing BV code is more tangled than expected, slowing the pattern reuse | Low | High | Day 2 audit surfaces this early; if confirmed, narrow Phase 4 polish scope, not core features |
| `@react-pdf/renderer` doesn't support a field we need (signature box, exact layout) | Low | Medium | Fallback: pre-built PDF template + pdf-lib field filling. Decide by end of Day 8 |
| Track-based routing has edge case (user logged in when admin changes tracks) | Medium | Low | On every authenticated page render, re-check enabled tracks server-side; force re-auth if mismatch |
| RLS audit reveals a leak | Low | Critical | Day 14 is the safety net. If found late, delay ship by 1 day rather than ship broken |
| Cross-module dashboard unification (Type column + filter) takes longer than expected | Medium | Medium | Scope down to admin-only unified view first; provider-side filter is lower priority |

---

## 8. Daily Operating Rhythm

Because you're busy outside this sprint, structure each working day to minimize decision overhead:

- **Start of day (15 min):** Review the day's checklist above. Don't deviate.
- **Middle of day:** Heads-down build. No context-switching to other modules.
- **End of day (15 min):** Tick completed items. If something slipped, write one line in this doc: _"Day N: <task> deferred to Day 13 buffer because <reason>."_
- **No work after 9pm** — overrun protection. If something isn't done by end of day, it's a Day 13 buffer task, full stop.

---

## 9. Definition of Done

The expansion is shipped when:

1. All 21 acceptance-criteria checkboxes in [PRD_Portal_Expansion.md §12](PRD_Portal_Expansion.md#12-acceptance-criteria) are true
2. Build passes on `main`
3. Production has been smoke-tested by the client
4. At least one real medical device and one real ocular order have been submitted end-to-end in production
5. Client has received the quick-reference admin doc (Day 15 deliverable)

---

## 10. What's Explicitly Out

To protect the 3-week window, these are **not** in this sprint (already noted in PRD §11, restated here for clarity):

- Electronic physician signatures
- Direct API integration with ReMarx or Skye
- Insurance pre-auth status tracking
- Analytics dashboards by track
- Auto-migration tool for multi-track practices (admin enables one at a time, manually)
- Full CMS UI for ocular product info (admin edits via raw markdown/JSON in v1; rich editor is a future enhancement)
- New marketing pages beyond the landing page

If any of these surface mid-sprint, log them as v2 backlog and keep moving.

---

## 11. Phase 5 — Post-QA Additions (2026-06-14 to 2026-06-16)

These items were added to the branch after QA Run 2 passed, before the final merge to `main`. They are tracked here for auditability; see `portal_finalization.md` Session 4 for full detail.

### 11.1 — Delivery Details Prefill & Required Provider Fields (commit a382b16, 2026-06-14)
- [x] `db/provider.ts` — Added `clinic_city`, `clinic_state`, `clinic_zip` columns to `provider_acct`
- [x] `backend/services/providerAcct.service.ts` — expose new clinic address fields
- [x] `backend/services/providerSignup.service.ts` — persist new fields on signup
- [x] `components/auth/signup/providers/SignupStep1ClinicDetails.tsx` — City, State, Zip now required fields in provider signup
- [x] `components/dashboard/ProductOrderModal.tsx` — delivery address/city/state/zip/date pre-populated from BV request; fields remain editable
- [x] `components/dashboard/EnhancedOrderModal.tsx` — delivery prefill updates aligned with BV request data
- [x] `components/dashboard/BVSteps/Step2PatientDelivery.tsx` — additional validation improvements
- [x] `components/dashboard/DashboardNavbar.tsx` — clinic address displayed in nav context
- [x] `app/ocular/orders/new/page.tsx` — delivery fields prefilled from practice profile
- [x] `store/auth.ts` — `clinicCity`, `clinicState`, `clinicZip` added to auth store

### 11.2 — Product Catalog Management: Lymphedema + Ocular (commit 9c331e1, 2026-06-16)
- [x] New schema tables `lymphedema_products` + `ocular_products` (pushed via `npm run db:push`)
- [x] Backend services: `lymphedemaProducts.service.ts`, `ocularProducts.service.ts` — full CRUD
- [x] Backend controllers: `lymphedemaProducts.controller.ts`, `ocularProducts.controller.ts` — admin-only write, rep/provider read
- [x] API routes: `app/api/lymphedema/products/` + `app/api/ocular/products/` (GET/POST/PATCH/DELETE)
- [x] Admin UI: `LymphedemaProductsCatalogTab.tsx` + `OcularProductsCatalogTab.tsx` — full catalog management with archive toggle
- [x] `MedicalDevicesTab.tsx` + `OcularOrdersTab.tsx` — Orders / Product Catalog pill toggle added
- [x] `LymphedemaSteps/Step2Device.tsx` — catalog product picker with manual fallback; nullable FK `lymphedema_product_id` on orders
- [x] `scripts/seedProductCatalogs.ts` — seeds initial AIROS + VisiDisc SKU data

### 11.3 — Unify Wound Care Orders + Product Catalog Tab (commit a853515, 2026-06-16)
- [x] `ClinicStaffDashboardClient.tsx` — "Product Orders" sidebar item renamed to "Wound Care Products"; Orders / Product Catalog pill toggle matches lymphedema + ocular pattern; separate "Products" sidebar item removed

### 11.4 — Unified Order Status Enum (commit 907d4cb, 2026-06-16)
- [x] `db/lymphedema-orders.ts` — status enum changed from `pending | sent | approved` to `pending | approved | shipped | completed | denied | cancelled`
- [x] `db/ocular-orders.ts` — status enum changed from `pending | sent | fulfilled` to `pending | approved | shipped | completed | denied | cancelled`
- [x] All controllers, services, and UI tabs updated to use unified enum
- [x] `scripts/migrateOrderStatuses.ts` — migration script: `sent → shipped`, `fulfilled → completed` (run before `db:push` if migrating existing data)
- [ ] **Pre-deploy:** run `npx tsx scripts/migrateOrderStatuses.ts` against staging DB before pushing schema
