# PRD vs Codebase Audit & Implementation Roadmap

**Last updated:** 2026-03-30

---

## PRD vs Codebase Audit

### Milestone 1 — Core Workflows

| PRD Section | Feature | Status | Notes |
|---|---|---|---|
| **4.1** Provider Registration | Multi-step signup (5 steps) | **Done** | All steps implemented including BAA signing |
| **4.1** 30-min inactivity timeout | Session expires after idle | **Not done** | PRD updated but no code implements this |
| **4.2** Admin Account Creation | Internal admin signup | **Done** | Includes clinic staff role too |
| **4.3** Database Schema | All core tables | **Done** | All tables exist, insurances have commercial flag |
| **4.4** BAA Management | Two-stage signature flow | **Done** | Provider signs, admin countersigns, status workflow works |
| **4.4** BAA PDF download (admin) | Admin downloads signed BAA | **Not done** | View/sign exists, no download/export button |
| **4.5** BV Workflow | 4-step BV submission | **Done** | Full flow with wound type, size, location, insurance |
| **4.5** Wound Size Dropdown | Full disc + rectangular list | **Done** | Seeded values match PRD exactly |
| **4.6** BV Forms Management | Upload/filter/download PDFs | **Done** | CRUD, signed URLs, bulk download, manufacturer filter |
| **4.7** Product Orders (Basic) | Create/track orders | **Done** | Status tracking, admin CRUD |
| **4.8** Product Catalog | Products/Manufacturers/Insurances CRUD | **Done** | Q-codes, pricing, commercial flags, quarter tracking |
| **4.9** Admin Dashboard | 7+ tabs | **Done** | All tabs functional with data tables |
| **4.10** Provider Dashboard | BV requests, orders, BAA view | **Done** | Tabs working |
| **4.11** Notifications | SendGrid email + Twilio SMS | **Done** | Templates for BV, BAA, account creation, batch sending |
| **4.12** Security | RLS, middleware, rate limiting | **Done** | Per-table RLS, role-based middleware, OTP abuse guards |

### Milestone 2 — Advanced Features

| PRD Section | Feature | Status | Notes |
|---|---|---|---|
| **5.1** BV-Gated Ordering | Lock orders until BV approved | **Partial** | API filters for approved BVs only, but UI button not visually disabled |
| **5.2** Insurance Routing Logic | Auto-recommend products by insurance | **Partial** | Binary commercial flag routing exists, but hardcoded — no admin-configurable routing table. BV form download UX updated: forms are now listed individually as clickable items with per-form download buttons + a "Download All" option. Auto-downloading all forms at once removed. |
| **5.3** Manufacturer Proof Upload | Provider uploads approval proof | **Not done** | DB field `approvalProofUrl` exists, no UI |
| **5.4** Enhanced Order Workflow | Multi-step provider ordering | **Not done** | Basic order modal exists, not the full guided flow |
| **5.5** Policy Tracker | Coverage DB + CMS monitoring | **Not done** | No tables, no UI, no scraping logic |
| **5.6** Admin Analytics | Risk scoring, predictions, re-order tracking | **Not done** | No analytics, no configurable thresholds |
| **5.7** Healing Factor Tracker | Wound benchmark monitoring | **Not done** | Mock UI template exists (commented out), no data model |
| **5.8** Supabase Realtime | Live dashboard updates | **Not done** | Currently polling every 60s, no WebSocket subscriptions |
| **5.9** Audit Logs | System-wide activity logging | **Not done** | No table, no triggers |
| **6** Legal/Static Pages | Privacy, HIPAA, ToS | **Not done** | No pages exist |

---

## Sequential Implementation Roadmap

Ordered by dependency chain and priority.

### Phase 1 — Complete Milestone 1 Gaps

- [x] **1. Implement 30-minute inactivity timeout** — Add client-side idle detection that clears the Supabase session after 30 min of inactivity. On next visit, redirect to OTP sign-in.

- [x] **2. Add BAA PDF download for admin** — Add a download button to the admin BAA provider view that exports the signed agreement as a PDF (the `AgreementPDF` component with react-pdf already exists).

### Phase 2 — Core Milestone 2 (BV-to-Order Pipeline)

- [x] **3. Complete BV-gated ordering UI** — Visually disable the "Order Product" button on the provider dashboard when no approved BV exists. Show a tooltip explaining why it's locked.

- [x] **4. Build admin-configurable insurance routing table** — Create a new `insurance_routing` table mapping insurance types to manufacturers/products. Build an admin UI tab to manage these mappings. Replace the hardcoded commercial-flag logic with lookups against this table.

- [x] **5. Implement manufacturer proof upload** — Build a provider-facing UI to upload proof of manufacturer approval (screenshot/file) to Supabase Storage. Link to the existing `approvalProofUrl` field. Add admin verification status.

- [x] **6. Build enhanced order product workflow** — Replace the basic order modal with a multi-step guided flow: patient info → delivery details → confirmation. Gate it behind BV approval + manufacturer proof uploaded.

- [x] **7. Add order submission email notification** — Send email to admins when a new order is placed (if not already wired up for enhanced flow).

### Phase 3 — Analytics & Tracking

- [x] **8. Create re-order tracking data model + UI** — Design `admin_settings` table for configurable thresholds. Build the Re-Order Log tab with live data from order_products + bv_requests. Add admin-configurable day threshold setting.

- [x] **9. Build Healing Factor Tracker** — Create `wound_measurements` table for tracking wound size over time. Uncomment and connect the existing mock UI to real data. Implement benchmark calculations and color-coded alerts.

- [x] **10. Build Admin Analytics dashboard** — Risk scoring model, predicted success rates, A1C checks, product size optimizer. Daily digest emails. This is the most complex feature — may warrant its own milestone breakdown.

### Phase 4 — Compliance & Monitoring

- [ ] **11. Implement Audit Logs** — Create `audit_logs` table with triggers on all write operations. Build admin-viewable audit log UI.

- [ ] **12. Build Policy Tracker — Tab 1 (Coverage Database)** — New tables for insurance plans + covered products. Admin CRUD UI. Daily URL monitoring for policy changes with status flags.

- [ ] **13. Build Policy Tracker — Tab 2 (CMS Policy Updates)** — CMS.gov + Medicare MAC scraping pipeline. Keyword filtering for wound care. Impact level flags, unread counter.

### Phase 5 — Real-time & Polish

- [ ] **14. Upgrade to Supabase Realtime** — Replace 60s polling with WebSocket subscriptions for live order/BV updates on admin and clinic staff dashboards.

- [ ] **15. Create Legal/Static Pages** — Privacy Policy, HIPAA Notice, Terms of Service. These need actual legal content from the client.
