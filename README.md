# Dermaroute — Enterprise B2B Wound Care Procurement Portal

Dermaroute is a **public demonstration and portfolio adaptation** of a privately commissioned Business-to-Business (B2B) healthcare procurement platform engineered for wound care distribution workflows.

The system was designed to centralize provider ordering operations, automate benefits verification requests, manage medical product fulfillment, capture compliance agreements electronically, and provide administrators with operational visibility across the procurement lifecycle.

This repository exists exclusively for technical showcase, portfolio presentation, and recruiter evaluation purposes while preserving all confidential client information.

---

## Live Demo

**Public Deployment:**  
`https://derma-route.vercel.app/`

> Demo environment uses fictionalized data and sanitized business records.

---

## Enterprise Capabilities

### Benefits Verification (BV) Workflow
Multi-step BV request lifecycle from provider submission through insurance verification, admin review, and status tracking.

### Product Order Management
End-to-end healthcare ordering pipeline with provider requests, fulfillment coordination, and operational visibility.

### BAA Electronic Signing
HIPAA-style Business Associate Agreement workflow with live signature capture and PDF document generation.

### Role-Based Dashboard System
Dedicated isolated dashboards for providers, clinic staff, and administrators with permission-based access control.

### Manufacturer & Product Catalog
Structured wound care product management with Q-codes, wound-size SKUs, and pricing workflows.

### Healing Tracker
Wound measurement logging and healing progress monitoring over time.

### Analytics & Reporting
Administrative reporting dashboards, BV summaries, operational metrics, and daily digest automation.

### CMS Policy Monitoring
Automated synchronization of Medicare/Medicaid coverage policy references.

### OTP Authentication
Twilio-backed phone verification with rate limiting and abuse protection.

### Transactional Email System
SendGrid-powered workflow notifications for account events, BV status updates, and order tracking.

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript |
| Styling | Tailwind CSS, shadcn/ui (Radix UI) |
| Backend/API | Next.js Route Handlers |
| Database | Supabase PostgreSQL |
| ORM | Drizzle ORM |
| Authentication | Supabase Auth + Twilio OTP |
| Email | SendGrid Transactional Email |
| PDF Generation | React-PDF (`@react-pdf/renderer`) |
| Signature Capture | `react-signature-canvas` |
| Testing | Jest + ts-jest |
| Deployment | Vercel |

---

## Engineering Highlights

- Architected a full-stack SaaS platform spanning **3 isolated user roles**, **8+ enterprise business modules**, and **10+ protected backend workflows**
- Integrated external services for OTP verification, transactional email delivery, and server-side document generation
- Built secure role-based access control and protected backend API routing
- Modeled relational healthcare procurement schemas for benefits verification, orders, manufacturers, analytics, signatures, and healing tracking
- Implemented asynchronous notification workflows and scheduled operational automations
- Sanitized a confidential commissioned implementation into a publicly deployable technical showcase

---

## User Roles

| Role | Entry Point | Authentication |
|---|---|---|
| Provider | `/auth` | Phone OTP (Twilio) |
| Clinic Staff | `/auth` | Phone OTP (Twilio) |
| Admin | `/admin/signin` | Email + Password (Supabase) |

---

## Local Development

```bash
git clone https://github.com/y3p1/B2B_DermaRoute.git
cd dermaroute
npm install
cp .env.example .env.local
npm run dev
```

Additional services such as Supabase, Twilio, and SendGrid require developer-owned credentials for local execution.

### Environment Variables

A sample environment template is provided through `.env.example`.

Sensitive production credentials and private infrastructure details are intentionally excluded from this repository.

---

## Public Demo Disclaimer

Dermaroute is a non-production demonstration build created for:

- portfolio presentation,
- recruiter evaluation,
- technical review,
- and software development showcase purposes.

Accordingly:

- all users, manufacturers, providers, analytics, notifications, and transactions shown in the system contain fictionalized demo data,
- all operational records are non-production examples,
- sensitive business references have been anonymized,
- private integrations and production credentials have been removed or replaced.

This repository should not be interpreted as a live commercial healthcare platform.

---

## Confidentiality Notice

The original commissioned implementation and all associated proprietary business materials remain private.

No confidential client information, production healthcare records, protected operational data, or sensitive infrastructure assets are publicly disclosed within this repository.

See:

- `CLIENT_CONFIDENTIALITY.md`
- `DEMO_DATA_NOTICE.md`

for additional details.

---

## Important Reviewer Note

Please evaluate Dermaroute strictly as a technical demonstration build.

Any names, records, workflows, metrics, addresses, manufacturers, suppliers, analytics, or dashboard entries displayed throughout the application are intentionally fictionalized for demo presentation purposes and do not correspond to real operational business data.

---

## Author

Developed and adapted as a public portfolio demonstration by y3p1.