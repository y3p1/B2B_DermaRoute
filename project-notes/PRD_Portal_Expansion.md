# Integrity Tissue Solutions — Portal Expansion PRD

**Portal:** integritytissue.com Provider Portal
**Feature Set:** Public Landing Page + Lymphedema Module + Ocular Products Module + Track-Based Access Control
**Version:** 1.0
**Date:** May 2026
**Prepared by:** Integrity Tissue Solutions
**Builds on:** [PRD v2.0 — Core Platform](PRD.md)

---

## 1. Overview

Integrity Tissue Solutions is expanding the provider portal from a single-track wound care platform into a **multi-track service marketplace** spanning three product lines:

1. **Wound Care** — existing Benefits Verification (BV) + product ordering workflow
2. **Lymphedema Compression** — new AIROS pump & garment ordering workflow (partnered with ReMarx Medical Services)
3. **Ocular Products** — new VisiDisc amniotic membrane allograft ordering workflow (partnered with Skye Biologics)

Each module has its own clinical criteria, ordering flow, fulfillment partner, and submission email. To accommodate practices that operate in different specialties, the portal moves to a **track-based access control model**: each practice is enabled for one or more tracks by the system admin, and only the enabled modules appear in that practice's portal after login.

This PRD covers three deliverables:

| # | Deliverable | Status |
| --- | --- | --- |
| 1 | Public landing page showcasing all three service lines (pre-login) | New |
| 2 | Lymphedema Pump & Garment ordering module | New |
| 3 | Ocular Products (VisiDisc) ordering module | New |

Cross-cutting infrastructure work:
- Practice-level track entitlements (admin-managed)
- Post-login routing based on enabled tracks
- Two new admin-configurable submission email settings
- Submission type discriminator on the dashboard

---

## 2. User Roles (Unchanged)

| Role | Code identifier | Client-facing label |
| --- | --- | --- |
| Provider / Clinic | `provider`, `clinic_staff` | ITS Representative |
| System Admin | `admin` | Admin |

> No new roles. Module visibility is governed by **practice-level track entitlements**, not by user role.

---

## 3. Architecture: Track-Based Access Control

### 3.1 Track Definitions

| Track key | Display name | Default submission email | Can coexist with |
| --- | --- | --- | --- |
| `wound_care` | Wound Care | _(existing — uses existing admin notification flow)_ | `lymphedema` |
| `lymphedema` | Lymphedema | `Lb@centralpalmsmedical.com` | `wound_care` |
| `ocular` | Ocular Products | _(TBD — admin-configurable on launch)_ | **none — always standalone** |

> ⚠️ **Ocular is mutually exclusive.** A practice enabled for `ocular` cannot also be enabled for `wound_care` or `lymphedema`, and vice versa. The admin UI must enforce this at the form level.

### 3.2 Entitlement Storage

New table: `practice_tracks`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `practice_id` | uuid | FK → `practice` (or whichever entity represents a practice/account group) |
| `track` | enum(`wound_care`, `lymphedema`, `ocular`) | |
| `enabled` | boolean | default `true` |
| `enabled_at` | timestamp | |
| `enabled_by` | uuid | FK → `admin_acct` |

> Alternative implementation: a `tracks` JSONB column on the existing practice/account row. Pick whichever fits cleanest with current schema; the behavior is what matters.

### 3.3 Routing Logic After Login

```
On successful login:
  tracks ← practice_tracks for user's practice where enabled = true

  if tracks contains 'ocular':
    redirect → /ocular/dashboard
  elif tracks contains 'wound_care' or 'lymphedema':
    redirect → /dashboard (existing provider/clinic-staff dashboard,
                          with nav items filtered by enabled tracks)
  else:
    show "Your practice has no active tracks. Contact your administrator." page
```

### 3.4 Navigation Visibility

The top nav bar conditionally renders module entry points based on enabled tracks:

| Nav button | Visible when track enabled |
| --- | --- |
| Dashboard | always |
| New BV | `wound_care` |
| Order | `wound_care` |
| Lymphedema | `lymphedema` |
| Manage | always |
| All Practices | admin only |

Ocular practices never see the wound/lymphedema nav. They see a dedicated ocular nav (see §6.3).

---

## 4. Public Landing Page (Pre-Login)

### 4.1 Purpose

When a visitor lands on `integritytissue.com` (root URL), they should see a marketing-style landing page introducing the three service lines before being asked to log in. This replaces the current behavior of redirecting straight to `/auth`.

### 4.2 Page Structure

```
┌─────────────────────────────────────────────────────────┐
│  [ITS Logo]                                  [Sign In]  │  ← Top bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│         Integrity Tissue Solutions                      │
│   Provider portal for advanced tissue therapies         │
│                                                         │
│                 [ Sign In to Portal ]                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                  Our Service Lines                      │
│                                                         │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│   │   [icon]     │  │   [icon]     │  │   [icon]     │ │
│   │              │  │              │  │              │ │
│   │ Wound Care   │  │ Lymphedema   │  │ Ocular       │ │
│   │              │  │ Pumps        │  │ Products     │ │
│   │              │  │              │  │              │ │
│   │ Benefits     │  │ AIROS        │  │ VisiDisc     │ │
│   │ Verification │  │ compression  │  │ amniotic     │ │
│   │ + ordering   │  │ devices &    │  │ membrane     │ │
│   │ for advanced │  │ garments     │  │ allografts   │ │
│   │ wound        │  │ for          │  │ for corneal  │ │
│   │ products.    │  │ qualifying   │  │ & ocular     │ │
│   │              │  │ patients.    │  │ surface      │ │
│   │              │  │              │  │ care.        │ │
│   │ [Learn more] │  │ [Learn more] │  │ [Learn more] │ │
│   └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Footer — contact info, address, BAA notice            │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Requirements

- **Public** — no auth required to view
- **Hero section** — ITS branding, tagline, primary "Sign In to Portal" CTA
- **Three service cards** — equal-weight presentation; each card has icon, title, 1-2 sentence description, "Learn more" anchor (scrolls to module section or links to a marketing detail panel below)
- **Sign-in CTA** — repeated in top bar and hero
- **Responsive** — stacks vertically on mobile
- **No authenticated data leaked** — page renders identically for logged-out and logged-in visitors (logged-in users still see the landing if they navigate to `/`, with a "Go to Dashboard" link replacing "Sign In")

### 4.4 Routing

| Route | Behavior |
| --- | --- |
| `/` | Public landing page |
| `/auth` | Existing OTP sign-in flow |
| `/admin/signin` | Existing admin sign-in |
| Post-login redirect | Per track-based routing logic in §3.3 |

---

## 5. Module: Lymphedema Pump & Garment Ordering

### 5.1 Scope

A complete, standalone ordering workflow for AIROS Medical compression pumps and compression garments. Orders are emailed to a designated contact (default: `Lb@centralpalmsmedical.com`) who forwards to ReMarx Medical Services for fulfillment.

### 5.2 Products

**Compression Pumps**

| Device | HCPCS Code | Insurance Coverage |
| --- | --- | --- |
| AIROS 6 | E0651 | Medicare Part B and some Medicare Advantage plans |
| AIROS 8 | E0652 | PPO and Medicare Advantage plans |
| AIROS 6P | E0651 | Medicare Part B — required for truncal/pants garments and larger leg sizes |

> ℹ️ Insurance processing can take up to 4 weeks. The order confirmation screen and the office's customer-facing copy should set this expectation.

**Compression Garments** — selectable standalone or alongside a pump order. Selection captured during Step 2 of the order flow.

### 5.3 Navigation

Add a **Lymphedema** button to the top nav bar between Order and Manage:

```
Dashboard | New BV | Order | Lymphedema | Manage | All Practices
```

- Visible only when the practice has the `lymphedema` track enabled
- Uses a wave or activity icon from `lucide-react` (e.g., `Activity`, `Waves`)
- Follows existing active/inactive nav styling

### 5.4 Ordering Flow — 3 Steps

#### Step 1 of 3 — Insurance, Demographics & Clinical Eligibility

Captures everything needed to verify Medicare coverage of a compression device.

| Field | Input Type | Notes |
| --- | --- | --- |
| Ordering Provider | Dropdown | From the practice's existing provider list |
| Place of Service | Dropdown | POS 11 Office, POS 12 Home, POS 32 SNF, etc. |
| Insurance | Dropdown | Medicare (Standard), Medicare Advantage, Commercial |
| Patient Diagnosis | Checkboxes | I89.0 Lymphedema (**required**); Q82.0 Hereditary; I97.2 Post-mastectomy |
| 4+ weeks conservative therapy tried? | Yes / No | **Eligibility gate** — blocks if No |
| Skin changes present | Multi-select | Hyperpigmentation, Hyperplasia, Elephantiasis, Lymphorrhea, Papillomas |
| Affected extremity | Multi-select | Left Leg, Right Leg, Bilateral, Left Arm, Right Arm |
| Limb measurements (cm) | Number fields | Ankle / Calf / Knee / Thigh — shown conditionally based on selected extremity |

Plus standard patient demographics (name, DOB, address, MRN, etc.) — match the field set used by the existing BV flow.

> ⚠️ **Eligibility Gate:** If "4+ weeks conservative therapy" = No, block progression to Step 2 and show a warning. Additionally, **at least one skin change must be selected** before the user can continue.

#### Step 2 of 3 — Device & Garment Selection

**Device auto-recommendation logic** (staff can override):

| Clinical Scenario | Recommended Device | HCPCS |
| --- | --- | --- |
| Lower extremity, standard sizing | AIROS 6 | E0651 |
| PPO or Advantage plan, upper extremity, or per-chamber calibrated pressure needed | AIROS 8 | E0652 |
| Truncal / pants garment required | AIROS 6P | E0651 |
| Upper extremity + peristaltic mode needed | AIROS 6P | E0651 |

**Garment fields — Lower Extremity:**
- Stocking type: Below Knee / Thigh / Pantyhose
- Garment style: Foot / Calf / Knee / Thigh / Full Leg / Full Leg with Foot

**Garment fields — Upper Extremity:**
- Gloves/Sleeves: Gauntlet / Glove / Glove Sleeve Combo / Arm Sleeve
- Compression Wraps: Hand Velcro Wrap / Arm Wrap
- Garments: Glove / Fingertips to Axilla / Wrist to Axilla

**Garment requirements:**
- Compression Level: CL1 (20–30 mmHg) / CLII (30–40 mmHg) / CLIII (40–50 mmHg)
- Quantity per extremity: 1 / 2 / 3 _(Medicare covers 3 per extremity every 6 months)_
- Custom Made Garment: Yes / No
- Manufacturer preference: Medi USA / BSN Jobst/Farrow / L&R / Juzo / Sigvaris / No Preference

**Treatment protocol:**
- Distal pressure (mmHg): 65 / 60 / 55 / 50 / 45 / 40 / 35 / 30 / Other
- Times per day: 1 / 2 / 3
- Minutes per session: 15 / 30 / 45 / 60

#### Step 3 of 3 — Review & Submit

Summary of all entered data with two actions:

1. **Download Order Form** — pre-filled PDF matching the ReMarx Standard Written Order (use `ReMarx_Prescription.pdf` as the field layout reference), ready for physician signature
2. **Submit Order** — emails the completed order to the configured submission email (see §7)

Submission is logged with status lifecycle: `pending → sent → approved`

### 5.5 Data Model

New table: `lymphedema_orders`

```ts
{
  id: uuid,
  practice_id: uuid,
  submitted_by: uuid,         // user id
  ordering_provider_id: uuid,
  patient: {                  // jsonb or separate columns
    first_name, last_name, dob, mrn,
    address, city, state, zip,
    phone, email
  },
  insurance: 'medicare' | 'medicare_advantage' | 'commercial',
  place_of_service: text,
  diagnosis: text[],          // ['i89.0', 'q82.0', 'i97.2']
  conservative_therapy_completed: boolean,
  skin_changes: text[],
  extremity: text[],          // ['Left Leg', 'Right Leg', 'Bilateral', ...]
  measurements: jsonb,        // { ankle, calf, knee, thigh } in cm
  device: 'AIROS 6' | 'AIROS 8' | 'AIROS 6P',
  hcpcs: 'E0651' | 'E0652',
  device_recommended: boolean,    // false if staff overrode
  garment_type: text,
  garment_style: text,
  compression_level: 'CL1' | 'CLII' | 'CLIII',
  quantity: 1 | 2 | 3,
  custom_made: boolean,
  manufacturer_preference: text,
  distal_pressure_mmhg: integer,
  times_per_day: integer,
  minutes_per_session: integer,
  pdf_url: text,              // Supabase Storage path
  status: 'pending' | 'approved' | 'shipped' | 'completed' | 'denied' | 'cancelled',
  submission_email_used: text,
  submitted_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp
}
```

> **Status enum updated (post-QA, commit 907d4cb):** Original PRD specified `pending | sent | approved`. Unified with wound care product order statuses: `pending | approved | shipped | completed | denied | cancelled`. Migration script `scripts/migrateOrderStatuses.ts` remaps `sent → shipped`.

> **Product FK (post-QA, commit 9c331e1):** `lymphedema_orders` has nullable FK `lymphedema_product_id → lymphedema_products(id)` for catalog traceability when an order is placed via the catalog picker.

---

## 6. Module: Ocular Products (VisiDisc)

### 6.1 Scope

A dedicated workflow for ophthalmology practices ordering Skye Biologics **VisiDisc** amniotic membrane allografts. Because this is a different clinical specialty, practices with the `ocular` track see **only** the ocular module — no wound care or lymphedema navigation.

VisiDisc is a room-temperature amniotic membrane allograft used in-clinic for corneal and ocular surface conditions including persistent epithelial defects, recurrent corneal erosion, neurotrophic keratitis, dry eye, chemical/thermal burns, and pre-operative ocular surface optimization.

### 6.2 Product Catalog

**VisiDisc product line** (8 SKUs):

| SKU | Variant | Size |
| --- | --- | --- |
| VS4508 | Thin | 8 mm disc |
| VS4510 | Thin | 10 mm disc |
| VS4512 | Thin | 12 mm disc |
| VS4515 | Thin | 15 mm disc |
| VS20008 | Thick | 8 mm disc |
| VS20010 | Thick | 10 mm disc |
| VS20012 | Thick | 12 mm disc |
| VS20015 | Thick | 15 mm disc |

**Common ICD-10 diagnosis codes** (CPT 65778 — Placement of amniotic membrane on the ocular surface; without sutures):

Reference list (admin-editable, seeded from `SkyeOcularCodes.pdf` and `Common ICD-10 Billing Codes.pdf`):
- H04.131–H04.139 — Lacrimal cyst
- H10.021–H10.029 — Mucopurulent conjunctivitis
- H16.011–H16.013 — Central corneal ulcer
- H16.121–H16.129 — Filamentary keratitis
- H16.211–H16.219 — Exposure keratoconjunctivitis
- H16.231–H16.239 — Neurotrophic keratoconjunctivitis
- H16.8 — Other keratitis
- H18.10 / H18.13 — Bullous keratopathy
- H18.421–H18.429 — Band keratopathy
- H18.52 — Epithelial (Juvenile) corneal dystrophy
- H18.831–H18.839 — Recurrent erosion of cornea
- H18.899 — Other specified disorders of cornea (persistent epithelial defect)
- L51.1 — Stevens-Johnson syndrome
- T26.10XA/D/S, T26.11XA/D/S, T26.12XA/D/S — Burn of cornea and conjunctival sac

### 6.3 Navigation (Ocular Track Only)

When a practice has only `ocular` enabled, the nav becomes:

```
Dashboard | Product Info | New Order | Order History
```

The "Dashboard" lands on `/ocular/dashboard` — an ocular-themed summary view (recent orders, quick "New Order" CTA, education link).

### 6.4 Product Info / Education Section

A dedicated, content-driven page at `/ocular/product-info` containing:

- **VisiDisc overview** — what it is, how it works, FastActing® / BioAware® / HydraTek® background
- **Variants** — Thin (45μm) vs Thick (200μm), available sizes
- **Indications** — common conditions list (from §6.2 ICD reference)
- **Application techniques** — embed or link to Skye's videos:
  - Bandage Contact Lens Technique
  - Application with Speculum
  - Bandage Contact Lens Technique 2
- **Reimbursement guide** — CPT 65778, reimbursement ranges by payer type
- **Best practices** — surgical tray prep, patient selection, post-application care (from `Best Practices Amniotic Membranes.pdf`)
- **Downloadable resources** — product brochure, patient brochure, ICD-10 reference sheet, HydraTek quality doc

Content is **CMS-style editable** by system admins (similar to existing BV Forms management) — no code change required to update text, links, or attached PDFs.

### 6.5 Order Request Form

Single-page form (no multi-step wizard — much simpler than wound/lymphedema):

| Field | Input Type | Notes |
| --- | --- | --- |
| Ordering Provider | Dropdown | From practice's provider list |
| Patient first name | Text | |
| Patient last name | Text | |
| Patient DOB | Date | |
| Patient MRN | Text | Optional |
| Primary diagnosis (ICD-10) | Searchable dropdown | Seeded with VisiDisc-relevant codes (§6.2); free-text fallback |
| Secondary diagnosis | Searchable dropdown | Optional |
| Eye treated | Radio | Right / Left / Bilateral |
| Product variant | Radio | Thin / Thick |
| Disc size | Radio | 8mm / 10mm / 12mm / 15mm (filtered by variant availability) |
| Quantity | Number | 1–20+ (informs shipping box size) |
| Date needed by | Date | |
| Ship-to address | Address block | Pre-filled from practice; editable |
| Special instructions | Textarea | Optional |
| Insurance info | Optional collapsible | Payer name, member ID — for reimbursement reference only, not pre-auth |

**Actions on submit:**
1. Generate a simple summary PDF (no physician signature required for ocular orders per current scope)
2. Email the order to the configured ocular submission email (see §7)
3. Log the order to `ocular_orders` table with status `pending`

### 6.6 Data Model

New table: `ocular_orders`

```ts
{
  id: uuid,
  practice_id: uuid,
  submitted_by: uuid,
  ordering_provider_id: uuid,
  patient: jsonb,             // { first_name, last_name, dob, mrn }
  primary_diagnosis: text,    // ICD-10 code
  secondary_diagnosis: text,
  eye: 'right' | 'left' | 'bilateral',
  product_variant: 'thin' | 'thick',
  size_mm: 8 | 10 | 12 | 15,
  sku: text,                  // derived: VS4508, VS20012, etc.
  quantity: integer,
  date_needed_by: date,
  ship_to: jsonb,
  special_instructions: text,
  insurance_payer: text,
  insurance_member_id: text,
  pdf_url: text,
  status: 'pending' | 'approved' | 'shipped' | 'completed' | 'denied' | 'cancelled',
  submission_email_used: text,
  submitted_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp
}
```

> **Status enum updated (post-QA, commit 907d4cb):** Original PRD specified `pending | sent | fulfilled`. Unified with wound care product order statuses. Migration script remaps `fulfilled → completed`.

> **Product FK (post-QA, commit 9c331e1):** `ocular_orders` has nullable FK `ocular_product_id → ocular_products(id)` for catalog traceability.

> **Product catalog implemented (post-QA):** `ocular_products` table with `name`, `product_variant`, `size_mm`, `sku`, `description`, `archived` columns. Admin-managed via `OcularProductsCatalogTab.tsx`. Order form offers catalog picker with manual fallback.

---

## 7. Admin-Configurable Submission Emails

Both new modules (Lymphedema and Ocular) email completed orders to a configured external address. **Both addresses must be editable from the admin panel** with no code change.

### 7.1 Storage

New table: `system_settings` (key-value, audit-logged)

| Column | Type | Notes |
| --- | --- | --- |
| `key` | text | PK — e.g., `lymphedema_submission_email`, `ocular_submission_email` |
| `value` | text | The email address |
| `updated_by` | uuid | FK → `admin_acct` |
| `updated_at` | timestamp | |

Seed values:
- `lymphedema_submission_email` = `Lb@centralpalmsmedical.com`
- `ocular_submission_email` = `<TBD — confirm with client before launch>`

### 7.2 Admin UI

New tab in System Admin view: **Settings** (or place inside an existing global config area).

```
┌─────────────────────────────────────────────────────────┐
│  Settings                                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Lymphedema Order Submission Email                      │
│  ┌───────────────────────────────────────┐  ┌──────┐   │
│  │ Lb@centralpalmsmedical.com            │  │ Save │   │
│  └───────────────────────────────────────┘  └──────┘   │
│  Last updated by Will — May 12, 2026                    │
│                                                         │
│  Ocular Order Submission Email                          │
│  ┌───────────────────────────────────────┐  ┌──────┐   │
│  │ orders@example.com                    │  │ Save │   │
│  └───────────────────────────────────────┘  └──────┘   │
│  Last updated by Sarah — May 20, 2026                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Behavior:
- Inline email validation
- Save persists to `system_settings`
- All future submissions immediately use the updated value
- Display "Last updated by [name] on [date]" for audit trail
- (Optional) Send a test email button — sends a benign "configuration test" email to the entered address

### 7.3 Email Templates

Two new SendGrid templates in `backend/services/sendgrid.service.ts`:

- `lymphedema_order_submitted` — includes patient summary, device + garment selections, treatment protocol, attached PDF
- `ocular_order_submitted` — includes patient summary, product SKU + quantity, diagnosis, ship-to, attached PDF

Both templates use Integrity Tissue branding consistent with existing BV emails.

---

## 8. Dashboard Integration

> **Implementation note (Phase 4 complete):** Implemented as `AllSubmissionsTab.tsx` in the ITS Rep/Admin dashboard (`ClinicStaffDashboardClient.tsx`). Provider dashboard retains separate module tabs (functionally equivalent for providers who see only their own tracks). Per-submission "detail links" (§8.3) are tab-switch buttons in the unified view; full detail panels remain in individual module tabs (MedicalDevicesTab expandable rows, OcularOrdersTab expandable rows). No unexpected drift — all gaps are explicit deferrals (CMS-lite, ocular PDF, Supabase Storage).

### 8.1 Submission Table Type Column

The existing submissions table on the provider dashboard and admin dashboard gains a **Type** column so all three submission kinds appear together:

| Type | Badge color |
| --- | --- |
| BV (Wound Care) | Blue |
| Lymphedema | Purple |
| Ocular | Teal |

> Ocular-only practices see only ocular submissions (the wound/lymphedema rows simply don't exist for their practice).

### 8.2 Filter Bar Additions

- **Type** dropdown filter: All / Wound Care / Lymphedema / Ocular
- Existing status, date, and search filters continue to work
- Admin "All Practices" view shows all submission types across all practices

### 8.3 Per-Submission Detail Views

Each type has its own detail panel reflecting its data model:
- Wound Care → existing BV detail view
- Lymphedema → new `/lymphedema/orders/[id]` route
- Ocular → new `/ocular/orders/[id]` route

---

## 9. Admin Panel: Practice Track Management

### 9.1 New Section: Practice Tracks

Inside the existing **Practices** (or equivalent) admin tab, each practice row gains a "Tracks" column showing currently enabled tracks as colored chips. Clicking opens an inline editor:

```
┌────────────────────────────────────────────────────┐
│  Practice: Coastal Wound Care, LLC                 │
├────────────────────────────────────────────────────┤
│  Enabled Tracks:                                   │
│    [x] Wound Care                                  │
│    [x] Lymphedema                                  │
│    [ ] Ocular Products  ⚠ Exclusive — disables    │
│                            other tracks if enabled │
└────────────────────────────────────────────────────┘
```

### 9.2 Exclusivity Enforcement

- Enabling `ocular` shows a confirmation modal: _"Ocular Products is a standalone track. Enabling it will disable Wound Care and Lymphedema for this practice. Continue?"_
- Disabling all tracks is allowed (practice users see "no active tracks" message on login)
- Server-side validation enforces the constraint regardless of UI state

### 9.3 Audit Trail

Every track change is logged with `enabled_by` and `enabled_at` for compliance.

---

## 10. Data Model Summary — New Tables

| Table | Purpose |
| --- | --- |
| `practice_tracks` | Per-practice enablement of `wound_care` / `lymphedema` / `ocular` |
| `lymphedema_orders` | Lymphedema submissions + status |
| `ocular_orders` | Ocular submissions + status |
| `system_settings` | Admin-editable global config (submission emails, future settings) |
| `lymphedema_products` | Admin-managed product catalog for medical devices (post-QA, commit 9c331e1) |
| `ocular_products` | Admin-managed product catalog for VisiDisc SKUs (post-QA, commit 9c331e1) |

**Schema migration steps:**
1. `npm run db:generate` to create Drizzle migration files
2. `npm run db:push` to apply schema + RLS policies
3. Add RLS policies in `scripts/applyRls.ts` mirroring existing BV request policies (practice-scoped reads, admin all-access)
4. Seed `system_settings` with default emails

---

## 11. Out of Scope (This Release)

- Electronic physician signature capture for lymphedema or ocular orders (forms are downloaded and signed offline)
- Direct API integration with ReMarx Medical Services or Skye Biologics order systems
- Insurance pre-authorization status tracking for lymphedema/ocular
- ~~In-portal ocular product catalog management~~ **Partially implemented post-QA (commit 9c331e1):** `lymphedema_products` and `ocular_products` catalog tables with admin CRUD UI added. Pricing is still out of scope; the catalog captures SKU, variant, size, and description only.
- Analytics dashboards segmented by track
- Public marketing site beyond the landing page (e.g., individual product detail pages with deep marketing)
- Migration tool to convert existing wound-care practices to multi-track (admins enable additional tracks one-by-one)

---

## 12. Acceptance Criteria

The expansion is complete when **all** of the following are true:

> **Status:** All 21 criteria confirmed complete in QA Run 1 & 2 (2026-06-10, commit 20d3a43).

**Landing Page**
- [x] Root URL `/` renders a public landing page with three service cards
- [x] Page is responsive and accessible (WCAG AA) — QA Run 1 #120–125, Run 2 #126–129
- [x] "Sign In" CTA from landing routes to existing auth flow
- [x] Page renders for both logged-out and logged-in users without leaking authenticated data

**Track System**
- [x] Admin can enable/disable any combination of `wound_care` + `lymphedema` per practice
- [x] Admin cannot enable `ocular` together with other tracks (UI + server enforce)
- [x] Post-login routing correctly sends ocular practices to `/ocular/dashboard` and others to the main dashboard
- [x] Nav bar conditionally shows module entries based on enabled tracks
- [x] Practice with no enabled tracks sees a graceful "contact admin" message

**Lymphedema**
- [x] "Lymphedema" nav button visible only to enabled practices, follows existing nav styling
- [x] 4-week therapy eligibility gate blocks Step 2 if not met
- [x] At least one skin change required before Step 2
- [x] Device auto-recommendation correctly maps clinical inputs to AIROS 6 / 8 / 6P
- [x] All garment, treatment protocol, and pump fields captured in Step 2
- [x] Step 3 generates a downloadable pre-filled PDF matching the ReMarx Standard Written Order — QA Run 1 #116–119
- [x] Submission emails the configured address (default `Lb@centralpalmsmedical.com`) — QA Run 1 #86, Run 2 #102
- [x] Order appears in dashboard with purple Lymphedema badge

**Ocular**
- [x] Ocular-only practices see ocular nav (Dashboard / Product Info / New Order / Order History) and no wound/lymphedema nav
- [x] Product Info page renders all VisiDisc reference content, with admin-editable text & attachments
- [x] Order form captures all required fields, validates ICD-10 codes against reference list
- [x] Disc size options filter based on Thin/Thick variant
- [x] Submission emails the configured ocular address
- [x] Order appears in dashboard with teal Ocular badge

**Admin Settings**
- [x] System admin can edit both submission emails from the Settings tab — no code change required
- [x] "Last updated by [name] on [date]" shown for each setting
- [x] All future submissions of that type immediately use the updated email

**Dashboard**
- [x] Submissions table shows Type column with correct badge color
- [x] Type filter dropdown works
- [x] System admin sees all submission types across all practices
- [x] Practice users see only their own practice's submissions, scoped to enabled tracks

---

## 13. Reference Files

| File | Use |
| --- | --- |
| `Lymphedema_Module_PRD.pdf` | Original lymphedema spec (source for §5) |
| `ReMarx_Prescription.pdf` | Field layout for lymphedema order PDF |
| `Airos_6_.pdf` | AIROS 6 / 6P specs & garment compatibility |
| `Airos_.jpg` | AIROS 8 product sheet |
| `Lymphedema_needs_.docx` | Clinical eligibility criteria summary |
| `MRK.067.RevA.Skye.VisiDisc.Product.Brochure.pdf` | VisiDisc product spec — sizes, variants, ordering codes |
| `MRK.069.RevE.Skye.VisiDisc.Patient.Brochure.pdf` | Patient-facing condition list (source for §6.2) |
| `SkyeOcularCodes.pdf` | ICD-10 reference codes for ocular module |
| `Common ICD-10 Billing Codes.pdf` | Supplemental ICD-10 codes for CPT 65778 |
| `Best Practices Amniotic Membranes.pdf` | Source for Product Info best-practices content |
| `HydraTek.Quality.03.2017.FINAL.2.pdf` | Background reference for product info page |
| `The-amniotic-membrane-in-ophthalmology.pdf` | Clinical reference (not user-facing, for context only) |
| `Skye Physician Target List.xltx` | Internal use only — not portal-facing |

---

## 14. Implementation Phasing (Suggested)

A pragmatic build order that ships value incrementally and de-risks the architectural change first:

| Phase | Scope | Rationale |
| --- | --- | --- |
| **1. Foundation** | `practice_tracks` table, `system_settings` table, track-based routing, nav filtering, public landing page | Architectural backbone. Existing wound-care users see no behavioral change; all practices auto-seeded to `wound_care` only. |
| **2. Lymphedema** | Full lymphedema module + admin email config + dashboard type column | Larger of the two new modules; reuses BV patterns most directly. |
| **3. Ocular** | Full ocular module + product info CMS + admin email config | Smallest scope but introduces ocular-standalone navigation and CMS-style content. |
| **4. Polish & QA** | E2E testing, RLS audit, email deliverability check, accessibility pass | |

---

## 15. Rough Quote & Timeline

> Estimates assume the existing codebase patterns (BV flow, admin CRUD, SendGrid templates, Supabase storage) are reused wherever possible.

| Phase | Engineering effort | Calendar time |
| --- | --- | --- |
| 1. Foundation (track system + landing page) | ~40–55 hrs | ~1.5 weeks |
| 2. Lymphedema module | ~80–110 hrs | ~2.5–3 weeks |
| 3. Ocular module | ~50–70 hrs | ~2 weeks |
| 4. Polish, QA, email/PDF testing | ~25–35 hrs | ~1 week |
| **Total** | **~195–270 hrs** | **~7–8 calendar weeks** |

**Assumptions:**
- One full-stack engineer working ~30 hrs/week on this project
- Client provides finalized ocular submission email before Phase 3 starts
- Client supplies final brand assets for the landing page (hero copy, icons) within Phase 1
- ReMarx Standard Written Order PDF template provided for exact field mapping
- Existing Skye Biologics PDFs (product/patient brochures, ICD reference) provided for product info page upload
- No new infrastructure (still Vercel + Supabase + SendGrid)

**Out-of-band costs:**
- Supabase Pro tier (already required per existing PRD)
- SendGrid template counts well within current plan
- No new third-party integrations

---

## 16. Open Questions for Client

Before kickoff, please confirm:

1. Ocular submission email — Yes, what email address should the system send ocular product order notifications to? (Like how wound care
  orders go to a specific inbox.)    Same Emails.                                                                                                       
   
  2. Existing practices — Rephrased: Every practice currently in the system was created before tracks existed. When we deploy, should all   
  existing practices automatically get the wound_care track enabled? Or do some existing practices also need ocular or lymphedema turned on
  from day one? Yes. Do not enable ocular of lymphedema tracks yet for other practices. (but this should be easily editable on the admin side.)

  5. Lymphedema PDF — You didn't answer this one. Is ReMarx_Prescription.pdf still the correct Standard Written Order template, or is there
  a newer version? Yes.

  7. "All Practices" admin view — Rephrased: Right now admins see a flat list of all practices. With tracks, each practice can have
  different capabilities (wound care, ocular, lymphedema). Should the admin practices list show which tracks each practice has enabled —
  like small badges or a column — so admins can tell at a glance? Or keep the list as-is and only show track info when you click into a
  practice? Yes, there should be badges. The enabled track per practice should also be editable. 

  The rest are locked in:
  - 3. We draft landing page copy, you approve
  - 4. Ocular product info = direct transcription of Skye Biologics brochures
  - 6. Ocular practices use same OTP sign-in via /auth


