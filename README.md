# DermaRoute — Enterprise B2B Healthcare Procurement Portal

DermaRoute is a **public demonstration and portfolio adaptation** of a privately commissioned B2B healthcare procurement platform engineered for multi-specialty medical distribution workflows.

The system centralizes provider ordering operations across three clinical service lines — wound care tissue products, lymphedema/compression devices, and ocular therapeutics — automating benefits verification, managing medical product fulfillment, capturing compliance agreements electronically, and giving administrators full operational visibility across the procurement lifecycle.

> See [`SYSTEM_OVERVIEW.md`](./SYSTEM_OVERVIEW.md) for complete technical documentation: schema, API routes, middleware pipeline, email triggers, and more.

---

## Live Demo

**Public Deployment:** `https://derma-route.vercel.app/`

Navigate to `/demo` — no credentials required. Select any of five demo personas (three provider accounts, one DR Representative, one Admin) to explore the full portal with fictionalized data.

---

## Service Lines (Practice Tracks)

Each provider clinic is assigned one or more tracks by an admin. Tracks control which dashboards and features are visible.

| Track | Key | Dashboard | Description |
|---|---|---|---|
| Tissue Products & PRP | `wound_care` | `/wound-care/dashboard` | Benefits Verification workflow + product ordering |
| Medical Devices / Equipment | `lymphedema` | `/medical-devices/dashboard` | AIROS Compression Pump & Garment ordering |
| Ocular Products | `ocular` | `/ocular/dashboard` | VisiDisc® amniotic membrane disc ordering |

Multi-track providers land on a **"Your Services"** selector page (`/`). Single-track providers go directly to their dashboard.

---

## User Roles

| Role | Entry Point | Auth Method |
|---|---|---|
| Provider | `/auth` | Phone OTP (Twilio) |
| DR Representative (Clinic Staff) | `/auth` | Phone OTP (Twilio) |
| Admin | `/admin/signin` | Phone OTP (Twilio) |
| Demo Visitor | `/demo` | No credentials — role picker |

---

## Core Features

### Practice Track Assignment
Admins assign tracks per provider clinic from the **Practice Tracks** tab. The provider's enabled tracks gate their dashboard navigation, "Your Services" page, and API access. Stored in the `practice_tracks` table (provider_id + track unique constraint).

### Benefits Verification (BV) Workflow — Wound Care
Multi-step lifecycle: provider submits wound/insurance data → DR Rep reviews → status updated (approved/denied) → provider notified by email → approval proof uploaded to Supabase Storage → product ordering unlocked.

### Product Order Management
Track-specific order forms with patient info, device/product selection, and review steps. Wound care orders include Q-codes, risk scoring (critical/high/standard/low), and insurance routing. Lymphedema and ocular orders generate formatted emails to suppliers on DR Rep approval.

### Healing Tracker
Per-BV-request wound measurement log (size in cm², date, notes). Tracks healing progress over time across all providers visible to the DR Rep or Admin.

### BAA Electronic Signing
HIPAA-style Business Associate Agreement workflow with live signature capture, provider-facing signing, and admin review. Status lifecycle: pending → signed → approved / cancelled.

### Role-Based Dashboard System
- **Provider** — isolated per-track dashboards, own orders only, no cross-provider visibility
- **DR Representative** — unified dashboard across all assigned providers: BV queue, product orders, medical device orders, ocular orders, healing tracker, BAA agreements
- **Admin** — full access including: manufacturer/product catalog, insurance routing, BV form uploads, analytics, audit logs, CMS policy tracker, provider accounts, practice track management, system settings

### Manufacturer & Product Catalog
Products organized by Q-code, wound size, manufacturer, quarter/year. Insurance routing maps insurers to approved manufacturers. BV forms versioned per manufacturer and uploadable by admins.

### Analytics & Reporting
Success rate metrics, order outcome tracking (healed, weeks-to-heal, complications), commission calculations, reorder tracking, and daily admin digest automation.

### CMS Policy Monitoring
Automated sync of Medicare/Medicaid coverage policy RSS feeds. URL hash monitoring detects document changes on coverage plan pages. Policy updates categorized by impact level.

### OTP Authentication
Twilio-backed phone number verification with rate limiting (`otpAbuseGuard` middleware) and abuse protection across all three role types.

### Transactional Email System
SendGrid-powered notifications: new BV request alerts to all DR Reps and Admins, BV approval/denial notifications to providers, order submission emails to suppliers on DR Rep action. All email addresses configurable via the System Settings tab.

### Audit Logging
Postgres-level audit trigger logs every INSERT/UPDATE/DELETE to sensitive tables with old/new data snapshots and actor identity.

### Demo Mode
Full portal exploration without Supabase credentials. Five fixed demo personas with mock API responses. Cookie-based role state. Emails suppressed. DB queries run against seeded demo data. Inactivity auto-logout disabled.

---

## Technical Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn/ui (Radix UI) |
| State Management | Zustand 5 |
| Forms & Validation | React Hook Form + Zod 4 |
| Tables | TanStack Table v8 |
| Database | Supabase PostgreSQL |
| ORM | Drizzle ORM 0.45 |
| Authentication | Supabase Auth + Twilio OTP |
| Email | SendGrid |
| PDF Generation | @react-pdf/renderer 4 |
| Signature Capture | react-signature-canvas |
| Testing | Jest 30 + ts-jest |
| Deployment | Vercel |

---

## Engineering Highlights

- Built a cookie-based **demo mode** that bypasses Supabase auth entirely while preserving per-track route guards, role-based API access, and all middleware logic
- Implemented a custom **Express-style middleware pipeline** (`runServerPipeline`) on top of Next.js App Router route handlers — composing CORS, rate limiting, JWT auth, and role enforcement per-route
- Designed a **practice tracks system** that makes every provider's accessible features fully admin-configurable at runtime without code changes
- Modeled a relational healthcare procurement schema across wound care BV requests, lymphedema/ocular orders, manufacturers, insurance routing, BAA agreements, healing measurements, analytics, and audit logs
- Wired **three independent supplier email workflows** (wound care → ITS rep, lymphedema → Central Palms, ocular → Skye Biologics) with configurable recipient addresses stored in `system_settings`
- Built a unified admin/DR Rep dashboard shell (`ClinicStaffDashboardClient`) that conditionally renders 19 tabs based on role, with per-tab data isolation
- Integrated **CMS RSS feed sync** + URL hash monitoring for automated coverage policy change detection

---

## Route Structure

```
/demo                          Role picker (demo entry point)
/                              "Your Services" — track selector for multi-track providers
/no-tracks                     Fallback page for providers with no tracks assigned

/wound-care/dashboard          Wound Care provider dashboard
/wound-care/orders/new         Submit BV request
/wound-care/orders             BV history
/wound-care/order-products     Product ordering
/wound-care/baa-agreements     BAA signing & status

/medical-devices/dashboard     Lymphedema/Equipment dashboard
/medical-devices/orders/new    New AIROS device order
/medical-devices/orders        Order history

/ocular/dashboard              Ocular products dashboard
/ocular/product-info           VisiDisc® product info
/ocular/orders/new             New ocular order
/ocular/orders                 Order history

/clinic-staff                  DR Representative dashboard (all tracks)
/admin                         Admin dashboard (full access)
/admin/users/new               Create admin/staff account

/auth                          Provider + DR Rep sign-in (OTP)
/admin/signin                  Admin sign-in (OTP)
/signup                        Provider account registration
```

---

## Local Development

```bash
git clone https://github.com/y3p1/B2B_DermaRoute.git
cd B2B_DermaRoute
npm install
cp .env.example .env.local
npm run dev
```

To explore without credentials, set `DEMO_MODE=true` and `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local`, then navigate to `/demo`.

Full local execution requires Supabase, Twilio, and SendGrid developer credentials.

### Key Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase Postgres connection string |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase admin key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SENDGRID_API_KEY` | Transactional email |
| `SENDGRID_FROM_EMAIL` | From address for all outbound email |
| `APP_URL` | Base URL used in email links |
| `DEMO_MODE` | Enables server-side demo routing |
| `NEXT_PUBLIC_DEMO_MODE` | Enables client-side demo behavior |

### Database & Seeding

```bash
npm run db:push            # Apply schema + RLS policies to Supabase
npm run seed:admin         # Seed admin account
npm run seed:provider      # Seed provider accounts
npm run seed:clinic-staff  # Seed DR Rep accounts
npm run seed:bv            # Seed BV request data
npm run seed:products:q1   # Seed product catalog
npm run seed:insurances    # Seed insurance plans
```

---

## Public Demo Disclaimer

DermaRoute is a non-production demonstration build created for portfolio presentation, recruiter evaluation, technical review, and software development showcase purposes.

All users, manufacturers, providers, analytics, notifications, and transactions shown contain fictionalized demo data. Sensitive business references have been anonymized. Private integrations and production credentials have been removed or replaced.

This repository should not be interpreted as a live commercial healthcare platform.

---

## Confidentiality Notice

The original commissioned implementation and all associated proprietary business materials remain private. No confidential client information, production healthcare records, or sensitive infrastructure assets are publicly disclosed within this repository.

---

## Author

Developed and adapted as a public portfolio demonstration by y3p1.
