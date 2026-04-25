# Phase 4 — Product & Wound Size Management Release Notes

**Release Date:** April 20, 2026  
**Branch:** `staging`

---

## Overview

This release introduces a comprehensive overhaul of the wound size management system, product catalog data model, and administrative UI. Products are now grouped by name in the admin view with a dynamic size-selection dropdown, wound sizes are standardized into categorized disc/rectangular groups, and multiple UI consistency issues have been resolved across all admin management modals.

---

## 1. Wound Size Standardization System

### Problem
Wound sizes were previously stored as free-text strings with no categorization, leading to inconsistent data entry and difficulty filtering between disc (round) and rectangular/square wound types.

### Solution
Introduced a standardized, categorized wound size system with 19 predefined sizes.

### Schema Changes
| File | Change |
|---|---|
| `db/bv-products.ts` | Added `category` column (`varchar(32)`) to `wound_sizes` table to distinguish `disc` vs `rectangular` types |
| `db/schema.ts` | Updated barrel export to include new wound size schema |

### Wound Size Categories

**Discs (Round)**
| Key | Label |
|---|---|
| `disc_16mm` | 16mm disc (2.011 cm²) |
| `disc_18mm` | 18mm disc (2.545 cm²) |
| `disc_25mm` | 25mm disc (4.909 cm²) |

**Square & Rectangular**
| Key | Label |
|---|---|
| `2x2` | 2 × 2 cm (4 cm²) |
| `2x3` | 2 × 3 cm (6 cm²) |
| `3x3` | 3 × 3 cm (9 cm²) |
| `3x4` | 3 × 4 cm (12 cm²) |
| ... | _(16 total rectangular sizes up to 7×10 cm)_ |

### Files Modified
| File | Change |
|---|---|
| `backend/services/woundSizes.service.ts` | Updated `listWoundSizes()` to return the `category` field alongside `key` and `label` |
| `backend/controllers/bvWoundSizes.controller.ts` | Updated controller response to pass `category` through the API |
| `scripts/seedWoundSizes.ts` | **NEW** — Seeding script to insert/upsert 19 standardized wound sizes with proper categories |

### UI — Grouped `<SelectGroup>` Dropdowns
Wound size selection dropdowns throughout the app now display sizes in two categorized groups instead of a flat list:

| File | Change |
|---|---|
| `components/dashboard/BVSteps/Step1ClinicalInfo.tsx` | Replaced flat wound size input with grouped `<SelectGroup>` dropdown (Discs / Square & Rectangular) |
| `components/dashboard/EnhancedOrderModal.tsx` | Updated Order modal wound size selector with same grouped dropdown pattern |
| `components/clinic-staff/ProductsManagementTab.tsx` | Updated product management wound size selector with grouped dropdown |

> [!IMPORTANT]
> A data cleanup script (`scripts/cleanupWoundSizes.ts`) was executed to remap existing `products` and `bv_requests` associations from old duplicated wound size records to the canonical standardized ones, and remove orphaned duplicates.

---

## 2. Admin Modal UI Consistency Fix

### Problem
The admin management modals in Products, Manufacturers, and Insurances tabs had a solid black background (`bg-black`) instead of the transparent blurred backdrop used elsewhere in the app.

### Fix
Updated all three modal overlays to use `bg-black/50 backdrop-blur-sm` for a consistent semi-transparent, blurred appearance. Also added click-to-close functionality on the backdrop.

### Files Modified
| File | Change |
|---|---|
| `components/clinic-staff/ProductsManagementTab.tsx` | Updated modal backdrop styling + click-to-close |
| `components/clinic-staff/ManufacturersManagementTab.tsx` | Updated modal backdrop styling + click-to-close |
| `components/clinic-staff/InsurancesManagementTab.tsx` | Updated modal backdrop styling + click-to-close |

---

## 3. Grouped Product Management View

### Problem
Since each product + wound size combination is stored as an independent database row, the Products Management table displayed many duplicate-looking rows (e.g., "ACApatch" appeared 9 times — once per size). This made the admin view cluttered and hard to navigate.

### Solution
Implemented a client-side grouping system that consolidates all size variants of a product into a single table row, with a dynamic dropdown to switch between sizes.

### How It Works
1. **Grouping Logic:** Products are grouped by a composite key of `name + manufacturerId` using `React.useMemo`
2. **Active Variant Tracking:** An `activeVariantMap` state tracks which size variant is currently selected for each product group
3. **Dynamic Pricing:** When a different size is selected from the dropdown, all pricing columns (Pay Rate/cm², Cost/cm², Pay Rate/Graft, Cost/Graft, Est AOC@100%, Est AOC@80%) update to reflect that specific variant's values
4. **Context-Aware Actions:** The Edit and Delete buttons always target the currently active (selected) variant

### Files Modified
| File | Change |
|---|---|
| `components/clinic-staff/ProductsManagementTab.tsx` | Complete overhaul — added `ProductGroup` type, `activeVariantMap` state, grouped rendering logic, size `<select>` dropdown column, dynamic pricing cells |

### UI Layout (Per Grouped Row)
| Column | Content |
|---|---|
| Product Name | Shared across all variants |
| Manufacturer | Shared across all variants |
| Size | `<select>` dropdown with all available sizes |
| Q-Code | Active variant's Q-code |
| Pay Rate/cm² | Active variant's pay rate |
| Cost/cm² | Active variant's cost |
| Est AOC@100% | Active variant's AOC estimate |
| Actions | Edit / Delete targeting active variant |

---

## 4. Product Catalog Bulk Seeding

### Purpose
Programmatically seeded the database with 36 unique product/size combinations across 4 products, mapped to their correct manufacturers and categories.

### Products Seeded
| Product | Manufacturer | Sizes |
|---|---|---|
| Grafix PL | Osiris Therapeutics | All 19 standard sizes |
| ACApatch | Integra LifeSciences | 9 sizes |
| alloPLY | AlloSource | 4 sizes |
| caregraFT | Sanara MedTech | 4 sizes |

### Scripts
| File | Purpose |
|---|---|
| `scripts/seedWoundSizes.ts` | Seeds/upserts the 19 standardized wound sizes |
| `scripts/mockProductData.ts` | Populates null financial metrics (q_code, unit_size, pay_rate_per_cm2, cost_per_cm2, pay_rate_per_graft, cost_per_graft, est_aoc_100, est_aoc_80) with plausible mock values |

> [!NOTE]
> The financial metrics (Pay Rates, Costs, AOC values) are **mock data** generated for testing purposes. These should be replaced with real pricing data from the client's catalog before production use.

---

## 5. Order Modal — Product Size Disambiguation

### Problem
When creating a product order, the Product selection dropdown showed multiple identical entries per product name (one per size variant), making it unclear which specific size was being selected.

### Fix
Updated the Product `<SelectItem>` display to append the wound size label next to the product name.

**Before:** `ACApatch (Q4100)`  
**After:** `ACApatch - 16mm disc (2.011 cm²) (Q4100)`

### Files Modified
| File | Change |
|---|---|
| `components/dashboard/EnhancedOrderModal.tsx` | Added `woundSizeLabel` to `Product` type; updated `<SelectItem>` rendering to include size label |

---

## 6. BV Request — Initials Field Length Fix

### Problem
The `initials` column in `bv_requests` was defined as `varchar(16)`, causing a database error (`value too long for type character varying(16)`) when users entered longer signature strings.

### Fix
Increased the column length from 16 to 64 characters.

### Files Modified
| File | Change |
|---|---|
| `db/bv-requests.ts` | Changed `initials` column from `varchar(16)` to `varchar(64)` |

> [!NOTE]
> Schema change was applied to the live database via `npm run db:push`.

---

## 7. Additional Infrastructure Changes

### Cron & Vercel Configuration
| File | Change |
|---|---|
| `vercel.json` | Added cron job configurations for CMS feed sync and policy monitor |
| `package.json` / `package-lock.json` | Added `@types/pg` dependency |

### New API Routes (Staged for Future Phases)
| Route | Purpose |
|---|---|
| `app/api/audit-logs/` | Audit log retrieval API |
| `app/api/cms-policy-updates/` | CMS policy update tracking |
| `app/api/coverage-plans/` | Coverage plan management |
| `app/api/cron/cms-feed-sync/` | CMS feed synchronization cron |
| `app/api/cron/policy-monitor/` | Policy monitoring cron |

### New Admin Dashboard Tabs (Staged)
| File | Purpose |
|---|---|
| `components/clinic-staff/AuditLogsTab.tsx` | Audit log viewer UI |
| `components/clinic-staff/PolicyTrackerTab.tsx` | CMS policy change tracker UI |

### New Database Tables (Staged)
| File | Table |
|---|---|
| `db/audit-logs.ts` | `audit_logs` — tracks admin actions |
| `db/cms-policy-updates.ts` | `cms_policy_updates` — CMS policy change feed |
| `db/coverage-plans.ts` | `coverage_plans` — provider coverage plans |

### RLS Policies (Staged)
| File | Purpose |
|---|---|
| `supabase/rls/audit_logs.sql` | Row-level security for audit logs |
| `supabase/rls/cms_policy_updates.sql` | Row-level security for CMS policy updates |
| `supabase/rls/coverage_plans.sql` | Row-level security for coverage plans |

---

## Files Changed Summary

### Modified (17 files)
- `backend/controllers/bvWoundSizes.controller.ts`
- `backend/controllers/productOrders.controller.ts`
- `backend/services/woundSizes.service.ts`
- `components/clinic-staff/ClinicStaffDashboardClient.tsx`
- `components/clinic-staff/InsurancesManagementTab.tsx`
- `components/clinic-staff/ManufacturersManagementTab.tsx`
- `components/clinic-staff/ProductsManagementTab.tsx`
- `components/dashboard/BVSteps/Step1ClinicalInfo.tsx`
- `components/dashboard/EnhancedOrderModal.tsx`
- `db/bv-products.ts`
- `db/bv-requests.ts`
- `db/schema.ts`
- `package.json` / `package-lock.json`
- `project-notes/implementation-roadmap.md`
- `vercel.json`

### Deleted (1 file)
- `phase-2-Step5&6-release-notes.md` (moved to `project-notes/`)

### New (20+ files)
- API routes, controllers, services, components, database schemas, RLS policies, and utility scripts as listed above.

---

## ⚠️ Known Considerations

> [!WARNING]
> **Mock Financial Data:** Product pricing metrics were populated with randomized mock data. Real pricing should be entered via the Edit Product modal before production deployment.

> [!NOTE]
> **Database Model:** The database still maintains individual rows for every product/size combination. The grouping is purely a UI abstraction. Deleting all sizes of a product must be done one variant at a time through the admin interface.

> [!TIP]
> **Connection Pool Limit:** The Supabase session pooler has a hard limit of 15 concurrent connections. Standalone scripts should use `{ max: 1 }` or connect via the transaction pooler (port `6543`) instead of the session pooler (port `5432`) to avoid `EMAXCONNSESSION` errors.
