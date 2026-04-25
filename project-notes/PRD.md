# Integrity Tissue Solutions (ITS) — Web Platform

**Version:** 2.0 (Revised)
**Stack:** Next.js + TypeScript · Supabase · Vercel · Twilio · SendGrid · GitHub

---

## 1. Project Overview

Integrity Tissue Solutions (ITS) is a wound care product distribution company. This platform is a web-based portal that connects clinics/providers with the ITS admin team to streamline Benefits Verification (BV), product ordering, and compliance tracking.

**Three core workflows:**

1. Provider onboarding & account management
2. Benefits Verification (BV) — guided product recommendation based on insurance + wound data
3. Product ordering — clinics order, admins manage

---

## 2. User Roles & Permissions

| Role                  | Key Permissions                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Provider / Clinic** | Register, submit BV requests, place orders (only after BV approved), upload manufacturer proof, view own data                                                            |
| **Admin**             | View/manage all orders and BV submissions, approve/verify BV requests, countersign BAAs, manage products/manufacturers/insurances/BV forms, user management, analytics, policy tracking |

---

## 3. Tech Stack

| Layer           | Technology                                                                 |
| --------------- | -------------------------------------------------------------------------- |
| Frontend        | Next.js (App Router) + React + TypeScript + Tailwind CSS                   |
| UI              | shadcn/ui (Radix), TanStack Table, Lucide icons                            |
| Forms           | React Hook Form + Zod, React Signature Canvas                              |
| State           | Zustand (auth store)                                                       |
| Backend         | Next.js API routes (app/api/) with controller/service pattern              |
| Database        | PostgreSQL via Supabase, Drizzle ORM                                       |
| Auth            | Supabase Auth — phone OTP sign-in (Twilio Verify for signup OTP)           |
| Email           | SendGrid (transactional emails)                                            |
| SMS             | Twilio (OTP verification + critical alerts)                                |
| Storage         | Supabase Storage (BV form PDFs, BAA signatures, manufacturer proofs)       |
| Deployment      | Vercel                                                                     |
| Version Control | GitHub                                                                     |

> ⚠️ Supabase must be upgraded to Pro upon production deployment.

---

## 4. Milestone 1 — Database, Account Creation & Core Workflows

**Status: ✅ Implemented**

### 4.1 Provider Registration Flow

Multi-step, HIPAA-aware onboarding:

| Step | Description                                                                           |
| ---- | ------------------------------------------------------------------------------------- |
| 1    | Collect provider info — name, title, clinic details                                   |
| 2    | Phone number verification via SMS (Twilio)                                            |
| 3    | Provider agrees to BAA (Business Associate Agreement) — includes a digital signature field |
| 4    | Provider reviews all submitted information                                            |
| 5    | Account created — provider is auto-logged in and directed to dashboard (one-time session only; expires after 30 minutes of inactivity) |

> ⚠️ The post-registration auto-login is a one-time session. After 30 minutes of inactivity or on next visit, the provider must sign in via phone number (OTP) verification.

**BAA Signature UI Requirements:**

- Signature field with on-screen instruction: _"On a computer: Click, hold and drag. On a phone/tablet: Touch and drag."_
- Sample/reference signature image shown
- Date pre-filled using EST timezone
- ITS brand logo displayed

**Post-Registration:**

- Provider account is active immediately (no approval gate)
- Admin receives email notification of new provider registration

### 4.2 Admin Account Creation

- Admin and staff accounts created internally — no public registration
- Admin can create new admin accounts from the dashboard
- Full CRUD access to users, products, manufacturers, and BV data

### 4.3 Database Schema (Supabase + Drizzle ORM)

| Table                          | Purpose                                    |
| ------------------------------ | ------------------------------------------ |
| `provider_acct`                | Provider/clinic profiles                   |
| `admin_acct`                   | Admin user records                         |
| `bv_requests`                  | BV form submissions and status             |
| `bv_forms`                     | BV form PDF files per manufacturer         |
| `bv_products` / `order_products` | Product orders + wound size associations |
| `products`                     | Product catalog                            |
| `manufacturers`                | Manufacturer records (Tides Medical, Ox Medical, Venture, Tiger) |
| `insurances`                   | Insurance types (categorized as commercial / non-commercial) |
| `baa_provider`                 | BAA agreement records and signatures       |
| `enums`                        | provider_role, baa_status, approver_role   |

**Key Rules:**

- RLS (Row Level Security) enabled on all tables
- Supabase Storage for BV PDFs, BAA signatures, and manufacturer approval proofs
- Products, manufacturers, and insurances must be editable via admin dashboard (changes may occur at any time — no code deploy required)

### 4.4 BAA Management

- Two-stage digital signature flow: provider signs → admin countersigns
- Signatures stored in Supabase Storage
- Status workflow: signed → pending → approved
- Email notifications on status changes
- Admin can download the signed BAA agreement PDF from the admin dashboard

### 4.5 BV (Benefits Verification) Workflow

Triggered when provider clicks "New BV."

| Step | Description                                                                                          |
| ---- | ---------------------------------------------------------------------------------------------------- |
| 1    | Provider inputs: insurance type, wound type, wound size (dropdown), wound location, and other clinical details |
| 2    | Provider inputs: patient info and delivery info                                                      |
| 3    | Provider reviews all entered information                                                             |
| 4    | BV request submitted — admin notified via email                                                      |

**Wound Size Dropdown Options:**

_Discs (round):_
- 6mm Disc → 0.283 cm² (radius = 0.3 cm)
- 12mm Disc → 1.131 cm² (radius = 0.6 cm)
- 15mm → 1.767 cm² (radius = 0.75 cm)
- 16mm Disc → 2.011 cm² (radius = 0.8 cm)

_Square and Rectangular:_
- 1x1cm → 1 cm²
- 1.5x1.5cm → 2.25 cm²
- 1.5x2cm → 3 cm²
- 2x2cm → 4 cm²
- 2x3cm → 6 cm²
- 2x4cm → 8 cm²
- 3x3cm → 9 cm²
- 3x3.5cm → 10.5 cm²
- 3x4cm → 12 cm²
- 4x4cm → 16 cm²
- 4x6cm → 24 cm²
- 4x8cm → 32 cm²
- 5x5cm → 25 cm²
- 6x8cm → 48 cm²
- 7x7cm → 49 cm²

**Post-BV Submission:**

- Admin receives email notification
- Admin reviews and verifies/approves the BV request
- Provider receives email notification of status change

### 4.6 BV Forms Management

- Upload BV form PDFs per manufacturer (OX, TIDE, Tiger, etc.)
- Filter by manufacturer, commercial type, search
- Signed URL downloads (1hr expiry), bulk download
- Full CRUD with storage cleanup on delete

> ⚠️ BV forms and product lists change quarterly — must be updatable by admin from the dashboard.

### 4.7 Product Orders (Basic)

- Create orders linked to BV requests
- Status tracking: pending → shipped → completed / cancelled
- Admin CRUD with edit/delete

### 4.8 Product Catalog

- Manufacturers, Products, Insurances — full CRUD for each
- Products include Q-codes, pricing, wound size associations, commercial flag
- Quarter/year tracking for pricing periods

### 4.9 Admin Dashboard

- 7+ tabs: Product Orders, BV Requests, BAA Providers, Products, Manufacturers, Insurances, BV Forms
- Searchable data tables with pagination and skeleton loading
- Verification modals, confirmation dialogs, status badges

### 4.10 Provider Dashboard

- Summary view of past BV requests and orders
- "New BV" button — initiates Benefits Verification flow
- "Order Product" button — initiates order flow
- Must be fully responsive and mobile-friendly

### 4.11 Notifications

- SendGrid email: new BV requests, account creation, BAA status changes
- Professional HTML templates
- Batch sending to all admins

### 4.12 Security

- RLS policies for all tables + storage buckets
- Role-based middleware (requireAuth, requireAdminOrClinicStaff)
- OTP rate limiting (server + client side)

---

## 5. Milestone 2 — Advanced Features

**Status: 🔲 Not yet implemented**

### 5.1 BV-Gated Ordering

A provider must have an approved BV before they can place an order. The "Order Product" button must be locked/disabled until a BV is in approved status.

### 5.2 Insurance Routing Logic

Automated product recommendation based on insurance type:

- Commercial insurance → Venture Medical
- Medicare / Medicare Advantage → Ox, Tiger, Extremity Care

BV Step 3 should recommend the correct product(s) and list all relevant BV forms. Each form must be individually clickable with a clear instruction: *"Here are the product recommendation forms. Click a form to download it."* A "Download All" option must also be available. The provider can download one or all forms — auto-downloading all forms at once without user action is not acceptable. The submit button is unlocked as soon as at least one form has been downloaded.

> ⚠️ This routing logic is subject to change. Insurance-to-manufacturer mappings must be configurable from the admin dashboard via a routing table — no code deploy required to update rules.

### 5.3 Manufacturer Proof Upload

- After BV approval, provider must manually submit the BV form to the manufacturer (HIPAA — no direct transmission)
- Provider uploads proof of manufacturer approval (screenshot/file) back to the platform
- Ordering is only unlocked after proof is uploaded and verified

### 5.4 Order Product Workflow (Enhanced)

Triggered when provider clicks "Order Product" (only enabled after BV approved + manufacturer proof uploaded).

| Step | Description                                                          |
| ---- | -------------------------------------------------------------------- |
| 1    | Provider fills in patient information                                |
| 2    | Provider fills in delivery details                                   |
| 3    | Order submitted → provider sees "Order Submitted" confirmation screen |

**Post-Order:**

- Admin receives email notification
- Order appears in the admin dashboard order log for tracking and fulfillment

### 5.5 Policy Tracker (2-Tab Dashboard)

**Tab 1 — Coverage Database**

- Manual entry: Add any Medicare Advantage or Commercial insurance plan
- Fields: Insurer, Plan Name, Covered Products, Restrictions, Policy URL
- Auto-monitor: System checks each policy URL daily for changes
- Status flags: ✅ Current / ⚠️ Needs Review (policy updated)
- Search by insurer, plan name, or product name
- Quick reference lookup: e.g., _"Does Aetna cover Biovance?"_

**Tab 2 — CMS Policy Updates**

- Automated daily monitoring of CMS.gov + all Medicare MAC sites
- Filter to only surface articles relevant to wound care (keywords: skin substitute, graft, PRP, wound care, Q-code)
- Filter by: Medicare MAC region, category (Grafts / PRP), full-text search
- Impact level flags: High / Medium
- Unread counter showing new updates since last visit

### 5.6 Admin Analytics

Full predictive analytics pipeline built into the admin dashboard:

| Event              | System Action                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Order submitted    | Hidden risk score calculated; A1C checked (blocks if >12%); product size optimizer runs                                  |
| Risk alert         | Critical risk → immediate SMS to admin; standard orders → daily 8 AM digest                                              |
| Admin reviews order | Sees predicted success rate (e.g., _"Patients like this heal 60% with Kerecis"_) and best product recommendation        |
| Post-application   | Provider or admin logs outcome: healed (yes/no), weeks to heal, complications                                            |
| Re-order tracking  | System flags patients based on a configurable day threshold (default: 7–21 days post-application); tracks progress toward 10-application limit; admin can adjust the flag window from the dashboard |
| Analytics loop     | Outcomes feed back into the model to improve future recommendations over time                                            |

### 5.7 Healing Factor Tracker

Automatic wound healing benchmark monitor, embedded in the admin dashboard:

| Wound Type             | Healing Target                               |
| ---------------------- | -------------------------------------------- |
| Diabetic foot ulcers   | 50% size reduction by Week 4                 |
| Venous leg ulcers      | 40% size reduction by Week 4                 |
| Pressure ulcers        | 10% reduction per week, evaluated at Week 4  |
| MOHS (acute)           | No benchmark — tracked only                  |

**How it works:**

- Provider inputs a single number: current wound size
- System auto-calculates % reduction from the original baseline measurement
- Displays result with color coding: _"Week 4: 25% reduction (Target: 50%)"_
- Red alert badge if below benchmark → admin sees top 3 highest-profit alternative product suggestions
- Application counter displayed: _"4 of 10 applications"_

### 5.8 Supabase Realtime

- New orders appear in real-time on the admin dashboard (Supabase Realtime subscriptions)
- Live status updates without page refresh

### 5.9 Audit Logs

| Table        | Purpose                        |
| ------------ | ------------------------------ |
| `audit_logs` | System-wide activity logging   |

- Audit triggers on all write operations
- Viewable by admin

---

## 6. Static / Legal Pages

**Status: 🔲 Not yet implemented**

- Privacy Policy
- HIPAA Notice
- Terms of Service / other required legal pages

---

## 7. Non-Functional Requirements

| Requirement      | Detail                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Responsiveness   | All pages fully responsive — desktop, tablet, mobile                                                                       |
| HIPAA Compliance | No direct manufacturer data transmission; manual form submission + proof upload by provider; RLS enforced                   |
| Security         | Supabase RLS on all tables, audit log triggers, BAA at registration                                                        |
| Authentication   | Supabase Auth — phone OTP via Twilio                                                                                       |
| Notifications    | Email (orders, BV submissions, approvals) via SendGrid + SMS (OTP verification, critical risk alerts) via Twilio           |
| Scalability      | Supabase Pro plan required at deployment                                                                                   |
| Data Freshness   | Products, manufacturers, and BV forms must be updatable by admin without a code deploy                                     |
