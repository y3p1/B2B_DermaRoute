# DermaRoute Portal — System Overview

## What It Does

DermaRoute is a B2B healthcare provider portal that manages the full ordering and verification lifecycle for three product categories (called **tracks**): wound care tissue products, medical device/lymphedema equipment, and ocular amniotic membrane products. Clinics (providers) submit orders and benefit verification requests through the portal. DR Representatives (clinic staff) and Admins manage, review, and forward those submissions to the appropriate distributors.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Runtime | Node.js |
| Database | Supabase Postgres (via Drizzle ORM 0.45) |
| Auth | Supabase Auth (OTP via phone/email) |
| ORM | Drizzle ORM + drizzle-kit |
| State | Zustand 5 |
| UI | shadcn/ui (Radix UI primitives + Tailwind CSS 4) |
| Forms | React Hook Form + Zod 4 |
| Tables | TanStack Table v8 |
| PDF Generation | @react-pdf/renderer 4 |
| Email | SendGrid (@sendgrid/mail 8) |
| OTP SMS | Twilio |
| Icons | Lucide React |
| Testing | Jest 30 + ts-jest |
| Linting/Hooks | ESLint 9 + Husky + lint-staged |

---

## User Roles

There are three real roles and two extra demo-only provider variants:

| Role | Access | Dashboard |
|---|---|---|
| `provider` | Their own orders and BV requests, only on enabled tracks | `/` → track dashboard |
| `clinic_staff` (DR Representative) | All submissions across assigned providers | `/clinic-staff` |
| `admin` | Everything — all data + system config | `/admin` |

**Demo-only roles** (no real DB records):
- `provider` — Cedar Hills Wound Center (wound_care + lymphedema tracks)
- `provider_wound2` — Summit Wound Specialists (wound_care only)
- `provider_ocular` — Coastal Eye Clinic (ocular only)
- `clinic_staff` — Alex Patel (DR Representative)
- `admin` — Morgan Chen

---

## Practice Tracks

Every provider account has a set of **tracks** assigned by an admin. Tracks control which product categories appear as enabled in the portal.

| Track Key | Display Name | Dashboard Path |
|---|---|---|
| `wound_care` | Tissue Products & PRP (Biologics) | `/wound-care/dashboard` |
| `lymphedema` | Medical Devices / Equipment | `/medical-devices/dashboard` |
| `ocular` | Ocular Products | `/ocular/dashboard` |

Stored in the `practice_tracks` table (provider_id + track unique constraint). Admins manage this from the **Practice Tracks** tab. The `/api/me` response includes `enabledTracks`, which drives both navigation and the "Your Services" landing page.

Multi-track providers see a "Your Services" page (`/`) showing which services are enabled. Single-track providers skip this and go directly to their one dashboard.

---

## Authentication Flow

All authentication uses Supabase OTP (no passwords):

1. User enters phone number → `POST /api/send-otp` (Twilio SMS)
2. User enters OTP code → `POST /api/verify-otp` → Supabase session created
3. Session JWT stored in browser, sent as `Authorization: Bearer <token>` on all API calls
4. `requireAuth` middleware validates the JWT on every protected route

Admins sign in at `/admin/signin`. Providers and DR Reps sign in at `/auth`. Separate signup flows exist for each role.

---

## API Architecture

All API routes live in `app/api/**/route.ts` (Next.js App Router). They do **not** use Next.js middleware. Instead, every handler manually composes a middleware stack via `runServerPipeline` (`backend/serverPipeline.ts`), which bridges the Next.js `Request`/`Response` to an Express-style `req/res/next` pattern.

```
Request → corsMiddleware → rateLimit → requireAuth → controller → Response
```

**Available middleware:**
- `corsMiddleware` — CORS headers, preflight OPTIONS
- `rateLimit` — sliding window rate limiter
- `requireAuth` — validates Supabase JWT, sets `res.locals.userId` and `res.locals.user`
- `requireAdmin` — requires `admin` role
- `requireAdminOrClinicStaff` — requires admin or clinic_staff role
- `otpAbuseGuard` — rate limits OTP requests per phone number

After `requireAuth`, controllers access the user via `res.locals.userId`, `res.locals.user`, and `res.locals.accessToken`.

**Code layout:**
- `backend/controllers/` — thin handlers: validate input (Zod), call service, send response
- `backend/services/` — all business logic and DB queries (Drizzle)
- `backend/middlewares/` — middleware functions
- `backend/services/db.ts` — singleton Drizzle client (`getDb()`)

---

## Service Lines (Tracks) — Feature Details

### Wound Care / Tissue Products & PRP (`/wound-care/`)

The primary and most complex track. Providers submit **Benefits Verification (BV) Requests** before ordering tissue products.

**BV Request lifecycle:**
1. Provider submits BV form (patient info, wound type/size/location, insurance, ICD-10, application date)
2. DR Rep or Admin reviews and verifies
3. Provider can upload approval proof documents (stored in Supabase Storage)
4. Approved BVs unlock product ordering

**Product ordering:**
- Products are catalogued per manufacturer with Q-codes, pay rates, wound sizes
- Insurance routing maps insurers to approved manufacturers
- Risk scoring assigned to orders (critical / high / standard / low)
- Orders tracked through: pending → shipped → completed / cancelled

**Healing tracker:**
- Per-BV-request wound measurement history
- Size recorded in cm² with date and notes
- Tracks healing progress over time

**BAA (Business Associate Agreements):**
- Per-provider digital BAA with signature capture
- Statuses: pending → signed → approved / cancelled
- Managed by admins and DR Reps

**Sidebar nav:** Dashboard · New BV Request · BV History · Order Products · BAA Agreements

---

### Medical Devices / Equipment (`/medical-devices/`)

Manages AIROS compression pump and garment orders for lymphedema patients.

**Order fields:** Patient info, insurance, diagnosis (ICD-10), conservative therapy completion, skin changes, limb measurements, device/HCPCS codes, garment style/type/compression level, quantity, manufacturer preference, pressure settings (mmHg, sessions/day).

**Workflow:**
1. Provider submits order form → PDF generated
2. DR Rep reviews in admin dashboard
3. DR Rep clicks "Send to Supplier" → formatted email sent to supplier (configurable via `lymphedema_submission_email` system setting)
4. Order status updated to reflect submission

**Email notification on order creation:** Internal notification sent to ITS rep email (configurable via `lymphedema_rep_notification_email`).

**Sidebar nav:** Dashboard · New Order · Order History

---

### Ocular Products (`/ocular/`)

Manages VisiDisc® amniotic membrane disc orders (Skye Biologics).

**Product variants:** Thin (45μm) or Thick (200μm), sizes 8–18mm, CPT code 65778.

**Order fields:** Patient info (name, DOB, MRN), diagnosis (primary + secondary ICD-10), eye treated (OD/OS/OU), product variant, disc size, SKU, quantity, shipping address, date needed by, insurance payer/member ID, special instructions.

**Shipping cost tiers:** 1–8 units → $40 · 9–20 units → $45 · 21+ units → $65.

**Workflow:**
1. Provider submits order → email notification sent to ITS rep
2. DR Rep reviews order in dashboard
3. DR Rep clicks "Send to Skye Biologics" → formatted order email sent to supplier (configurable via `ocular_submission_email`)
4. Order status updated

**Sidebar nav:** Dashboard · Product Info · New Order · Order History

---

## Database Schema Summary

### User Account Tables
| Table | Purpose |
|---|---|
| `provider_acct` | Clinic/practice accounts (NPI, address, specialty) |
| `admin_acct` | Admin and clinic_staff accounts |
| `clinic_staff_acct` | DR Representative accounts |
| `practice_tracks` | Track-to-provider assignments (unique: provider_id + track) |

### Wound Care Tables
| Table | Purpose |
|---|---|
| `bv_requests` | BV submissions (wound data, insurance, status) |
| `wound_measurements` | Healing tracker entries per BV request |
| `order_products` | Product orders linked to BV requests |
| `order_outcomes` | Post-order outcomes (healed, weeks, complications) |
| `products` | Product catalog (Q-codes, rates, sizes, manufacturer) |
| `manufacturers` | Manufacturer registry |
| `wound_sizes` | Wound size options (disc/rectangular, area cm²) |
| `insurances` | Insurance plan registry |
| `insurance_routing` | Insurance ↔ manufacturer approval mapping |
| `coverage_plans` | Detailed coverage per insurance plan |
| `baa_provider` | Provider BAA agreements with signatures |
| `bv_requests` | BV PDF form metadata |

### Medical Devices / Ocular Tables
| Table | Purpose |
|---|---|
| `lymphedema_orders` | Lymphedema device orders (JSONB patient/diagnosis fields) |
| `lymphedema_products` | Lymphedema device catalog |
| `ocular_orders` | Ocular disc orders |
| `ocular_products` | Ocular product catalog (variant, size, SKU) |

### System Tables
| Table | Purpose |
|---|---|
| `system_settings` | Key-value app config (email addresses, feature flags) |
| `threshold_settings` | Business threshold values |
| `audit_logs` | DB change log (table, record, action, old/new data) |
| `cms_feed_sources` | RSS sources for CMS policy feeds |
| `cms_policy_updates` | Parsed policy update articles |
| `policy_monitors` | URL hash monitoring for coverage plan docs |

---

## Admin Dashboard — All Tabs

Admin and DR Rep share the same dashboard shell (`ClinicStaffDashboardClient`). Admins see all tabs; DR Reps see a subset.

| Tab | Admin | DR Rep | Description |
|---|---|---|---|
| All Submissions | ✓ | ✓ | Unified view of all order types |
| BV Requests | ✓ | ✓ | Wound care BV queue with pending badge |
| Product Orders | ✓ | ✓ | Wound care product orders |
| Medical Devices | ✓ | ✓ | Lymphedema orders |
| Ocular | ✓ | ✓ | Ocular disc orders |
| Reorder Tracking | ✓ | ✓ | Product reorder monitoring |
| Healing Tracker | ✓ | ✓ | Wound measurement history across providers |
| BAA Agreements | ✓ | ✓ | Provider BAA status and signing |
| Manufacturers | ✓ | — | Manufacturer CRUD |
| Insurances | ✓ | — | Insurance plan CRUD |
| BV Form Management | ✓ | — | Upload/version BV PDF forms per manufacturer |
| Insurance Routing | ✓ | — | Map insurers to approved manufacturers |
| Analytics | ✓ | — | Success rates, outcomes, commission metrics |
| Audit Logs | ✓ | — | Full change history across DB tables |
| Policy Tracker | ✓ | — | CMS policy feed reader + URL monitor |
| DR Representatives | ✓ | — | Manage clinic_staff accounts |
| Provider Accounts | ✓ | — | View providers, their assigned tracks, status |
| Practice Tracks | ✓ | — | Enable/disable tracks per provider |
| System Settings | ✓ | — | Email addresses, feature flags (key-value) |

---

## Email Notifications

All email sent via SendGrid. In demo mode, emails are suppressed and logged to console.

| Trigger | Recipients | Subject |
|---|---|---|
| New BV request submitted | All admins + clinic staff | `New Benefits Verification Request - [INITIALS]` |
| BV approved or denied | Provider (single) | `BV Request Approved/Denied - [INITIALS]` |
| New lymphedema order | ITS rep (`lymphedema_rep_notification_email`) | `New Lymphedema Order — [Patient]` |
| "Send to supplier" (lymphedema) | Supplier (`lymphedema_submission_email`) | `Lymphedema Order — [Patient]` |
| New ocular order | ITS rep (`ocular_rep_notification_email`) | `New VisiDisc® Order — [Patient] \| [Clinic]` |
| "Send to Skye Biologics" (ocular) | Supplier (`ocular_submission_email`) | `VisiDisc® Order — [Patient] (ITS Approved)` |

Configurable email addresses stored in `system_settings` table. Defaults in code are used if no DB setting exists.

---

## Demo Mode

Activated via `DEMO_MODE=true` and `NEXT_PUBLIC_DEMO_MODE=true` environment variables.

**How it works:**
- No real Supabase users needed — fake UUIDs in `DEMO_FALLBACK_IDS`
- `/demo` page shows a role picker (5 personas)
- Role stored in `demo_role` cookie; all API routes read this cookie via `getDemoRoleFromRequest()`
- `/api/me` returns mock provider/admin data for the active demo role
- Practice tracks per demo role defined in `DEMO_ROLE_TRACKS` (shared between frontend and backend via `lib/demoMode.ts`)
- Emails suppressed in demo mode
- DB queries still run against real demo data seeded by `npm run seed:demo`

**Demo navigation:**
- `/` with no `demo_role` cookie → redirect to `/demo` (role picker)
- Provider role cookie set → show "Your Services" (`/`) with only enabled tracks active
- Admin/clinic_staff cookie → redirect to their respective dashboard
- "Switch Role" button always visible in provider/DR Rep/admin navbars (top-right)
- In-navbar "Switch Demo Role" dropdown: Provider → goes to `/demo` to pick account; DR Rep / Admin → auto-switches

---

## Frontend Architecture

- **`app/`** — Next.js App Router pages; each is a thin shell rendering a client component
- **`components/`** — All UI logic, organized by feature:
  - `components/dashboard/` — Provider dashboard navbar, BV data tables, order modals
  - `components/clinic-staff/` — DR Rep / Admin dashboard shell and all admin tabs
  - `components/auth/` — Sign-in and sign-up flows (provider, clinic-staff, admin)
  - `components/admin/` — Admin-specific views (BAA edit, user creation)
  - `components/landing/` — "Your Services" multi-track landing page
  - `components/demo/` — Role switcher page
  - `components/ui/` — shadcn/ui primitives (Button, Dialog, DropdownMenu, etc.)
- **`store/auth.ts`** — Zustand store: auth status, user, provider, role, enabledTracks, JWT
- **`lib/apiClient.ts`** — `apiGet/apiPost/apiPatch/apiDelete` wrappers used by all client components
- **`lib/demoMode.ts`** — Demo mode detection, role cookie helpers, shared `DEMO_ROLE_TRACKS` and `DEMO_TRACK_LABELS`
- **`hooks/useRouteGuard.ts`** — Client-side auth guard; redirects unauthenticated users, respects demo mode
- **`lib/routeGuard.ts`** — Path classification: public routes, open routes, `getAuthenticatedRedirect()`

**Route guard logic:**
- Unauthenticated + protected path → redirect to `/auth` (or `/admin/signin` for admin paths)
- Authenticated + auth path → redirect to correct dashboard via `getAuthenticatedRedirect()`
- Demo mode → route guard skipped entirely (server-side page.tsx handles redirects)

---

## API Routes Reference

### Authentication
| Method | Path | Description |
|---|---|---|
| POST | `/api/send-otp` | Send OTP to phone via Twilio |
| POST | `/api/verify-otp` | Verify OTP, create Supabase session |
| GET | `/api/me` | Current user profile + enabledTracks |
| PATCH | `/api/me/provider` | Update provider profile |
| POST | `/api/provider-signup` | New provider account |
| POST | `/api/clinic-staff-signup` | New clinic staff account |
| POST | `/api/admin-signup` | New admin account |

### Benefits Verification
| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/bv-requests` | List / create BV requests |
| GET/POST | `/api/bv-requests/[id]` | Get / update BV request |
| POST | `/api/bv-requests/[id]/verify` | Approve or deny BV |
| GET/POST | `/api/bv-requests/[id]/proof` | Approval proof document |
| GET/POST | `/api/bv-forms` | BV form metadata |
| GET | `/api/bv-forms/[id]/download` | Download BV form PDF |
| GET | `/api/wound-sizes` | Wound size options |

### Product Orders
| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/order-products` | List / create product orders |
| GET/POST | `/api/order-products/[id]` | Get / update order |
| GET/POST | `/api/products` | Product catalog |
| GET/POST | `/api/manufacturers` | Manufacturer list |
| GET/POST | `/api/insurances` | Insurance plan list |
| GET/POST | `/api/insurance-routing` | Insurance-manufacturer mappings |

### Medical Devices
| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/lymphedema-orders` | List / create lymphedema orders |
| GET/POST | `/api/lymphedema-orders/[id]` | Get / update order |
| POST | `/api/lymphedema-orders/[id]/send-email` | Submit order to supplier |
| GET/POST | `/api/lymphedema/products` | Lymphedema product catalog |

### Ocular
| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/ocular/orders` | List / create ocular orders |
| GET/POST | `/api/ocular/orders/[id]` | Get / update order |
| POST | `/api/ocular/orders/[id]/send-email` | Submit order to Skye Biologics |
| GET/POST | `/api/ocular/products` | Ocular product catalog |

### Admin & Config
| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/practice-tracks` | List all provider track assignments |
| GET/POST | `/api/practice-tracks/[providerId]` | Get / set tracks for provider |
| GET/POST | `/api/system-settings` | App config key-value store |
| GET | `/api/audit-logs` | DB change history |
| GET | `/api/analytics/outcomes` | Order outcomes analytics |
| GET | `/api/healing-tracker/[bvRequestId]` | Wound measurement history |
| GET/POST | `/api/baa-providers` | BAA agreement records |
| GET/POST | `/api/cms-policy-updates` | CMS policy feed articles |
| GET | `/api/admin-accounts/providers` | All provider accounts |

### Cron Jobs (Vercel Cron)
| Path | Schedule | Description |
|---|---|---|
| `/api/cron/cms-feed-sync` | Daily | Fetch and parse CMS RSS feeds |
| `/api/cron/policy-monitor` | Daily | Check coverage plan URLs for changes |
| `/api/cron/admin-daily-digest` | Daily | Summary email to admins |
| `/api/cron/demo-reset` | Weekly | Reset demo data to seed state |

---

## Key Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase Postgres connection (auto-switches to port 6543 for pooling) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side admin auth operations |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SENDGRID_API_KEY` | Yes | Transactional email |
| `SENDGRID_FROM_EMAIL` | Yes | From address for all emails |
| `APP_URL` | Yes | Base URL for email links (default: `http://localhost:3000`) |
| `DEMO_MODE` | Demo only | Enables demo mode server-side (`"true"`) |
| `NEXT_PUBLIC_DEMO_MODE` | Demo only | Enables demo mode client-side (`"true"`) |
| `NEXT_PUBLIC_ALLOW_INTERNATIONAL_PHONE` | Optional | Enables international phone numbers in signup |
| `FRONTEND_ORIGINS` | Optional | Comma-separated additional CORS origins |
| `ADMIN_NOTIFICATION_EMAIL` | Optional | Fallback email for BV notifications |

---

## Development Commands

```bash
npm run dev           # Next.js dev server on localhost:3000
npm run build         # Production build (also runs on pre-commit via husky)
npm run lint          # ESLint with auto-fix

npm test                        # Run all tests
npx jest --testPathPattern=health   # Single test file

npm run db:generate   # Generate Drizzle migration files
npm run db:push       # Push schema + apply RLS policies
npm run db:push-only  # Push schema without RLS

npm run seed:admin
npm run seed:provider
npm run seed:clinic-staff
npm run seed:bv
npm run seed:insurances
npm run seed:manufacturers:q1
npm run seed:products:q1
```

Pre-commit hook (Husky): runs lint-staged (ESLint fix) → `npm run build`. Commits fail if build breaks.

---

## Testing

Tests live in `backend/__tests__/` using Jest + ts-jest. The `callRoute` helper (`nextApiTestUtils.ts`) constructs real `Request` objects and calls route handlers directly — no HTTP mocking. External deps (Supabase, SendGrid, Drizzle) are mocked at the module level per test file.
