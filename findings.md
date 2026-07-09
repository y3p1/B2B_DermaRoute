# DermaRoute — Full Codebase Review

**Date:** 2026-07-09
**Scope:** Security, correctness, performance, architecture, data integrity
**Method:** 8 parallel review agents, deduplicated to 44 findings

---

## Fix Status

| Severity | Found | Fixed | Skipped |
|----------|-------|-------|---------|
| Critical | 9 | 9 | 0 |
| High | 11 | 10 | 1 |
| Medium | 15 | 7 | 8 |
| Low | 9 | 8 | 1 |
| **Total** | **44** | **34** | **10** |

Skipped items are architectural changes too large for batch fix (#10 serverless rate-limit needs external store, #21 React error boundaries, #22 dynamic imports, #23 Realtime subscription filtering, #24 RAG batch embedding, #25 timestamp consistency, #26 polymorphic FK, #28 monolith refactor, #33 jsonb validation, #39 Supabase localStorage).

---

## Critical

### 1. [FIXED] Unauthenticated signed-URL endpoint exposes all private storage files
- **File:** `app/api/signed-url/route.ts:14`
- **Category:** Missing auth
- **Impact:** POST with arbitrary bucket/path generates a signed URL using the service-role key. No auth, no CORS, no rate limiting. Any unauthenticated user can download BAA documents, medical records, proof-of-delivery uploads, and BV form files.

### 2. [FIXED] Public admin signup allows anyone to create admin accounts
- **File:** `app/api/admin-signup/route.ts:18`
- **Category:** Missing auth
- **Impact:** POST /api/admin-signup creates an admin account with role='admin'. Only protection is rate limiting (10/min). Unlike /api/admin-accounts (which requires requireAuth + requireAdmin), this endpoint is fully open. Attacker gains full admin access to all patient data, orders, and system settings.

### 3. [FIXED] Unauthenticated email endpoints allow spam/phishing through your SendGrid account
- **File:** `app/api/send-test-email/route.ts:4`, `app/api/send-test-bv-email/route.ts`
- **Category:** Missing auth
- **Impact:** Anyone can POST to send emails through your SendGrid account to arbitrary addresses. The BV test email variant sends realistic medical notification emails useful for phishing. No auth, CORS, or rate limiting. Can exhaust SendGrid quota and get your domain blacklisted.

### 4. [FIXED] Cron endpoints bypass auth entirely when CRON_SECRET is unset
- **File:** `app/api/cron/*/route.ts` (all 4 endpoints)
- **Category:** Auth bypass
- **Impact:** Guard is `if (process.env.CRON_SECRET && ...)` which short-circuits to allow when env var is missing. Anyone can trigger admin-daily-digest (sends real emails), demo-reset (wipes data), cms-feed-sync, and policy-monitor. CRON_SECRET also accepted via query parameter, leaking it to logs.

### 5. [FIXED] SSRF via user-supplied monitorUrl — can probe internal services and cloud metadata
- **File:** `backend/services/coveragePlans.service.ts:199`
- **Category:** SSRF
- **Impact:** checkPolicyUrl fetches user-supplied URLs with no scheme/host validation. An authenticated admin/clinic-staff user can probe internal services (http://169.254.169.254/ for cloud IAM credentials, http://localhost:5432/, internal APIs). Stored RSS feed URLs have the same issue.

### 6. [FIXED] Mass assignment in order updates — attacker can overwrite riskScore, riskTier, createdByType
- **File:** `backend/controllers/productOrders.controller.ts:339`
- **Category:** Mass assignment
- **Impact:** No Zod validation; req.body cast with TypeScript annotation only. The service spreads `...updates` into Drizzle's `.set()`. Attacker can send extra fields like riskScore, riskTier, createdByType that pass through to the DB update. Same pattern in cmsPolicyUpdates, coveragePlans, and thresholdSettings controllers.

### 7. [FIXED] HTML injection in all email templates — user-supplied fields rendered unescaped
- **File:** `backend/services/sendgrid.service.ts:262` (throughout)
- **Category:** Injection
- **Impact:** practiceName, provider, patientInitials, woundType, notes, clinicName, and other user-supplied fields are interpolated directly into HTML email bodies via template literals. Enables phishing via fake login forms, credential harvesting, and link spoofing in email clients that render HTML.

### 8. [FIXED] Prompt injection in RAG queries — user input concatenated directly into Gemini prompt
- **File:** `backend/services/ragService.ts:146`
- **Category:** Injection
- **Impact:** User query is concatenated after "Question:" with no sanitization or system/user message boundary. Attacker can inject instructions to leak full document contents (bypassing the 400-char excerpt limit), produce harmful content, or manipulate CMS policy responses.

### 9. [FIXED] Demo mode bypasses all auth via unauthenticated cookie
- **File:** `backend/middlewares/requireAuth.ts:15`
- **Category:** Auth bypass
- **Impact:** When DEMO_MODE=true, requireAuth grants access based solely on an unauthenticated demo_role cookie/header/query param. If accidentally left on in production, anyone sets `demo_role=admin` cookie and gets full admin privileges.

---

## High

### 10. [SKIPPED] In-memory rate limiting is ineffective on serverless (Vercel)
- **File:** `backend/middlewares/rateLimit.ts:11`, `otpAbuseGuard.ts:25`
- **Category:** Security
- **Impact:** Rate-limit state is in a Map that resets on each cold start. Attacker can brute-force OTP verification or flood signup endpoints because counters reset across instances. The OTP abuse guard's 3-attempt lockout never triggers reliably.

### 11. [FIXED] Zero database indexes defined — all FK columns and filter columns use sequential scans
- **File:** `db/*.ts` (all schema files)
- **Category:** Performance
- **Impact:** Not a single explicit index in the schema. Critical unindexed columns: bv_requests.provider_id, order_products.bv_request_id, wound_measurements.bv_request_id, audit_logs.table_name/action/created_at. Performance degrades linearly with data growth; audit_logs (append-only) will fail first.

### 12. 8 tables missing RLS policies, including patient-facing lymphedema and ocular orders
- **File:** `db/lymphedema-orders.ts`, `db/ocular-orders.ts`, +6 others
- **Category:** Data access
- **Impact:** lymphedema_orders, ocular_orders, lymphedema_products, ocular_products, practice_tracks, system_settings, document_chunks, and wound_sizes have no RLS. If RLS is enforced globally, queries return empty; if not enforced, any authenticated user can read/write all rows regardless of role.

### 13. [FIXED] FK cascade issues — deleting BV requests, insurances, or manufacturers crashes with unhandled constraint violations
- **File:** `db/bv-products.ts:47`, `db/insurance-routing.ts:10`
- **Category:** Data integrity
- **Impact:** order_products.bv_request_id FK defaults to NO ACTION. deleteBvRequest() does a bare DELETE with no child cleanup, so deleting any BV request with linked orders throws Postgres 23503 error (HTTP 500). Same for insurance and manufacturer deletes when routing rules exist.

### 14. [FIXED] Multiple unbounded queries return full tables on every dashboard load
- **File:** `backend/services/bvRequests.service.ts:79`, `productOrders.service.ts:93`, `healingTracker.service.ts:282`
- **Category:** Performance
- **Impact:** listAllBvRequests, listAllOrderProducts, getWoundCases all return every record with no LIMIT. As data grows to thousands of rows, dashboard loads become sluggish, response payloads grow to megabytes, and concurrent requests risk Node.js heap exhaustion.

### 15. [FIXED] Missing transactions on multi-step DB operations leave inconsistent state on failure
- **File:** `backend/services/tracks.service.ts:75`, `healingTracker.service.ts:571`, `providerSignup.service.ts:441`
- **Category:** Data integrity
- **Impact:** updateProviderTracks disables all tracks then inserts new ones without a transaction — crash between steps leaves provider with zero tracks. deleteWoundCase updates flag then deletes measurements — partial failure leaves hidden but undeleted data. Provider signup spans auth user creation, DB insert, storage upload, and BAA insert without atomicity.

### 16. [FIXED] XSS via dangerouslySetInnerHTML with unsanitized markdown output
- **File:** `components/api-docs/ApiDocsClient.tsx:72`
- **Category:** XSS
- **Impact:** Fetches from /api/api-documentation, parses with 'marked' library, renders raw HTML via dangerouslySetInnerHTML. The marked library does not sanitize HTML by default. If the source content includes injected HTML/JS, it executes in the viewer's browser.

### 17. [FIXED] Double-encoded JSON in CMS policy keywords — stored as string instead of array
- **File:** `backend/services/cmsPolicyUpdates.service.ts:170`
- **Category:** Data corruption
- **Impact:** JSON.stringify() called on data.keywords before inserting into a jsonb column, but Drizzle auto-serializes. The DB stores a double-encoded string like `"[\"wound\",\"graft\"]"` instead of the array `["wound","graft"]`. Keyword filtering, display, and search all silently break.

### 18. [FIXED] No file size or chunk limit on RAG PDF ingestion — unbounded Gemini API cost
- **File:** `backend/services/ragService.ts:60`
- **Category:** Cost control
- **Impact:** A 50MB+ PDF can produce 27,000+ chunks, each triggering a paid Gemini embedding API call with retry. Serial processing with 1.5s delays means hours of execution. Multiple users ingesting simultaneously can exhaust the Gemini API quota for the entire project.

### 19. [FIXED] PII logged to server console — email addresses, OTP codes in cleartext
- **File:** `backend/services/sendgrid.service.ts:101`, `twilio.service.ts:34`
- **Category:** Logging
- **Impact:** sendBatchEmail logs full recipient lists. Demo mode logs OTP codes in cleartext. If DEMO_MODE is accidentally enabled in staging/prod, real OTP codes are logged. Email addresses tied to patient BV requests in logs may violate HIPAA minimum-necessary requirements.

### 20. [FIXED] Error handler writes stack traces to predictable file via sync I/O
- **File:** `backend/middlewares/errorHandler.ts:13`
- **Category:** Info disclosure
- **Impact:** appendFileSync writes full stack traces (including DB connection strings, file paths, user IDs) to 'error_logs.txt'. Synchronous write blocks the event loop under error storms. If the file is served or readable, sensitive internals are exposed.

---

## Medium

### 21. [SKIPPED] Zero React error boundaries in entire codebase
- **File:** `components/` (entire directory)
- **Category:** Resilience
- **Impact:** Components rendering @react-pdf/renderer documents, SignatureCanvas, or async data can throw at render time. Without error boundaries, any throw unmounts the entire page to a blank white screen with no recovery.

### 22. [SKIPPED] Static @react-pdf/renderer imports bundle ~500KB upfront on 4 pages
- **File:** `components/dashboard/LymphedemaOrderPdf.tsx:4`, `BaaProviderViewClient.tsx:8`, `SignupStep3Agreement.tsx:8`
- **Category:** Bundle size
- **Impact:** LymphedemaOrderPdf.tsx statically imports Document/Page/Text/View from react-pdf. Since ReMarxOrderDocument is re-exported and imported by orders/new and orders/[id]/pdf pages, those inherit the full bundle upfront. BaaProviderViewClient and SignupStep3Agreement also import pdf() statically.

### 23. [SKIPPED] Supabase Realtime subscriptions unfiltered — every provider's write triggers all dashboards to refetch
- **File:** `components/dashboard/ProviderDashboardClient.tsx:349`, `ClinicStaffDashboardClient.tsx:321`
- **Category:** Performance
- **Impact:** Realtime channels subscribe to ALL changes on bv_requests and order_products (event: '*', no filter). With 50 providers connected, a single BV request update triggers 50 simultaneous full-table refetch API calls. O(N) amplification per write.

### 24. [SKIPPED] N+1 API calls in RAG embedding — each chunk embedded one at a time
- **File:** `backend/services/ragService.ts:53`
- **Category:** Performance
- **Impact:** Each text chunk is embedded via a serial for-loop calling Gemini API individually. A 50-page PDF makes 50 sequential API calls with 1.5s sleeps between batches. Gemini supports batch requests but the code doesn't use them.

### 25. [SKIPPED] Timestamp timezone inconsistency across schema
- **File:** `db/bv-requests.ts`, `db/bv-products.ts`, `db/products.ts`, +7 others
- **Category:** Data integrity
- **Impact:** 10 tables use timestamp without TZ, 15 use timestamptz. Cross-table queries joining created_at from different tables produce incorrect time comparisons if server timezone differs from UTC.

### 26. [SKIPPED] Polymorphic FK pattern on 4 tables with zero referential integrity
- **File:** `db/bv-requests.ts:41`, `db/bv-products.ts:49`, `db/order-outcomes.ts:28`, `db/wound-measurements.ts:22`
- **Category:** Data integrity
- **Impact:** verified_by/recorded_by/created_by columns store a UUID + varchar type discriminator but have no FK constraints. Deleting an admin or clinic_staff account leaves dangling UUIDs.

### 27. [FIXED] BaaStatus TypeScript type narrower than DB enum
- **File:** `backend/services/baaProvider.service.ts:28`
- **Category:** Type mismatch
- **Impact:** BaaStatus = 'pending' | 'signed' but DB enum includes 'approved' and 'cancelled'. Admin writes 'approved' to the status column, but the type guard can't represent it. Approved BAAs may display as pending.

### 28. [SKIPPED] Monolithic ProviderDashboardClient — 1383 lines, 30+ useState
- **File:** `components/dashboard/ProviderDashboardClient.tsx:137`
- **Category:** Architecture
- **Impact:** Every state update re-renders the entire component including all 5 tabs' filter/pagination logic, navItems array with new JSX elements, and all callback closures. Typing in BV search recomputes product order pagination, BAA filters, etc.

### 29. [FIXED] Race condition in order creation — product/BV can change between read and insert
- **File:** `backend/services/productOrders.service.ts:27`
- **Category:** Correctness
- **Impact:** createOrderProduct reads product and BV request in two queries before inserting the order, without a transaction. Product name or BV status could change between read and insert (TOCTOU). Orders can be created against rejected BV requests because status isn't checked.

### 30. [FIXED] Hardcoded demo passwords committed to git
- **File:** `backend/scripts/demo/seedDemoUsers.ts:14`
- **Category:** Secrets
- **Impact:** 'DemoProvider2024!', 'DemoAdmin2024!', 'DemoClinicStaff2024!' are hardcoded and committed. If the repo is public/leaked and the demo Supabase instance is accessible, these credentials grant authenticated access.

### 31. [FIXED] Duplicate Drizzle client at lib/drizzle.ts bypasses connection pooling config
- **File:** `lib/drizzle.ts:5`
- **Category:** Config
- **Impact:** Second Drizzle client uses raw DATABASE_URL without the port-6543 pooling swap. If imported instead of backend/services/db.ts, direct connections to port 5432 exhaust Supabase's connection limit under load.

### 32. [FIXED] Visibility + focus event listeners both fire refresh without debounce
- **File:** `components/clinic-staff/ClinicStaffDashboardClient.tsx:343`
- **Category:** Performance
- **Impact:** Switching tabs fires BOTH visibilitychange and focus events nearly simultaneously, producing 4 concurrent API calls (2 per event). Rapid tab-switching amplifies this.

### 33. [SKIPPED] Unstructured jsonb columns for patient PII with no schema validation
- **File:** `db/lymphedema-orders.ts:24`, `db/ocular-orders.ts`
- **Category:** Data integrity
- **Impact:** Patient data (name, DOB, address, insurance) stored in unvalidated jsonb. Any client can insert malformed objects. Downstream PDF generation and order processing will crash or produce corrupt documents on missing/wrong-typed fields.

### 34. [FIXED] Postgres error details leaked to client
- **File:** `backend/controllers/insurances.controller.ts:96`
- **Category:** Info disclosure
- **Impact:** Non-unique-violation Postgres errors return raw error code, message, detail, constraint name, table name, column name, and schema name to the client, revealing internal database structure.

### 35. [FIXED] X-Forwarded-For trusted at face value — rate limits bypassable via header spoofing
- **File:** `backend/serverPipeline.ts:24`
- **Category:** Security
- **Impact:** getClientIp uses the first comma-separated value from X-Forwarded-For. Attacker sends a spoofed IP header with each request, getting a fresh rate-limit bucket per IP. While Vercel's edge overwrites XFF, this is fragile if deployment topology changes.

---

## Low

### 36. [FIXED] CORS Allow-Methods/Allow-Headers set unconditionally on non-allowed origins
- **File:** `backend/middlewares/cors.ts:19`
- **Category:** Config
- **Impact:** Allow-Methods and Allow-Headers are set regardless of origin. Only Allow-Origin is conditional. Leaks API surface to non-allowed origins for reconnaissance.

### 37. [FIXED] LIKE wildcard injection in search parameters
- **File:** `backend/services/auditLog.service.ts:56`, `bvForms.service.ts:51`
- **Category:** Query logic
- **Impact:** Search param interpolated into `ilike('%${search}%')` without escaping LIKE wildcards. Not SQL injection (Drizzle parameterizes), but user can send '%' to match all records or probe IDs with `_` wildcards.

### 38. [FIXED] Missing OPTIONS exports on multiple API routes break CORS preflight
- **File:** `app/api/demo/reset/route.ts:14`, `app/api/bv-requests/[id]/route.ts:24`
- **Category:** API design
- **Impact:** Routes with POST/PATCH/DELETE but no OPTIONS export return 405 on CORS preflight. Cross-origin requests from browser-based admin tools fail silently.

### 39. [SKIPPED] Supabase session stored in localStorage — vulnerable to XSS token theft
- **File:** `store/auth.ts:188` (Supabase default behavior)
- **Category:** Token storage
- **Impact:** Standard Supabase behavior. Any XSS vulnerability allows reading the JWT from localStorage. Mitigated if no XSS exists, but finding #16 (dangerouslySetInnerHTML) creates a potential vector.

### 40. [FIXED] handleSendEmail uses raw fetch() bypassing apiClient, silently swallows server errors
- **File:** `components/clinic-staff/LymphedemaOrdersTab.tsx:85`
- **Category:** Correctness
- **Impact:** HTTP error responses (500, 400) are silently ignored. User gets no feedback that the email failed. Only network failures are caught. Also bypasses centralized error handling and token refresh logic.

### 41. [FIXED] Internal IDs (Supabase user ID, provider_acct ID) exposed in notification emails
- **File:** `backend/services/sendgrid.service.ts:759`
- **Category:** Info disclosure
- **Impact:** Provider-account-created email includes raw Supabase auth user ID and internal provider_acct ID. UUIDs aren't directly exploitable but leak internal identifiers to recipients.

### 42. [FIXED] API documentation endpoint publicly exposes full API surface
- **File:** `app/api/api-documentation/route.ts:6`
- **Category:** Reconnaissance
- **Impact:** Unauthenticated endpoint serves full API documentation including all endpoints, parameters, and auth details, making targeted attacks easier to craft.

### 43. [FIXED] sendEmail interface accepts arbitrary 'from' parameter without validation
- **File:** `backend/services/sendgrid.service.ts:30`
- **Category:** Config
- **Impact:** Currently no external caller passes user-supplied 'from', but the interface is unnecessarily permissive. SendGrid itself enforces sender verification as a backstop.

### 44. [FIXED] Unauthenticated env-check endpoint discloses whether JWT_SECRET_KEY is configured
- **File:** `app/api/api-docs-env-check/route.ts:4`
- **Category:** Reconnaissance
- **Impact:** GET /api/api-docs-env-check returns whether JWT auth is configured. Provides reconnaissance about security configuration to unauthenticated users.
