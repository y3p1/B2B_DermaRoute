# Pre-Portal Expansion Changes

**Date:** 2026-06-02
**Branch:** `feat/portal-expansion`

These changes were made prior to the main Portal Expansion feature (Rep Territory / Account Assignment). They cover wound size input changes, product order prefill improvements, track renaming, and a BAA disclaimer addition.

---

## Change Set 1 — Wound Size & Delivery Address

### 1.1 BV Request Modal: Wound Size Input (Manual Only)

**Problem:** The wound size field in the BV Request modal (Step 1 — Clinical Info) offered both a dropdown (choose from list) and a manual text input via a toggle. Providers now need to explicitly enter wound size manually every time.

**Changes:**
- **`components/dashboard/BVSteps/Step1ClinicalInfo.tsx`**
  - Removed the dropdown/manual toggle buttons and the `woundSizeInputMode` state
  - Removed the `woundSizesList` state and the `useEffect` that fetched wound sizes from `/api/bv/wound-sizes`
  - Removed unused `SelectGroup` and `SelectLabel` imports
  - Replaced the entire wound size field with a single `<Input>` text field
  - Added helper text: `Enter the wound size dimensions (e.g., "4x4 cm", "16 cm² disc", "2.5 x 3 cm")`

- **`db/bv-requests.ts`**
  - Widened `woundSize` column from `varchar(32)` to `varchar(128)` to accommodate free-text entries

### 1.2 Product Order Modal: Wound Size Prefill

**Problem:** The wound size field in the Product Order modal (EnhancedOrderModal) was a dropdown Select. Since wound size is now free-text in BV requests, the dropdown would not match. It should also auto-populate from the selected BV request.

**Changes:**
- **`components/dashboard/EnhancedOrderModal.tsx`**
  - Removed `SelectGroup` and `SelectLabel` imports
  - Removed `WoundSizeOption` type and `woundSizeOptions` state
  - Removed wound sizes fetch from `fetchInitialData` (was fetching `/api/bv/wound-sizes`)
  - Replaced the wound size `<Select>` dropdown with a plain `<Input>` field
  - Wound size value is auto-populated from the selected BV request via `handleBvSelect` (already wired, now displays correctly as text input)

### 1.3 Product Order Modal: Delivery Address Prefill

**Problem:** The Product Order modal's delivery address fields (street, city, state, zip) had to be entered from scratch. Providers already enter delivery information in the BV Request, so these should carry over.

**Database Changes:**
- **`db/bv-requests.ts`** — Added 4 new nullable columns to `bv_requests`:
  - `delivery_address` — `varchar(256)`
  - `delivery_city` — `varchar(128)`
  - `delivery_state` — `varchar(2)`
  - `delivery_zip` — `varchar(10)`
- Schema pushed to Supabase via `npm run db:push-only`

**Frontend Changes:**
- **`components/dashboard/BVSteps/Step2PatientDelivery.tsx`**
  - Added `deliveryAddress`, `deliveryCity`, `deliveryState`, `deliveryZip` to the Zod schema (`patientDeliverySchema`) — all required with validation
  - Added 4 new form fields: Street Address, City, State (2-char, auto-uppercased), Zip Code (max 10 chars)
  - Fields appear between the date fields and the instructions textarea

- **`components/dashboard/BVSteps/Step3Recommendation.tsx`**
  - Added `deliveryAddress`, `deliveryCity`, `deliveryState`, `deliveryZip` to the submission payload sent to the API

- **`components/dashboard/EnhancedOrderModal.tsx`**
  - Added `deliveryAddress`, `deliveryCity`, `deliveryState`, `deliveryZip` to the `BvRequest` type
  - Updated `handleBvSelect` to prefill all 4 delivery address fields from the selected BV request
  - Delivery fields on Step 2 of the order modal are now pre-populated but remain editable

**Backend Changes:**
- **`backend/services/bvRequests.service.ts`**
  - Added `deliveryAddress`, `deliveryCity`, `deliveryState`, `deliveryZip` to `createBvRequestSchema` (all `z.string().optional()`)
  - Added the 4 fields to `createBvRequest()` insert values
  - Added the 4 fields to `updateBvRequest()` set values
  - Added the 4 fields to all 4 query functions' select clauses:
    - `listBvRequestsForProvider()`
    - `listAllBvRequests()`
    - `getBvRequestForProvider()`
    - `getBvRequestById()`

---

## Change Set 2 — Track / Section Renaming

**Problem:** The 3 service tracks needed updated user-facing labels to match the current business naming.

| DB Key | Old Label | New Label |
|--------|-----------|-----------|
| `wound_care` | Wound Care | Tissue Products & PRP (Biologics) |
| `ocular` | Ocular Products | Ocular Products *(unchanged)* |
| `lymphedema` | Lymphedema | Medical Devices / Equipment |

**Note:** Only display labels were changed. The DB enum keys (`wound_care`, `lymphedema`, `ocular`) and all internal logic remain unchanged.

**Files Modified:**
- **`components/landing/LandingPage.tsx`**
  - Updated card titles, subtitles, and reordered cards: Tissue Products, Ocular, Medical Devices
  - Subtitle for Medical Devices: "AIROS Compression Pump & Garment Ordering"

- **`components/clinic-staff/PracticeTracksTab.tsx`**
  - Updated `TRACK_LABELS` map with new display names
  - Updated the ocular exclusivity confirmation dialog text

- **`components/dashboard/ProviderDashboardClient.tsx`**
  - Changed nav tab label from "Lymphedema Orders" to "Medical Devices / Equipment"

- **`components/clinic-staff/SystemSettingsTab.tsx`**
  - Changed settings label from "Lymphedema Order Submission Email" to "Medical Devices / Equipment Order Submission Email"

- **`app/page.tsx`**
  - Updated page metadata description to use new track names

---

## Change Set 3 — BAA Vendor Disclaimer

**Problem:** The BAA signing flow during provider signup only covers Integrity Tissue Solutions. Some vendors/manufacturers may require their own separate BAA. Providers need to be informed of this before completing the BAA sign-in.

**Changes:**
- **`components/auth/signup/providers/agreement/AgreementPage6.tsx`**
  - Added `disclaimerAcknowledged` boolean state (default `false`)
  - Added an amber-styled disclaimer box between the info note and the action buttons containing:
    - Bold title: "Important Notice Regarding Business Associate Agreements (BAA)"
    - Two paragraphs explaining the BAA is with Integrity Tissue Solutions only and that vendors may require separate BAAs
    - A checkbox: "I understand and wish to proceed"
  - The "Agree and Continue" button is now disabled until **both** form validation passes **and** the disclaimer checkbox is checked
  - No backend changes — this is a UI-only disclaimer acknowledgment

---

## Files Modified Summary

| File | Change Set | Type |
|------|-----------|------|
| `db/bv-requests.ts` | 1 | Schema — new columns + widened woundSize |
| `backend/services/bvRequests.service.ts` | 1 | Backend — Zod schema, CRUD, queries |
| `components/dashboard/BVSteps/Step1ClinicalInfo.tsx` | 1 | Frontend — wound size input |
| `components/dashboard/BVSteps/Step2PatientDelivery.tsx` | 1 | Frontend — address fields |
| `components/dashboard/BVSteps/Step3Recommendation.tsx` | 1 | Frontend — submission payload |
| `components/dashboard/EnhancedOrderModal.tsx` | 1 | Frontend — prefill + wound size input |
| `components/landing/LandingPage.tsx` | 2 | Frontend — track labels |
| `components/clinic-staff/PracticeTracksTab.tsx` | 2 | Frontend — track labels |
| `components/dashboard/ProviderDashboardClient.tsx` | 2 | Frontend — nav tab label |
| `components/clinic-staff/SystemSettingsTab.tsx` | 2 | Frontend — settings label |
| `app/page.tsx` | 2 | Metadata — page description |
| `components/auth/signup/providers/agreement/AgreementPage6.tsx` | 3 | Frontend — BAA disclaimer |

---

## Test Results

- **Build:** Clean (`npm run build` passes)
- **Lint:** No new errors (10 pre-existing errors in unrelated script files)
- **Unit/Integration Tests:** 24 pass, 5 fail, 7 skipped — all 5 failures are **pre-existing** (verified by testing the original code before changes). Failures are in `me-and-bv.test.ts` (missing mocks for email notification functions) and `clinicStaffSignup.test.ts` (outdated expected message string).
- **DB Schema:** Pushed to Supabase successfully via `npm run db:push-only`

---

## Change Set 4 — Rep Territory / Account Assignment (IN PROGRESS)

**Date started:** 2026-06-03
**Branch:** `feat/portal-expansion`
**Status:** Phase 3 implementation — core security fixes done, build passes. Remaining items listed below.

### Problem

All ITS Representatives (clinic staff) can view every provider's orders, BV requests, notifications, and account activity. Reps are territorial — they should only see data belonging to providers assigned to them.

### Architecture Findings (Phase 1)

- `provider_acct.assigned_rep_id` FK to `clinic_staff_acct(id)` **already exists** — no schema/migration needed
- **List-level filtering already works** for BV requests (`listBvRequestsForRep`), orders (`listOrderProductsForRep`), providers (`listProvidersForRep`)
- **Notification routing already correct** — `getNotificationRecipientsForProvider()` sends to assigned rep + all admins only
- Admin assignment/reassignment UI already exists in `ProviderAccountsTab.tsx` (admin-only dropdown)

### Critical Security Gaps Fixed

All by-ID endpoints lacked rep ownership validation — a clinic staff member could fetch/modify ANY record by guessing the UUID.

### Changes Made

#### 4.1 — Rep Ownership Helper (`backend/services/providerAdmin.service.ts`)

Added two new functions:
- `isProviderAssignedToRep(providerId, repId)` — single-query boolean check
- `getAssignedProviderIds(repId)` — returns all provider IDs assigned to a rep

#### 4.2 — BV Request by-ID Security (`app/api/bv-requests/[id]/route.ts`)

**GET handler:** Split the `if (admin || clinicStaff)` block into separate branches. Clinic staff now must pass `isProviderAssignedToRep()` check before seeing a BV request by ID.

#### 4.3 — BV Verify Security (`app/api/bv-requests/[id]/verify/route.ts`)

**PATCH handler:** Added `isProviderAssignedToRep()` check after fetching BV request. Clinic staff can only verify BV requests for their assigned providers.

#### 4.4 — BV Proof Verify Security (`app/api/bv-requests/[id]/proof/verify/route.ts`)

**PATCH handler:** Added `isProviderAssignedToRep()` check. Clinic staff can only verify proofs for their assigned providers.

#### 4.5 — Product Orders Security (`backend/controllers/productOrders.controller.ts`)

Added `isProviderAssignedToRep()` checks to all four controller functions:
- `getOrderProductController` — GET by ID
- `updateOrderProductController` — PATCH by ID (status, notes)
- `deleteOrderProductController` — DELETE by ID
- `createOrderProductController` — POST (clinic staff can only create orders for BV requests belonging to their assigned providers)

#### 4.6 — Healing Tracker Filtering (`backend/services/healingTracker.service.ts` + `backend/controllers/healingTracker.controller.ts`)

**Service changes:**
- `getWoundCases(repId?)` — optional `repId` param adds `WHERE provider_acct.assigned_rep_id = repId`; changed `leftJoin` to `innerJoin` on `providerAcct`
- `listApprovedBvOptions(repId?)` — same pattern

**Controller changes:**
- `listWoundCasesController` — passes `actor.id` as repId when actor is clinic_staff
- `recordMeasurementController` — checks `isProviderAssignedToRep()` before recording
- `measurementHistoryController` — checks `isProviderAssignedToRep()` before returning history
- `alternativeProductsController` — checks `isProviderAssignedToRep()` before returning alternatives

#### 4.7 — Reorder Tracking Filtering (`backend/services/reorderTracking.service.ts` + `backend/controllers/reorderTracking.controller.ts`)

**Service:** `getReorderTrackingData(repId?)` — optional `repId` adds `WHERE provider_acct.assigned_rep_id = repId`; changed `leftJoin` to `innerJoin` on `providerAcct` when repId is set.

**Controller:** `listReorderTrackingController` — reads `res.locals.clinicStaffAcctId` (set by `requireAdminOrClinicStaff` middleware) and passes it as repId.

#### 4.8 — ProviderAccountsTab JSX Fix (`components/clinic-staff/ProviderAccountsTab.tsx`)

Fixed pre-existing "Unterminated regexp literal" build error. The `{isAdmin && <td>...</td>}` expression was missing parentheses — changed to `{isAdmin && (<td>...</td>)}`.

### Files Modified

| File | Change | Type |
|------|--------|------|
| `backend/services/providerAdmin.service.ts` | Added `isProviderAssignedToRep()` + `getAssignedProviderIds()` | Backend — helper |
| `app/api/bv-requests/[id]/route.ts` | Rep ownership check on GET | Backend — security |
| `app/api/bv-requests/[id]/verify/route.ts` | Rep ownership check on PATCH | Backend — security |
| `app/api/bv-requests/[id]/proof/verify/route.ts` | Rep ownership check on PATCH | Backend — security |
| `backend/controllers/productOrders.controller.ts` | Rep ownership checks on GET/POST/PATCH/DELETE | Backend — security |
| `backend/services/healingTracker.service.ts` | Rep-scoped `getWoundCases()` + `listApprovedBvOptions()` | Backend — filtering |
| `backend/controllers/healingTracker.controller.ts` | Rep checks on list/record/history/alternatives | Backend — security |
| `backend/services/reorderTracking.service.ts` | Rep-scoped `getReorderTrackingData()` | Backend — filtering |
| `backend/controllers/reorderTracking.controller.ts` | Pass repId from middleware locals | Backend — filtering |
| `components/clinic-staff/ProviderAccountsTab.tsx` | JSX syntax fix (pre-existing) | Frontend — bugfix |

### Authorization Rules (Implemented)

| Resource | Admin | Clinic Staff (Rep) | Provider |
|----------|-------|---------------------|----------|
| Provider list | All | Assigned only | Own profile |
| BV requests (list) | All | Assigned providers' only | Own only |
| BV requests (by ID) | Any | Assigned providers' only | Own only |
| BV verify/proof verify | Any | Assigned providers' only | N/A |
| Orders (list) | All | Assigned providers' only | Own only |
| Orders (by ID / CRUD) | Any | Assigned providers' only | Own only |
| Healing tracker (list) | All wound cases | Assigned providers' only | N/A |
| Healing tracker (record/history) | Any | Assigned providers' only | N/A |
| Reorder tracking | All | Assigned providers' only | N/A |
| Notifications (email) | Always receives | Only for assigned providers | Own events |
| Reference data (products, insurances, etc.) | All | All (shared config) | N/A |

#### 4.9 — BAA Providers Rep Filtering (`backend/controllers/baaProvidersAdmin.controller.ts` + `backend/services/baaProviderAdmin.service.ts`)

**Service:** Added `listBaaProvidersForRep(repId)` — queries BAAs only for providers assigned to the rep. Added `listProvidersWithoutBaaForRep(repId)` — same filter for the "providers without BAA" dropdown.

**Controller changes:**
- `listBaaProvidersAdminController` — clinic staff now gets `listBaaProvidersForRep()` instead of `listBaaProvidersForAdmin()`
- `getBaaProviderAdminController` — clinic staff must pass `isProviderAssignedToRep()` to view a BAA by ID
- `updateBaaProviderAdminController` — clinic staff must pass ownership check before signing
- `uploadBaaDocumentController` — clinic staff must pass ownership check before uploading
- `createManualBaaController` — clinic staff can only create BAAs for assigned providers
- `listProvidersWithoutBaaController` — clinic staff gets `listProvidersWithoutBaaForRep()` instead of full list

#### 4.10 — Practice Tracks Rep Filtering (`backend/controllers/practiceTracks.controller.ts` + `backend/services/tracks.service.ts`)

**Service:** Added `getTracksForRepProviders(repId)` — returns track map filtered to assigned providers only.

**Controller changes:**
- `getAllPracticeTracksController` — clinic staff gets `getTracksForRepProviders()` instead of `getTracksForAllProviders()`
- `getProviderTracksController` — clinic staff must pass `isProviderAssignedToRep()` to view a specific provider's tracks
- `updateProviderTracksController` — clinic staff must pass ownership check before updating tracks

### Additional Files Modified

| File | Change | Type |
|------|--------|------|
| `backend/controllers/baaProvidersAdmin.controller.ts` | Rep ownership checks on all BAA endpoints | Backend — security |
| `backend/services/baaProviderAdmin.service.ts` | Added `listBaaProvidersForRep()` + `listProvidersWithoutBaaForRep()` | Backend — filtering |
| `backend/controllers/practiceTracks.controller.ts` | Rep ownership checks on tracks endpoints | Backend — security |
| `backend/services/tracks.service.ts` | Added `getTracksForRepProviders()` | Backend — filtering |

### Updated Authorization Rules

| Resource | Admin | Clinic Staff (Rep) | Provider |
|----------|-------|---------------------|----------|
| Provider list | All | Assigned only | Own profile |
| BV requests (list) | All | Assigned providers' only | Own only |
| BV requests (by ID) | Any | Assigned providers' only | Own only |
| BV verify/proof verify | Any | Assigned providers' only | N/A |
| Orders (list) | All | Assigned providers' only | Own only |
| Orders (by ID / CRUD) | Any | Assigned providers' only | Own only |
| Healing tracker (list) | All wound cases | Assigned providers' only | N/A |
| Healing tracker (record/history) | Any | Assigned providers' only | N/A |
| Reorder tracking | All | Assigned providers' only | N/A |
| BAA list | All | Assigned providers' only | Own only |
| BAA by ID / sign / upload | Any | Assigned providers' only | Own only |
| BAA create manual | Any provider | Assigned providers only | Own only |
| Practice tracks (all) | All | Assigned providers' only | Own tracks |
| Practice tracks (by provider) | Any | Assigned providers' only | N/A |
| Practice tracks (update) | Any | Assigned providers' only | N/A |
| Notifications (email) | Always receives | Only for assigned providers | Own events |
| Reference data (products, insurances, etc.) | All | All (shared config) | N/A |

### Remaining Work (TODO)

1. ~~**BAA providers endpoint** — DONE~~
2. ~~**Practice tracks endpoint** — DONE~~
3. **Analytics endpoints** (`/api/analytics/outcomes`, `/api/analytics/success-rate`, `/api/risk-scoring`) — currently admin-only (`requireAdmin`). If clinic staff access is added later, needs rep filtering.
4. **Audit logs** (`/api/audit-logs`) — currently admin-only. If clinic staff access is added, needs rep filtering.
5. **Integration tests** — write tests for:
   - Rep can access assigned provider's BV/order by ID → 200
   - Rep cannot access unassigned provider's BV/order by ID → 403
   - Rep cannot verify/proof-verify unassigned provider's BV → 403
   - Rep cannot create order for unassigned provider's BV → 403
   - Admin can access everything → 200
   - Reassignment: after admin reassigns provider, old rep loses access, new rep gains access
6. **QA smoke test** — manual browser testing of rep dashboard with assigned vs unassigned providers
7. **Build verification** — ✅ confirmed all changes compile clean

---

## Change Set 5 — Delivery Details Prefill Extension & Required Provider Address Fields

**Date:** 2026-06-14
**Commit:** a382b16
**Branch:** `feat/portal-expansion`

### Problem

Provider account profiles only stored `clinic_address` (free text). No city/state/zip were captured at signup, so delivery address prefill in BV requests and product orders was incomplete. Additionally, `ProductOrderModal` (wound care product orders) was not pre-populating delivery fields from the linked BV request.

### Database Changes

- **`db/provider.ts`** — Added 3 nullable columns to `provider_acct`:
  - `clinic_city` — `text`
  - `clinic_state` — `text`
  - `clinic_zip` — `text`

### Backend Changes

- **`backend/services/providerAcct.service.ts`** — `clinicCity`, `clinicState`, `clinicZip` added to provider profile queries and update functions
- **`backend/services/providerSignup.service.ts`** — New fields persisted on initial provider signup

### Frontend Changes

- **`components/auth/signup/providers/SignupStep1ClinicDetails.tsx`**
  - City, State, and Zip Code now required fields in provider signup (previously missing)
  - Auto-uppercase on State field; Zip limited to 10 chars

- **`components/dashboard/ProductOrderModal.tsx`**
  - Added state for `deliveryAddress`, `deliveryCity`, `deliveryState`, `deliveryZip`, `deliveryDate`, `contactPhone`
  - `handleBvSelect` now pre-fills all 6 delivery fields from the linked BV request
  - Fields reset on modal close

- **`components/dashboard/EnhancedOrderModal.tsx`**
  - Aligned delivery prefill logic with ProductOrderModal — BV request delivery fields auto-populate on BV selection

- **`components/dashboard/BVSteps/Step2PatientDelivery.tsx`**
  - Additional client-side validation alignment

- **`components/dashboard/BvModal.tsx`**
  - Minor delivery field integration

- **`components/dashboard/DashboardNavbar.tsx`**
  - Clinic city/state/zip surfaced from auth store for display context

- **`app/ocular/orders/new/page.tsx`**
  - Ship-to address pre-populated from provider profile (clinicAddress + clinicCity + clinicState + clinicZip); fields remain editable

- **`store/auth.ts`**
  - `clinicCity`, `clinicState`, `clinicZip` added to Zustand auth store; populated from `/api/me` response

### Files Modified Summary

| File | Type |
|------|------|
| `db/provider.ts` | Schema — 3 new columns |
| `backend/services/providerAcct.service.ts` | Backend — queries + updates |
| `backend/services/providerSignup.service.ts` | Backend — signup persistence |
| `components/auth/signup/providers/SignupStep1ClinicDetails.tsx` | Frontend — required fields |
| `components/dashboard/ProductOrderModal.tsx` | Frontend — delivery prefill |
| `components/dashboard/EnhancedOrderModal.tsx` | Frontend — delivery prefill |
| `components/dashboard/BVSteps/Step2PatientDelivery.tsx` | Frontend — validation |
| `components/dashboard/BvModal.tsx` | Frontend — delivery integration |
| `components/dashboard/DashboardNavbar.tsx` | Frontend — clinic address display |
| `app/ocular/orders/new/page.tsx` | Frontend — ship-to prefill |
| `store/auth.ts` | State — new clinic address fields |

### Build & Test

- **Build:** Clean (`npm run build` passes)
- **Tests:** `backend/__tests__/providerSignup.test.ts` updated to cover new required fields; passes
