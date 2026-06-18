# Demo Portal — E2E QA Checklist

**Branch:** `Demo`  
**Date:** 2026-06-18  
**Scope:** All changes from `Demo_Portal_Integration_Plan.md` phases 0–5

> **Demo entry point:** `/demo` — no sign-in required. All role switching done via cookie.

---

## Demo Roles

| Role | Enter via | Lands on |
|---|---|---|
| Provider (main — wound_care + lymphedema) | `/demo` → Provider | `/` |
| Clinic Staff (rep) | `/demo` → Clinic Staff | `/clinic-staff` |
| Admin | `/demo` → Admin | `/admin` |

---

## 1. `/demo` — Role Switcher

- [ ] Page renders 3 cards: Provider, Clinic Staff, Admin
- [ ] Each card shows "View as [Role] →"
- [ ] "No sign-in required" / "Browse the full portal as any role" copy visible
- [ ] Footer: "DermaRoute Demo — illustrative only, not a real patient environment."
- [ ] Click Provider → sets `demo_role=provider` cookie, redirects to `/`
- [ ] Click Clinic Staff → sets `demo_role=clinic_staff` cookie, redirects to `/clinic-staff`
- [ ] Click Admin → sets `demo_role=admin` cookie, redirects to `/admin`

---

## 2. Landing Page `/` — Provider view

- [ ] 3 cards render: "Tissue Products & PRP (Biologics)", "Ocular Products", "Medical Devices / Equipment"
- [ ] All 3 cards show "Open →" (demo mode enables all tracks)
- [ ] No lock icons, no "Not enabled" state, no "Sign in →" CTA
- [ ] Footer: "DermaRoute Demo — illustrative only, not a real patient environment."
- [ ] Clicking "Tissue Products & PRP" → navigates to `/dashboard`
- [ ] Clicking "Medical Devices / Equipment" → navigates to `/dashboard`
- [ ] Clicking "Ocular Products" → navigates to `/ocular`

---

## 3. Track / Module Renaming (Phase 0.3)

- [ ] Landing page card 1: "Tissue Products & PRP (Biologics)"
- [ ] Landing page card 2: "Ocular Products"
- [ ] Landing page card 3: "Medical Devices / Equipment" with subtitle "AIROS Compression Pump & Garment Ordering"
- [ ] Provider dashboard nav tab: "Medical Devices / Equipment" (not "Lymphedema Orders")
- [ ] Clinic-staff Practice Tracks tab: track labels match — "Tissue Products & PRP (Biologics)", "Medical Devices / Equipment", "Ocular Products"
- [ ] System Settings tab: email key label "Medical Devices / Equipment Order Submission Email"

---

## 4. Provider Dashboard — Wound Care (Phase 0.x, 4.2)

- [ ] `/dashboard` loads without crash as Provider role
- [ ] "Wound Care Products" nav tab present
- [ ] BV requests list renders (seeded data visible)
- [ ] "New BV" opens multi-step BV form

### 4.1 BV Form

- [ ] Step 1: wound size is a single free-text `<input>` (no dropdown toggle)
- [ ] Step 2: Street Address, City, State, Zip fields present and required
- [ ] Submitting without delivery address fields shows validation error
- [ ] Step 3: submission succeeds, BV appears in list with `pending` status
- [ ] Submitted BV visible in clinic-staff BV Requests tab

### 4.2 Wound Care Tab — Product Orders

- [ ] Product orders list renders
- [ ] Product order modal: selecting a BV prefills delivery address fields

### 4.3 Other Provider Tabs

- [ ] Healing tracker tab loads without crash
- [ ] Reorder log tab loads without crash

---

## 5. Provider Dashboard — Medical Devices / Equipment (Phase 2.x)

- [ ] "Medical Devices / Equipment" nav tab present (lymphedema track)
- [ ] "New Order" button opens `LymphedemaOrderModal`

### 5.1 LymphedemaOrderModal — Step 1

- [ ] Insurance (text input) required
- [ ] Place of Service required
- [ ] Patient fields present: First Name, Last Name, DOB, MRN, Address, City, State, Zip, Phone, Email
- [ ] Diagnosis multi-select works
- [ ] Conservative therapy Yes/No selection
- [ ] Skin changes multi-select works
- [ ] Extremity (side + type) selection works
- [ ] Measurements section renders when extremity selected
- [ ] "Next" disabled until required fields filled
- [ ] **Eligibility gate**: selecting "No" for conservative therapy shows ineligibility warning and blocks Step 2

### 5.2 LymphedemaOrderModal — Step 2

- [ ] Device field
- [ ] HCPCS code field
- [ ] Garment Type, Garment Style, Compression Level inputs
- [ ] Quantity (number input)
- [ ] Custom Made Yes/No
- [ ] Manufacturer Preference (optional)
- [ ] Times Per Day, Minutes Per Session inputs
- [ ] Back / Next navigation works, entered data preserved

### 5.3 LymphedemaOrderModal — Step 3 (Review + Submit)

- [ ] All entered data displayed in review
- [ ] "Submit Order" calls `POST /api/lymphedema-orders`
- [ ] Success: modal closes, orders table refreshes
- [ ] New order appears with `pending` status
- [ ] Submission email sent to demo address (not provider's real email)

### 5.4 PDF Download

- [ ] Each order row shows "PDF" button
- [ ] Clicking PDF shows spinner while fetching order
- [ ] Print dialog opens in new window
- [ ] Document contains: Order ID, status badge, Patient Information, Clinical Assessment, Device Recommendation, Treatment Protocol sections
- [ ] Status badge colors: pending=yellow, approved=green, denied=red
- [ ] Footer shows Submitted and Generated timestamps

---

## 6. Ocular Module (Phase 3)

### 6.1 Navigation

- [ ] From landing, clicking "Ocular Products" → `/ocular`
- [ ] Ocular layout sidebar renders: Dashboard, Product Info, New Order, Order History
- [ ] Teal branding consistent throughout

### 6.2 Ocular Pages

- [ ] `/ocular/dashboard` — loads, shows welcome/summary content
- [ ] `/ocular/product-info` — loads, product information displayed
- [ ] `/ocular/orders` — seeded orders listed with status badges
- [ ] `/ocular/orders/[id]` — clicking order navigates to detail, all fields shown, back works

### 6.3 New Ocular Order

- [ ] `/ocular/orders/new` form renders
- [ ] Required fields validate on submit
- [ ] Successful submit shows success state or redirects
- [ ] Demo: email sent to demo address

---

## 7. Clinic Staff / Admin Dashboard

### 7.1 All Submissions Tab (Phase 4.1)

- [ ] Default tab on load for both clinic_staff and admin roles
- [ ] Rows from all 3 modules listed (Wound Care BVs, Medical Devices orders, Ocular orders)
- [ ] Type badge shows "Wound Care" (blue), "Medical Device" (purple), "Ocular" (teal)
- [ ] Type filter buttons: All Types / Wound Care / Medical Device / Ocular
- [ ] Status filter dropdown works
- [ ] "View tab →" per row switches to correct module tab

### 7.2 Wound Care Tab (Phase 4.2)

- [ ] "Wound Care Products" nav item in sidebar
- [ ] Default sub-tab "Orders": product orders table renders
- [ ] Admin only: pill toggle "Orders | Product Catalog" visible
- [ ] Clinic_staff: no pill toggle (orders only)
- [ ] Product Catalog sub-tab: wound care products render
- [ ] No separate "Products Management" nav item (removed)

### 7.3 BV Requests Tab

- [ ] BV list loads for admin (all providers)
- [ ] Clicking a BV opens verification modal
- [ ] Verify action submits successfully

### 7.4 Medical Devices Orders Tab (Phase 2.3)

- [ ] "Medical Devices / Equipment" nav item in sidebar
- [ ] Default sub-tab "Orders": seeded lymphedema orders visible
- [ ] Admin only: pill toggle "Orders | Product Catalog" visible
- [ ] Clinic_staff: no pill toggle
- [ ] Orders expand to show detail on click
- [ ] Status dropdown per row — admin can change status
- [ ] Status change persists (PATCH call succeeds)

### 7.5 Medical Devices Product Catalog (Phase 2.4)

- [ ] Admin: "Product Catalog" sub-tab loads `LymphedemaProductsCatalogTab`
- [ ] Seeded products visible: AIROS 6, AIROS 8, AIROS 6P
- [ ] "Add Product" opens inline form row
- [ ] Form fields: Name (required), Device, HCPCS, Manufacturer, Extremity, Description
- [ ] Save creates product, row appears
- [ ] Cancel discards row
- [ ] Edit pencil: populates existing values, save updates row
- [ ] Archive button: removes product from active list
- [ ] "Show archived" checkbox: archived product reappears with reduced opacity
- [ ] Refresh button reloads list
- [ ] Clinic_staff: Product Catalog sub-tab NOT visible

### 7.6 Ocular Orders Tab (Phase 3.4)

- [ ] "Ocular Orders" nav item in sidebar
- [ ] Default sub-tab "Orders": seeded ocular orders visible
- [ ] Admin only: pill toggle "Orders | Product Catalog" visible
- [ ] Status update works inline

### 7.7 Ocular Product Catalog (Phase 3.5)

- [ ] Admin: "Product Catalog" sub-tab loads `OcularProductsCatalogTab`
- [ ] Seeded SKUs visible: VS4508, VS4510, VS4512, VS4515, VS20008, VS20010, VS20012, VS20015
- [ ] "Add SKU" opens inline form row
- [ ] Form: Name, Variant (select: Thin/Thick), Size mm, SKU (all required), Description optional
- [ ] Variant displays as "Thin (45μm)" or "Thick (200μm)" in table
- [ ] Save / Edit / Archive / Refresh all work
- [ ] Clinic_staff: Product Catalog sub-tab NOT visible

### 7.8 Practice Tracks Tab (Phase 1.5) — Admin only

- [ ] Tab visible for admin role, NOT visible for clinic_staff
- [ ] Providers listed with per-track checkboxes (Tissue Products, Medical Devices, Ocular)
- [ ] Toggle a track + save → change persists on refresh
- [ ] Track labels display renamed values (not raw DB keys)

### 7.9 System Settings Tab (Phase 1.5 / 0.3) — Admin only

- [ ] Tab visible for admin role, NOT visible for clinic_staff
- [ ] 4 email settings rows load
- [ ] All values seeded to demo address (`shawn.druzali04@gmail.com`)
- [ ] Inline edit: pencil → change value → save → persists on refresh
- [ ] Key label includes "Medical Devices / Equipment Order Submission Email"

---

## 8. Rep Territory Security (Phase 0.5) — Non-demo behavior

> In demo mode `isDemoMode()` bypasses ownership checks — these verify the logic works in non-demo. Test by temporarily disabling demo mode or via direct API calls.

- [ ] Clinic staff (rep): BV list scoped to assigned providers only
- [ ] Direct GET `/api/bv-requests/[id]` for unassigned provider → 403
- [ ] Reorder tracking data scoped to assigned providers
- [ ] Practice tracks list scoped to assigned providers
- [ ] PUT `/api/practice-tracks/[unassignedProviderId]` → 403

---

## 9. Demo Seeding & Reset (Phase 5)

- [ ] `resetDemo.ts` runs without error
- [ ] After reset, tables truncated: lymphedema_orders, ocular_orders, lymphedema_products, ocular_products, practice_tracks, system_settings
- [ ] After reseed:
  - System settings: 4 keys, all values = `shawn.druzali04@gmail.com`
  - Practice tracks: 3 practices with correct track assignments
  - Lymphedema products: AIROS 6, AIROS 8, AIROS 6P
  - Ocular products: 8 VisiDisc SKUs
  - Lymphedema orders: 5 orders spanning all statuses
  - Ocular orders: 4 orders spanning statuses
- [ ] Portal flows work end-to-end with freshly seeded data

---

## 10. API Smoke Tests

> For demo: send `X-Demo-Role: admin` / `X-Demo-Role: provider` header + `Authorization: Bearer demo-token`

| Endpoint | Method | Role | Expected |
|---|---|---|---|
| `/api/me` | GET | provider | 200, `enabledTracks` present |
| `/api/lymphedema-orders` | GET | provider | 200, provider's orders |
| `/api/lymphedema-orders` | POST | provider | 201 |
| `/api/lymphedema-orders/[id]` | PATCH `{status:"approved"}` | admin | 200 |
| `/api/lymphedema/products` | GET | provider | 200 |
| `/api/lymphedema/products` | POST | admin | 201 |
| `/api/lymphedema/products` | POST | provider | 403 |
| `/api/lymphedema/products/[id]` | DELETE | admin | 200 (archived) |
| `/api/ocular/orders` | GET | provider | 200 |
| `/api/ocular/products` | GET | provider | 200 |
| `/api/ocular/products` | POST | provider | 403 |
| `/api/practice-tracks` | GET | admin | 200 |
| `/api/practice-tracks` | GET | provider | 403 |
| `/api/system-settings` | GET | admin | 200, 4 keys |
| `/api/system-settings` | GET | provider | 403 |

---

## 11. Edge Cases

- [ ] PDF print popup: browser must allow popups for print to open
- [ ] LymphedemaOrderModal: back navigation preserves entered data
- [ ] Submitting ocular order twice: second submit shows error / no duplicate
- [ ] Clinic-staff dashboard: `?tab=lymphedema_orders` URL param sets tab on load
- [ ] Clinic-staff dashboard: `?tab=ocular_orders` URL param sets tab on load
- [ ] Switching demo role (revisiting `/demo`): new role cookie replaces old, UI reflects new role
