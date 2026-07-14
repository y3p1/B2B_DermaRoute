# UI/UX Consistency Overhaul — Plan & Progress

Demo-branch frontend cleanup: unified status pills, stat cards, breakdown widgets, DR/Admin polish, role-picker/landing redesign.

## Decisions (locked)
1. **Display-layer status merge** — DB untouched. Provider UI: `pending_review`→"Pending", `rejected`→"Denied". Staff UI keeps `pending_review` distinct as "Pending Review". One canonical color per status everywhere.
2. **Stat cards** — all 3 provider dashboards: **Total / Pending / Approved / Completed** ("Total BVs" vs "Total Orders" label stays context-specific).
3. **DR/Admin** — refined dark charcoal + disciplined orange.

**Do NOT touch** (dead on Demo branch): `components/dashboard/ProviderDashboardClient.tsx`, `DashboardClient.tsx`, `DashboardTable.tsx`, `BvDataTable.tsx`. Leave `HealingTrackerTab` status labels (different domain).

## Canonical status colors (single source: `components/ui/status-badge.tsx`)
| Status | Label | Classes |
|---|---|---|
| pending | Pending | `bg-amber-50 text-amber-800 ring-amber-600/20` |
| pending_review (staff only) | Pending Review | `bg-orange-50 text-orange-800 ring-orange-600/20` |
| approved | Approved | `bg-sky-50 text-sky-800 ring-sky-600/20` |
| shipped | Shipped | `bg-violet-50 text-violet-800 ring-violet-600/20` |
| completed | Completed | `bg-emerald-50 text-emerald-800 ring-emerald-600/20` |
| denied | Denied | `bg-red-50 text-red-800 ring-red-600/20` |
| downloaded | Downloaded | `bg-slate-100 text-slate-600 ring-slate-500/20` |
| cancelled | Cancelled | `bg-slate-50 text-slate-500 ring-slate-400/20` |
| delivered | Delivered | emerald (same as completed) |
| signed / expired / revoked (BAA) | — | sky / red / slate |

Pill anatomy: `inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset` + leading dot. `sm`=`px-2.5 py-1 text-xs`, `md`=`px-3 py-1.5 text-sm`. No `capitalize`.

## Progress

### Phase 0 — Setup
- [x] frontend-design skill invoked
- [x] dev server running
- [x] `screenshot.mjs` created (sets `demo_role` cookie)
- [x] Before-screenshots: /demo, /, wound-care, ocular, medical-devices, /clinic-staff, /admin

### Phase 1 — Shared primitives
- [x] `lib/format.ts` — `humanizeLabel()` (snake_case→Title Case, preserves "AIROS 6P")
- [x] `components/ui/status-badge.tsx` — STATUS_META, `canonicalStatus(status, viewer)`, `statusMeta()`, `<StatusBadge>`
- [x] `components/ui/stat-card.tsx` — `<StatCard>`
- [x] `components/dashboard/BreakdownCard.tsx` — `<BreakdownCard>` (ReactNode labels, footer slot)
- [x] lint + build green

### Phase 2 — Provider tracks
Skeleton: header → 4 StatCards (`grid grid-cols-2 lg:grid-cols-4 gap-4`) → 2-col (CTA + BreakdownCard) → Recent table. Counting via `canonicalStatus(o.status, "provider")`.

Wound care (emerald):
- [x] `app/wound-care/dashboard/page.tsx` — StatusBadge, 4 stats, BreakdownCard w/ humanized wound types
- [x] `app/wound-care/orders/page.tsx` + `orders/[id]/page.tsx`
- [x] `app/wound-care/order-products/page.tsx`
- [x] `app/wound-care/baa-agreements/page.tsx`
- [x] screenshots verified

Ocular (teal):
- [x] `app/ocular/dashboard/page.tsx` — StatusBadge, 4 stats, NEW "Product Mix" BreakdownCard (variant+size, eye chips footer), CTA into 2-col grid
- [x] `app/ocular/orders/page.tsx` + `orders/[id]/page.tsx`
- [x] screenshots verified

Medical devices (purple):
- [x] `app/medical-devices/dashboard/page.tsx` — StatusBadge, 4 stats, BreakdownCard (device pills as labels, extremities footer)
- [x] `app/medical-devices/orders/page.tsx` + `orders/[id]/page.tsx`
- [x] screenshots verified

- [x] 3 track layouts: focus-visible rings, padding/active-nav parity
- [x] Side-by-side parity check of 3 dashboards

### Phase 3 — DR Rep / Admin
- [x] `app/globals.css` — `--brand-dark` → `oklch(0.17 0.012 285)`, add `--brand-dark-elevated`
- [x] `ClinicStaffDashboardClient.tsx` — sidebar active = white/8 + orange left indicator; neutral count badges; light table header; StatusBadge staff (~line 880)
- [x] `AllSubmissionsTab.tsx` — StatusBadge staff, TYPE_META ring-tints, formatted select labels
- [x] `LymphedemaOrdersTab.tsx` + `OcularOrdersTab.tsx` — statusMeta staff, raw PATCH values kept
- [x] `bvColumns.tsx` + `productOrderColumns.tsx` — StatusBadge staff
- [x] `components/admin/baa-providers/columns.tsx` — humanizeLabel one-liner
- [x] `DashboardNavbar.tsx` — border/hover/focus polish
- [x] screenshots /clinic-staff (tabs) + /admin verified (18–23; 21 mislabeled "admin" = staff duplicate, 23 is real admin)

### Phase 4 — Role picker + Your Services
- [x] globals.css: `--brand-cta-soft` token — NOT needed (inline oklch matches file idiom)
- [x] `components/demo/RoleSwitcher.tsx` — layered radial bg + noise, ring/tinted-shadow cards, hover lift (transform+shadow only), focus-visible, charcoal staff tiles, arrow micro-motion
- [x] `components/landing/LandingPage.tsx` — same language; disabled = saturate-0/no lift; FAQ polish (FAQ signed-out view not screenshot-able in demo mode — code-reviewed only)
- [x] screenshots /demo + / verified (24–26; track pills in 24 missing only due to transient Supabase 504)

### Phase 5 — Final verification
- [x] Re-screenshot everything, ≥2 comparison rounds (shots 8–28 across phases)
- [x] Grep `STATUS_COLORS|statusColor|capitalize` for stragglers — fixed `AnalyticsTab.tsx` raw pill → StatusBadge staff; remaining hits are dead files (DashboardTable, ProviderDashboardClient) or non-status text (Navbar role, catalog extremity)
- [x] Zero grey/raw pills on wound dashboard; Pending stat includes pending_review (via canonicalStatus, code-verified — seed data has no pending_review rows); staff shows "Pending Review"; breakdowns Title Case
- [x] `npm run lint` (0 errors, 11 pre-existing warnings), `npm run build` green. `npm test`: 1 PRE-EXISTING failure (`me-and-bv.test.ts` GET /api/me → 500, broke before this work — no backend files touched here; likely 39d871b vs test mocks)
- [x] Commit (no Co-Authored-By)
