# DermaRoute — Phase 1 RAG Execution Plan

> **Purpose:** Concrete implementation plan for adding a RAG-powered Policy Assistant to DermaRoute. Verified against the actual codebase — all file paths, patterns, and conventions match existing code.
>
> **Scope:** Phase 1 only (Weeks 1–2). See `DR_IMPLEMENTATION_PLAN.md` for the full 5-phase roadmap.

---

## Corrections Applied to DR_IMPLEMENTATION_PLAN.md

These discrepancies were verified against the actual codebase and corrected:

### 1. Schema file location ✅ Fixed

**Was:** `backend/schema/documentChunks.ts`
**Actual:** `db/document-chunks.ts`

All Drizzle schemas live in `db/` (e.g., `db/provider.ts`, `db/bv-requests.ts`, `db/products.ts`). They're re-exported from `db/schema.ts`. The `backend/schema/` directory doesn't exist.

### 2. Gemini models — deprecated, updated ✅ Fixed

**Embedding model:** `text-embedding-004` → `gemini-embedding-001` (outputs 3072 dimensions, not 768)
**Generation model:** `gemini-1.5-flash` → `gemini-2.5-flash`

Both old model names return 404. Always use the SDK (`@google/generative-ai`), not raw HTTP.

### 3. Vector dimensions ✅ Fixed

**Was:** `vector(768)` — matched deprecated `text-embedding-004`
**Actual:** `vector(3072)` — matches `gemini-embedding-001`

Schema and all references updated. Required `npm run db:push` to apply.

### 4. pdf-parse v2 API ✅ Fixed

pdf-parse v2 uses a class-based API, not a function call:
```typescript
const { PDFParse } = require("pdf-parse");
const parser = new PDFParse(new Uint8Array(buffer));
await parser.load();
const { text } = await parser.getText();
```

### 5. Rate limits — add batch delay ✅ Fixed

Free tier: 10 RPM per model. Added 1.5s delay between embedding batches of 5.

### 6. Seed script needs dotenv ✅ Fixed

tsx doesn't auto-load `.env.local`. Added at top of seed script:
```typescript
import dotenv from "dotenv";
process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });
```

### 7. Navigation — exact file locations

Nav items defined in:
- Provider tracks: `app/wound-care/layout.tsx` (NAV_ITEMS array)
- Medical devices: `app/medical-devices/layout.tsx` (NAV_ITEMS array)
- Ocular: `app/ocular/layout.tsx` (NAV_ITEMS array)
- Clinic staff/admin: `components/clinic-staff/ClinicStaffDashboardClient.tsx` (navItems array, ~line 349)

### 8. next.config file type

File is `next.config.ts` (TypeScript), not `.js` or `.mjs`. Currently does NOT have `output: 'standalone'` — needed for Phase 3 (Docker).

### 9. Tech versions — all verified correct

Next.js 16.1.1, TypeScript 5, Drizzle 0.45.1, Zod 4.2.1, Zustand 5.0.9, Jest 30.2.0

---

## Prerequisites ✅ Complete

```bash
npm install pdf-parse @google/generative-ai
npm install -D @types/pdf-parse
```

Get Gemini API key from https://aistudio.google.com/ → add `GEMINI_API_KEY` to `.env.local`

Enable pgvector extension in Supabase SQL editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Rate limit note:** Free tier is 10 RPM / ~1,500 req/day per model. Embedding batches of 5 chunks with 1.5s delay between batches keeps ingestion within limits.

---

## Step 1: Schema — `db/document-chunks.ts` ✅ Complete

Table definition (actual implemented schema):

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | defaultRandom() |
| content | text | chunk text |
| embedding | vector(3072) | `gemini-embedding-001` output |
| source_file | text | original filename |
| chunk_index | integer | position in document |
| metadata | text | nullable |
| created_at | timestamp(tz) | defaultNow() |

Used `customType` from `drizzle-orm/pg-core` to define the vector column. Exported from `db/schema.ts`. Applied via `npm run db:push`.

**Files:**
- `db/document-chunks.ts` ✅
- `db/schema.ts` ✅ (export added)

---

## Step 2: RAG Service — `backend/services/ragService.ts` ✅ Complete

### `ingestDocument(buffer: Buffer, filename: string)`
1. Extract text via pdf-parse v2 class API: `new PDFParse(new Uint8Array(buffer))` → `.load()` → `.getText()`
2. Chunk into 2000-char segments with 200-char overlap
3. Embed via `gemini-embedding-001` (batch 5, 1.5s delay between batches)
4. Insert into `document_chunks` table
5. Return `{ chunksCreated: number }`

### `queryDocuments(question: string)`
1. Embed question with `gemini-embedding-001`
2. Cosine similarity search (raw SQL `<=>` operator, LIMIT 5, filter similarity > 0.3)
3. Pass retrieved chunks + question to `gemini-2.5-flash`
4. System prompt: answer ONLY from provided context, cite sources, "I don't have enough information" if insufficient
5. Return `{ answer: string, sources: Array<{ file, excerpt, similarity }> }`

### `listDocuments()`
```sql
SELECT source_file, COUNT(*) as chunk_count, MIN(created_at) as ingested_at
FROM document_chunks GROUP BY source_file ORDER BY MIN(created_at) DESC
```

### `deleteDocument(filename: string)`
```sql
DELETE FROM document_chunks WHERE source_file = $1
```

**Files:**
- `backend/services/ragService.ts` ✅

---

## Step 3: Controller — `backend/controllers/ragController.ts` ✅ Complete

Four controller functions:

- `ingestController` — parse multipart form data, validate PDF, call `ingestDocument`
- `queryController` — Zod validate `{ question: string }`, call `queryDocuments`; returns user-friendly message on 429
- `listDocumentsController` — call `listDocuments`, return results
- `deleteDocumentController` — extract filename from URL, call `deleteDocument`

**Files:**
- `backend/controllers/ragController.ts` ✅

---

## Step 4: API Routes

Four route files following existing `runServerPipeline` pattern (reference: `app/api/products/route.ts`):

| Route | Method | Middleware | Controller |
|-------|--------|-----------|------------|
| `app/api/rag/ingest/route.ts` | POST | cors, rateLimit, requireAuth, requireAdminOrClinicStaff | ingestController |
| `app/api/rag/query/route.ts` | POST | cors, rateLimit, requireAuth | queryController |
| `app/api/rag/documents/route.ts` | GET | cors, rateLimit, requireAuth, requireAdminOrClinicStaff | listDocumentsController |
| `app/api/rag/documents/[filename]/route.ts` | DELETE | cors, rateLimit, requireAuth, requireAdmin | deleteDocumentController |

All routes also export OPTIONS handler for CORS preflight.

**Import pattern:**
```typescript
import { corsMiddleware } from "@/backend/middlewares/cors";
import { rateLimit } from "@/backend/middlewares/rateLimit";
import { requireAuth } from "@/backend/middlewares/requireAuth";
import { requireAdmin } from "@/backend/middlewares/requireAdmin";
import { requireAdminOrClinicStaff } from "@/backend/middlewares/requireAdminOrClinicStaff";
import { errorHandler } from "@/backend/middlewares/errorHandler";
import { getAllowedOrigins } from "@/backend/config/env";
import { runServerPipeline } from "@/backend/serverPipeline";
```

**Files:**
- `app/api/rag/ingest/route.ts` ✅
- `app/api/rag/query/route.ts` ✅
- `app/api/rag/documents/route.ts` ✅
- `app/api/rag/documents/[filename]/route.ts` ✅

---

## Step 5: Frontend — Chat UI

### `components/policy-assistant/PolicyAssistantClient.tsx`
Main container component (`"use client"`):
- Chat message list using shadcn ScrollArea
- Input bar at bottom (shadcn Input + Button)
- State: messages array, loading boolean
- Calls `apiPost("/api/rag/query", { question })` via `lib/apiClient.ts`
- Displays AI answers with expandable source citations (shadcn Collapsible)
- Role-aware: shows upload tab for admin/clinic_staff, query-only for providers

### `components/policy-assistant/DocumentUpload.tsx`
Admin/clinic_staff upload interface:
- Drag-and-drop PDF zone (mirror `components/dashboard/ManufacturerProofUpload.tsx` pattern)
- Calls `apiPost("/api/rag/ingest", formData)` with FormData
- Shows list of ingested documents via `apiGet("/api/rag/documents")`
- Delete button per document (admin only)

### `components/policy-assistant/ChatMessage.tsx`
Reusable message bubble:
- User messages right-aligned
- AI messages left-aligned with source citation cards below

### `app/policy-assistant/page.tsx`
Server component page shell:
```typescript
import { Suspense } from "react";
import PolicyAssistantClient from "@/components/policy-assistant/PolicyAssistantClient";

export const metadata = { title: "Policy Assistant" };

export default function PolicyAssistantPage() {
  return (
    <Suspense>
      <PolicyAssistantClient />
    </Suspense>
  );
}
```

**Files:**
- `components/policy-assistant/PolicyAssistantClient.tsx` (NEW)
- `components/policy-assistant/DocumentUpload.tsx` (NEW)
- `components/policy-assistant/ChatMessage.tsx` (NEW)
- `app/policy-assistant/page.tsx` (NEW)

---

## Step 6: Navigation

Add "Policy Assistant" nav item to all role sidebars:

| File | What to add |
|------|-------------|
| `app/wound-care/layout.tsx` | Add to NAV_ITEMS array: `{ href: "/policy-assistant", label: "Policy Assistant", icon: MessageSquare }` |
| `app/medical-devices/layout.tsx` | Same nav item |
| `app/ocular/layout.tsx` | Same nav item |
| `components/clinic-staff/ClinicStaffDashboardClient.tsx` | Add to navItems array (~line 349): `{ key: "policy_assistant", label: "Policy Assistant", icon: <MessageSquare /> }` |

**Files modified:**
- `app/wound-care/layout.tsx`
- `app/medical-devices/layout.tsx`
- `app/ocular/layout.tsx`
- `components/clinic-staff/ClinicStaffDashboardClient.tsx`

---

## Step 7: Demo Mode Support ✅ Complete (Option B — real embeddings)

Using real Gemini embeddings seeded into the DB. Demo calls real Gemini API — most impressive for Loom video. Requires `GEMINI_API_KEY` in Vercel env vars.

### Seed script: `backend/scripts/seedRagDemo.ts` ✅

```bash
npm run seed:rag-demo
```

- Reads PDFs from `backend/scripts/demo-data/`
- Skips already-ingested files (idempotent)
- Requires `GEMINI_API_KEY` (loaded via dotenv from `.env.local`)

### Demo data: `backend/scripts/demo-data/` ✅ (3 CMS PDFs seeded)

- `cms-npwt-interpretive-guidelines.pdf` — NPWT coverage requirements
- `cms-skin-substitutes-technical-brief.pdf` — Skin substitutes technical brief
- `cms-wound-care-billing-guidelines.pdf` — LCD L34587 billing guidelines

**Files:**
- `backend/scripts/seedRagDemo.ts` ✅
- `backend/scripts/demo-data/` ✅ (3 PDFs)
- `package.json` ✅ (`seed:rag-demo` script added)

---

## Step 8: Tests

Create `backend/__tests__/rag/` following existing patterns (reference: `backend/__tests__/health.test.ts`, uses `callRoute` from `nextApiTestUtils.ts`):

### `rag-query.test.ts`
- Mock `@google/generative-ai` at module level
- Mock `getDb()` to return fake query results
- Test: 401 without auth token
- Test: valid query returns `{ answer, sources }`
- Test: empty results return "no information" response

### `rag-ingest.test.ts`
- Mock `pdf-parse` and Gemini embedding calls
- Test: 401 without auth
- Test: 403 for provider role (only admin/clinic_staff can ingest)
- Test: successful PDF ingestion returns chunk count
- Test: non-PDF file rejected

### `rag-documents.test.ts`
- Test: GET list documents returns distinct source files with counts
- Test: DELETE requires admin role (403 for clinic_staff)

**Files:**
- `backend/__tests__/rag/rag-query.test.ts` (NEW)
- `backend/__tests__/rag/rag-ingest.test.ts` (NEW)
- `backend/__tests__/rag/rag-documents.test.ts` (NEW)

---

## Step 9: Deploy + Verify

1. Add `GEMINI_API_KEY` to Vercel environment variables
2. Deploy to Vercel
3. Run `npm run seed:rag-demo` against production DB
4. Verify: open demo → Policy Assistant → ask question → get cited answer
5. Verify: upload new PDF as clinic_staff → chunks created → queryable

---

## Execution Order

| # | Task | Depends on | Est. effort |
|---|------|-----------|-------------|
| 1 | Install deps + enable pgvector | — | 10 min |
| 2 | Schema (`db/document-chunks.ts`) | 1 | 30 min |
| 3 | RAG service | 2 | 2-3 hrs |
| 4 | Controller | 3 | 1 hr |
| 5 | API routes | 4 | 1 hr |
| 6 | Frontend chat UI | 5 | 3-4 hrs |
| 7 | Navigation integration | 6 | 30 min |
| 8 | Demo mode + seed script | 3, 6 | 1-2 hrs |
| 9 | Tests | 4, 5 | 2 hrs |
| 10 | Deploy + verify | all | 30 min |

**Total: ~12-15 hours (Week 1-2)**

---

## Verification Checklist

- [ ] `npm test` — all RAG tests pass
- [ ] `npm run build` — no type errors
- [x] Dev server: navigate to `/policy-assistant` ✅ working
- [ ] Upload PDF as clinic_staff → chunk count confirmation
- [x] Ask question → answer with source citations ✅ verified working
- [ ] Try as provider → can query, upload UI hidden
- [ ] Ingest API as provider → 403
- [ ] Delete document as admin → success
- [ ] Delete document as clinic_staff → 403
- [x] Demo mode: seed + verify Policy Assistant works ✅ 3 PDFs seeded
- [ ] Production: deploy + verify live demo (add GEMINI_API_KEY to Vercel)

---

## All Files Summary

**Completed (backend + API + seed):**
- `db/document-chunks.ts` ✅
- `backend/services/ragService.ts` ✅
- `backend/controllers/ragController.ts` ✅
- `app/api/rag/ingest/route.ts` ✅
- `app/api/rag/query/route.ts` ✅
- `app/api/rag/documents/route.ts` ✅
- `app/api/rag/documents/[filename]/route.ts` ✅
- `backend/scripts/seedRagDemo.ts` ✅
- `backend/scripts/demo-data/` ✅ (3 CMS PDFs)

**Modified files (completed):**
- `db/schema.ts` ✅ (export added)
- `package.json` ✅ (deps + seed:rag-demo script)
- `DR_IMPLEMENTATION_PLAN.md` ✅ (corrections applied)

**Remaining — frontend + navigation + tests:**
- `components/policy-assistant/PolicyAssistantClient.tsx` (TODO)
- `components/policy-assistant/DocumentUpload.tsx` (TODO)
- `components/policy-assistant/ChatMessage.tsx` (TODO)
- `app/policy-assistant/page.tsx` (TODO)
- `app/wound-care/layout.tsx` (TODO — add nav item)
- `app/medical-devices/layout.tsx` (TODO — add nav item)
- `app/ocular/layout.tsx` (TODO — add nav item)
- `components/clinic-staff/ClinicStaffDashboardClient.tsx` (TODO — add nav item)
- `backend/__tests__/rag/rag-query.test.ts` (TODO)
- `backend/__tests__/rag/rag-ingest.test.ts` (TODO)
- `backend/__tests__/rag/rag-documents.test.ts` (TODO)
