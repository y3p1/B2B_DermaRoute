# DermaRoute — Implementation Plan for Portfolio Improvement

> **Purpose:** This document is a structured implementation plan for adding new features and skills to the DermaRoute (DR) project, targeting two specific job applications. Feed this to Claude Code at the start of each phase so it has full context.
>
> **Owner:** Shawn Druz Ali
> **Project:** DermaRoute (DR) — B2B healthcare provider portal (demo version of ITS)
> **Repository:** GitHub (private)
> **Live demo:** Deployed on Vercel

---

## Project Context

DermaRoute is a B2B healthcare procurement portal with 3 user roles (provider, clinic_staff/DR Rep, admin) and 3 service tracks (wound care, medical devices, ocular products). It manages benefits verification workflows, product ordering, BAA e-signing, healing tracking, and CMS policy monitoring.

### Current Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Database | Supabase Postgres via Drizzle ORM 0.45 |
| Auth | Supabase Auth (OTP via phone/email) |
| State | Zustand 5 |
| UI | shadcn/ui (Radix UI + Tailwind CSS 4) |
| Forms | React Hook Form + Zod 4 |
| Tables | TanStack Table v8 |
| PDF | @react-pdf/renderer 4 |
| Email | SendGrid (@sendgrid/mail 8) |
| OTP/SMS | Twilio |
| Testing | Jest 30 + ts-jest |
| Deployment | Vercel + Supabase |

### Existing Architecture Patterns

- **API routes:** All in `app/api/**/route.ts` (Next.js App Router)
- **Middleware pipeline:** Every handler uses `runServerPipeline` from `backend/serverPipeline.ts` — bridges Next.js Request/Response to Express-style req/res/next pattern
- **Available middleware:** `corsMiddleware`, `rateLimit`, `requireAuth`, `requireAdmin`, `requireAdminOrClinicStaff`, `otpAbuseGuard`
- **Code layout:**
  - `backend/controllers/` — thin handlers: validate input (Zod), call service, send response
  - `backend/services/` — all business logic and DB queries (Drizzle)
  - `backend/middlewares/` — middleware functions
  - `backend/services/db.ts` — singleton Drizzle client via `getDb()`
- **Demo mode:** Activated via `DEMO_MODE=true` env var. Uses fake UUIDs, cookie-based role switching, suppressed emails, real DB queries against seeded demo data

### Target Job Descriptions (for context on WHY these features matter)

**Job 2 — Full-Time Developer, AI-Accelerated Development (APPLY FIRST):**
- Build complete applications front to back
- Integrate LLMs and agentic AI into real products
- REST APIs, modern web development
- SQL, NoSQL, vector databases, and RAG
- Self-hosted and scalable deployment
- Application requires: Loom video walkthrough + CV + links

**Job 1 — AI Solutions Developer, Full-Stack (APPLY AFTER):**
- Generative AI, agentic workflows, conversational systems
- Containerization with Docker, DevOps practices
- AWS services (Lambda, ECS, Bedrock, SageMaker)
- Automation/orchestration platforms (N8N or equivalent)
- Cloud-native architectures, REST APIs

---

## Phase 1 — RAG Feature in DermaRoute (Weeks 1–2)

**Goal:** Add a RAG-powered clinical document assistant where users can upload CMS policy PDFs and ask natural language questions, receiving grounded answers with source citations.

**Why:** This is the single highest-impact addition for Job 2. It demonstrates LLM integration, vector database usage, and RAG in a real business context (healthcare compliance).

**Cost:** $0 — Gemini free tier + Supabase pgvector (already on free tier)

### Week 1 — Backend RAG Pipeline

#### 1.1 Enable pgvector on Supabase

Run this SQL in the Supabase SQL editor (or via a migration):

```sql
create extension if not exists vector;
```

#### 1.2 Create Drizzle Schema for Document Chunks

Create `db/document-chunks.ts` (all Drizzle schemas live in `db/`, not `backend/schema/`). Export from `db/schema.ts`. Table columns:

- `id` — uuid, primary key, default gen_random_uuid()
- `content` — text, not null (the chunk text)
- `embedding` — vector(3072), not null (`gemini-embedding-001` outputs 3072 dimensions)
- `source_file` — text, not null (original filename)
- `chunk_index` — integer, not null (position in document)
- `metadata` — text, nullable
- `created_at` — timestamp with timezone, default now()

Use `customType` from `drizzle-orm/pg-core` to define the vector column type — Drizzle has no built-in pgvector support.

Also create an index for fast similarity search:

```sql
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

Note: If you have fewer than ~1000 rows during development, use exact search (no index needed) or HNSW instead of IVFFlat. IVFFlat requires training data. For a portfolio demo, a simple `ORDER BY embedding <=> $1 LIMIT 5` without an index is fine and simpler.

Generate and run the Drizzle migration:

```bash
npm run db:generate
npm run db:push
```

#### 1.3 Set Up Gemini API

- Go to https://aistudio.google.com/ and get an API key
- Install the official SDK: `npm install @google/generative-ai` (handles auth and retries)
- Free tier includes:
  - `gemini-embedding-001` model (for embeddings — 3072 dimensions)
  - `gemini-2.5-flash` model (for answer generation)
  - ~10 RPM, ~1,500 requests/day per model
- Add `GEMINI_API_KEY` to `.env.local` and Vercel environment variables

#### 1.4 Build Ingestion Service

Create `backend/services/ragService.ts` (or similar) with an ingestion pipeline:

**Steps:**
1. Accept a PDF file (Buffer or base64)
2. Extract text from PDF — use `pdf-parse` (npm package) or Supabase Storage + server-side extraction
3. Chunk the extracted text into ~500-token segments with ~50-token overlap between chunks. A simple approach: split by paragraphs, then merge small paragraphs and split large ones to hit the target size
4. For each chunk, call the Gemini embedding API via the `@google/generative-ai` SDK:
   ```typescript
   const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
   const result = await model.embedContent(chunkText);
   const vector = result.embedding.values; // 3072-dimensional float array
   ```
   Process in batches of 5 with a 1.5s delay between batches to respect the 10 RPM rate limit.
5. Insert each chunk + embedding into the `document_chunks` table via Drizzle

**Important implementation notes:**
- Process chunks in batches (e.g., 5 at a time) to respect rate limits
- Store the source filename and chunk index for citation purposes
- Follow DR's existing service pattern: this is a service function called by a controller, not logic in the route handler

#### 1.5 Build Query Service

Add a query function to `ragService.ts`:

**Steps:**
1. Accept a user question string
2. Embed the question using the same `gemini-embedding-001` model
3. Perform cosine similarity search against `document_chunks`:
   ```sql
   SELECT id, content, source_file, chunk_index, metadata,
          1 - (embedding <=> $1) as similarity
   FROM document_chunks
   ORDER BY embedding <=> $1
   LIMIT 5
   ```
   Where `$1` is the question embedding vector. The `<=>` operator is pgvector's cosine distance.
4. Pass the retrieved chunks + user question to Gemini Flash for answer generation via the SDK:
   ```typescript
   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
   const result = await model.generateContent(prompt);
   ```
   System prompt should instruct: answer based ONLY on the provided context, cite which source document each claim comes from, say "I don't have enough information" if the context doesn't cover the question.
5. Return the structured response: answer text + array of source citations (file name, chunk excerpt, similarity score)

#### 1.6 Create API Routes

Follow DR's existing patterns exactly:

**`POST /api/rag/ingest`** (admin and clinic_staff only)
- File: `app/api/rag/ingest/route.ts`
- Middleware: `[corsMiddleware, rateLimit, requireAuth, requireAdminOrClinicStaff]`
- Accepts: multipart/form-data with a PDF file
- Controller validates input, calls ingestion service, returns success with chunk count

**`POST /api/rag/query`** (all authenticated users)
- File: `app/api/rag/query/route.ts`
- Middleware: `[corsMiddleware, rateLimit, requireAuth]`
- Accepts: JSON `{ question: string }`
- Zod validation on input
- Controller calls query service, returns `{ answer: string, sources: Source[] }`

**`GET /api/rag/documents`** (admin and clinic_staff only)
- File: `app/api/rag/documents/route.ts`
- Middleware: `[corsMiddleware, rateLimit, requireAuth, requireAdminOrClinicStaff]`
- Returns list of ingested documents (distinct source_file values with chunk counts)

**`DELETE /api/rag/documents/[filename]`** (admin only)
- Deletes all chunks for a given source file
- Middleware includes `requireAdmin`

### Week 2 — Frontend + Integration + Demo Data

#### 2.1 Chat UI Component

Create a new component directory: `components/rag/` or `components/policy-assistant/`

Build a chat-style interface with:
- Message input at the bottom (text input + send button)
- Message bubbles: user questions on the right, AI answers on the left
- Below each AI answer, expandable source citation cards showing: source filename, relevant excerpt, similarity score as a confidence indicator
- Loading state while the query is processing (streaming is optional for v1; a simple loading spinner is fine)
- Use existing shadcn/ui components: Card, Button, Input, ScrollArea, Collapsible

#### 2.2 Document Upload UI

Build an upload interface for admins/DR reps:
- Drag-and-drop zone for PDF files (or click to browse)
- Upload progress indicator
- List of already-ingested documents with chunk count and delete button
- This can be a tab within the clinic-staff or admin dashboard, or a dedicated page

#### 2.3 Wire into DR Navigation

- Add "Policy Assistant" to the sidebar navigation for all roles
- For providers: read-only access (can query, cannot upload)
- For clinic_staff and admin: can upload + query
- Path suggestion: `/policy-assistant` with its own layout

#### 2.4 Demo Mode Handling

Since DR has a demo mode:
- Pre-ingest 2–3 sample CMS policy PDFs during `npm run seed:demo`
- Use real (publicly available) CMS policy documents — e.g., CMS LCD/NCD policies for wound care products, amniotic membrane coverage decisions
- The demo should work out of the box: a demo user can open Policy Assistant and immediately ask questions about the pre-seeded documents
- Add a seed script: `npm run seed:rag-demo` that ingests the sample PDFs

#### 2.5 Testing

- Add tests in `backend/__tests__/rag/` following DR's existing test patterns
- Test the API routes using DR's `callRoute` helper
- Mock the Gemini API calls at the module level
- Test cases: auth guard (401), role guard (403 for provider on ingest), valid query returns answer + sources, query with no relevant documents returns "no information" response

#### 2.6 Deploy

- Add `GEMINI_API_KEY` to Vercel environment variables
- Deploy to Vercel
- Verify the RAG feature works in the live demo
- Test with the seeded demo documents

---

## Phase 2 — Portfolio, Resume, Loom Video, Apply for Job 2 (Week 3)

**Goal:** Update all application materials and submit to the AI Agency Developer role.

This phase is mostly non-code work. Claude Code's role here is limited to helping update the portfolio site if it's also a Next.js project.

### 2.1 Portfolio Updates

- Fix tech stack display: ensure it reflects the actual current stack (Next.js 16, Drizzle ORM, Supabase Auth — not Prisma ORM or NextAuth v5 for DR)
- Add new technologies: pgvector, Gemini API, RAG, vector databases
- Update DR project description to highlight the RAG feature prominently
- Make sure the live demo link works and the RAG feature is accessible

### 2.2 Resume Updates

Add to Technical Skills:
- **AI / LLM:** RAG (Retrieval-Augmented Generation), pgvector, Gemini API, prompt engineering, vector embeddings
- **Developer Tools:** add Claude Code (if you decide to list it)

Update DR project bullets — suggested new bullet:
- "Integrated a RAG-powered clinical document assistant using pgvector and Google Gemini, enabling natural language queries against CMS policy PDFs with source-cited answers grounded in retrieved document passages"

### 2.3 Loom Video Script (3–4 minutes)

Structure:
1. **(30s) Architecture overview:** "This is DermaRoute, a B2B healthcare portal I built. Three user roles, eight business modules, Next.js with Supabase." Show the landing page, flip between roles quickly.
2. **(60s) Backend depth — middleware pipeline:** "What I'm most proud of architecturally is the middleware pipeline. Next.js App Router doesn't have Express-style middleware chaining, so I built `runServerPipeline`..." Show the code briefly. Explain CORS → rate limit → auth → controller flow.
3. **(90s) RAG feature demo:** "The newest addition is a RAG-powered policy assistant." Upload a document (or show pre-seeded ones). Ask a question. Show the answer with source citations. Explain briefly: "Under the hood, documents are chunked, embedded with text-embedding-004, stored in pgvector on Supabase, and queries hit Gemini Flash with the retrieved context."
4. **(30s) AI in development workflow:** "I use AI tooling — Claude Code specifically — to accelerate my development. Migration scripts, test scaffolding, debugging traces. But I review and validate everything; I can walk through any line of this codebase."

### 2.4 Submit Application

- CV (updated)
- Loom video link
- Portfolio link
- GitHub link

---

## Phase 3 — Dockerize DermaRoute (Weeks 4–5)

**Goal:** Containerize DR so it runs locally via `docker-compose up` with zero manual setup.

**Why:** Job 1 explicitly requires "proficiency in containerization and microservices using Docker."

### Week 4 — Dockerfile

#### 3.1 Multi-Stage Dockerfile

Create `Dockerfile` in DR's project root:

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Set build-time env vars as needed
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

**Important:** This requires `output: 'standalone'` in `next.config.js` (or `.ts`). Add it if not already present:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // ... existing config
};
```

#### 3.2 .dockerignore

Create `.dockerignore`:

```
node_modules
.next
.git
.env
.env.*
*.md
docker-compose.yml
Dockerfile
```

### Week 5 — docker-compose + Polish

#### 3.3 docker-compose.yml

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: dermaroute
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.docker
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
```

Note: Use `pgvector/pgvector:pg16` image instead of plain `postgres:16` so pgvector extension is available out of the box.

#### 3.4 Environment File

Create `.env.docker.example` with:

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/dermaroute
SUPABASE_SERVICE_ROLE_KEY=your-key-here
NEXT_PUBLIC_SUPABASE_URL=your-url-here
SENDGRID_API_KEY=your-key-here
SENDGRID_FROM_EMAIL=noreply@example.com
APP_URL=http://localhost:3000
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
GEMINI_API_KEY=your-key-here
```

#### 3.5 README Update

Add a "Running with Docker" section to the README:

```markdown
## Running with Docker

1. Copy `.env.docker.example` to `.env.docker` and fill in your keys
2. Run: `docker-compose up --build`
3. In a separate terminal, run migrations: `docker-compose exec app npm run db:push`
4. Seed demo data: `docker-compose exec app npm run seed:demo`
5. Open http://localhost:3000
```

#### 3.6 Push to GitHub

Commit `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.docker.example`, and the updated README.

---

## Phase 4 — AWS EC2 + N8N Deployment (Week 6)

**Goal:** Self-host N8N on an EC2 instance using Docker.

### 4.1 EC2 Setup

1. Launch a `t2.micro` (free tier eligible) instance with Ubuntu 22.04 LTS AMI
2. Configure security group:
   - SSH (22) — your IP only
   - HTTP (80) — anywhere
   - HTTPS (443) — anywhere
   - Custom TCP (5678) — anywhere (N8N default port; can be removed once behind a reverse proxy)
3. Create or use an existing key pair for SSH access
4. SSH into the instance:
   ```bash
   ssh -i your-key.pem ubuntu@<ec2-public-ip>
   ```

### 4.2 Install Docker on EC2

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker ubuntu
# Log out and back in for group change to take effect
```

### 4.3 Deploy N8N

Create a directory and docker-compose file on EC2:

```bash
mkdir ~/n8n && cd ~/n8n
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=<your-ec2-public-ip>
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://<your-ec2-public-ip>:5678/
      - GENERIC_TIMEZONE=Asia/Manila
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

```bash
docker compose up -d
```

Verify: open `http://<ec2-public-ip>:5678` in browser. N8N should show its setup screen.

### 4.4 Optional: SSL with Caddy

If you want HTTPS (nice to have, not required for portfolio):

```bash
sudo apt install -y caddy
```

Edit `/etc/caddy/Caddyfile`:
```
your-domain.com {
    reverse_proxy localhost:5678
}
```

Then update N8N's `WEBHOOK_URL` to use the domain.

---

## Phase 5 — Wire DR → N8N + Apply for Job 1 (Week 7)

**Goal:** Connect DermaRoute events to N8N workflows via webhooks, then submit Job 1 application.

### 5.1 Create N8N Webhook Workflow

In N8N's UI:
1. Create a new workflow
2. Add a **Webhook** trigger node — this gives you a URL like `http://<ec2-ip>:5678/webhook/<id>`
3. After the webhook node, add processing nodes:
   - **IF** node: check `body.type` (e.g., "bv_request_created" vs "order_created")
   - **Set** node: extract and transform relevant fields
   - **Send Email** node (or HTTP Request to SendGrid): send a notification
4. Activate the workflow

### 5.2 Add Webhook Dispatch to DR

In DR's BV request creation service (in `backend/services/`), add a fire-and-forget webhook call after a successful BV creation:

```typescript
// At the end of the createBvRequest service function, after the DB insert:
const webhookUrl = process.env.N8N_WEBHOOK_URL;
if (webhookUrl) {
  // Fire and forget — don't await, don't let failures break the main flow
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'bv_request_created',
      bvRequestId: newBvRequest.id,
      patientName: newBvRequest.patientName,
      insurancePayer: newBvRequest.insurancePayer,
      providerName: provider.practiceName,
      createdAt: new Date().toISOString(),
    }),
  }).catch((err) => {
    console.error('N8N webhook failed (non-blocking):', err.message);
  });
}
```

Add `N8N_WEBHOOK_URL` to environment variables.

### 5.3 Build a Second Workflow (optional but impressive)

Create an N8N workflow that:
1. Receives the BV webhook
2. Calls the Gemini API to check if the insurance/diagnosis combination is likely to be approved (using prompt engineering, not RAG)
3. Sends an email with a risk assessment: "This BV request for [patient] with [insurance] for [diagnosis] has an estimated [high/medium/low] likelihood of approval based on historical patterns"

This demonstrates agentic workflow orchestration — a key qualification for Job 1.

### 5.4 Final Portfolio + Resume Update

- Add to Technical Skills: Docker, AWS EC2, N8N, webhooks
- Add to Developer Tools: Docker, AWS
- Update DR project description to mention the full architecture:
  - "Architected a multi-service deployment: Next.js app on Vercel, N8N orchestration engine on AWS EC2, RAG pipeline on Supabase pgvector — connected via webhooks for automated BV request processing and LLM-powered policy analysis"

### 5.5 Submit Job 1 Application

- Updated CV with all new skills
- Portfolio link with live demo
- GitHub link showing Docker + N8N + RAG code
- Optional: updated or extended Loom video showing Docker + N8N integration

---

## Phase 6 — Live Data AI Assistant via Tool Calling (Future)

**Goal:** Extend the Policy Assistant to answer questions about live app data — provider orders, BV requests, products, wound measurements — using Gemini's function calling API.

**Why:** Transforms the assistant from a static document Q&A into a true app-aware agent. Demonstrates agentic AI patterns. Combined with Phase 1 RAG, creates a single assistant that handles both policy questions (from PDFs) and operational questions (from live DB).

**Cost:** $0 — Gemini free tier supports function calling.

**Prerequisite:** Phase 1 (RAG) complete. Tool calling shares the same chat UI and API infrastructure.

---

### Architecture

```
User: "What's the status of my last 3 orders?"
  → Gemini sees tool definitions → decides to call getRecentOrders(userId, limit=3)
  → DR executes real Drizzle query (scoped to user's role)
  → Results returned to Gemini → formatted answer
  → Chat UI displays response
```

For questions spanning both docs and live data:
```
User: "Does my insurance cover the product I ordered last week?"
  → Gemini calls getRecentOrders() to find the product
  → Gemini calls queryDocuments() (existing RAG) to check coverage
  → Synthesizes both results into a single answer
```

---

### 6.1 Define Tools

Create `backend/services/assistantTools.ts` — defines the tool schema (what Gemini sees) and the executor (what DR runs):

**Provider-scoped tools (only see their own data):**

| Tool | Description | DB Query |
|------|-------------|----------|
| `getRecentOrders` | Recent product orders for the provider | `order_outcomes` WHERE provider_id = userId |
| `getBVRequests` | Benefits verification request list | `bv_requests` WHERE provider_id = userId |
| `getBVRequestDetail` | Full detail on one BV request | `bv_requests` JOIN `bv_products` WHERE id = $1 |
| `getAvailableProducts` | Browse product catalog | `products` JOIN `manufacturers` |
| `getWoundMeasurements` | Healing progress for a patient | `wound_measurements` WHERE provider_id = userId |

**Clinic staff / admin tools (broader access):**

| Tool | Description |
|------|-------------|
| `getAllBVRequests` | All BV requests (with filters: status, date range, provider) |
| `getAllOrders` | All orders across providers |
| `getProviderList` | List of registered providers |

**Shared tool (all roles):**

| Tool | Description |
|------|-------------|
| `searchPolicyDocuments` | Delegate to existing RAG queryDocuments() |

---

### 6.2 Tool Executor

In `assistantTools.ts`, export an `executeTool(name, args, userId, role)` function:

```typescript
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  role: "provider" | "clinic_staff" | "admin"
): Promise<unknown> {
  switch (name) {
    case "getRecentOrders":
      return getRecentOrders(userId, role, args.limit as number ?? 5);
    case "getBVRequests":
      return getBVRequests(userId, role, args);
    // ... etc
    case "searchPolicyDocuments":
      return queryDocuments(args.question as string); // existing RAG service
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

Role enforcement is inside each tool function — provider can only query their own userId, admin can omit the userId filter.

---

### 6.3 Conversational Query Service

Add `queryWithTools(question, userId, role, conversationHistory?)` to `ragService.ts` (or new `assistantService.ts`):

1. Build tool definitions array (filter by role — provider doesn't get admin tools)
2. Send to Gemini with `tools` param and `tool_config: { function_calling_config: { mode: "AUTO" } }`
3. If Gemini returns `functionCall` → execute tool → send result back as `functionResponse`
4. Loop until Gemini returns text (may call multiple tools in sequence)
5. Return final answer

This replaces the existing `queryDocuments` on the `/api/rag/query` route, OR add a new `/api/assistant/query` route that supports tool calling.

---

### 6.4 API Route Changes

**Option A (recommended): New route, keep existing RAG route**
- Add `app/api/assistant/query/route.ts` — POST, same auth middleware
- Request: `{ question: string, conversationHistory?: Message[] }`
- Response: `{ answer: string, sources?: Source[], toolsUsed?: string[] }`
- Frontend: add toggle or auto-detect which route to use

**Option B: Replace `/api/rag/query`**
- Single route handles both RAG and tool calling
- Simpler for frontend, but breaks existing tests

---

### 6.5 Frontend Changes

PolicyAssistantClient.tsx changes:
- Route to `/api/assistant/query` instead of `/api/rag/query`
- Maintain `conversationHistory` state array — pass last N messages each request (Gemini supports multi-turn)
- Show "checking your orders..." or "looking up coverage..." indicator when tools are in use (use `toolsUsed` in response)
- Sources section still shows RAG citations if `searchPolicyDocuments` tool was called

---

### 6.6 Tests

Add `backend/__tests__/assistant/` tests:
- Tool executor returns role-scoped data (provider can't get other provider's orders)
- Tool calling route returns 401 without auth
- Mock Gemini to return a `functionCall` response → verify tool executes → verify second Gemini call
- Multi-tool response: Gemini calls two tools, final answer includes data from both

---

### Execution Order

| # | Task | Est. effort |
|---|------|-------------|
| 1 | Define tool schemas + executors | 3-4 hrs |
| 2 | Build conversational query service | 2-3 hrs |
| 3 | API route (`/api/assistant/query`) | 1 hr |
| 4 | Frontend changes (conversation history, tool indicators) | 2-3 hrs |
| 5 | Tests | 2 hrs |

**Total: ~10-13 hours**

---

## Environment Variables Summary (Final State)

After all phases, DR's `.env` will include these new variables:

```env
# Existing (unchanged)
DATABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=...
APP_URL=...
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true

# Phase 1 — RAG
GEMINI_API_KEY=your-gemini-api-key

# Phase 5 — N8N
N8N_WEBHOOK_URL=http://your-ec2-ip:5678/webhook/your-webhook-id
```

---

## New Files Created (Summary)

| Phase | File | Purpose |
|---|---|---|
| 1 | `db/document-chunks.ts` | Drizzle schema for RAG chunks table |
| 1 | `backend/services/ragService.ts` | Ingestion + query logic |
| 1 | `app/api/rag/ingest/route.ts` | PDF upload + embedding endpoint |
| 1 | `app/api/rag/query/route.ts` | Question answering endpoint |
| 1 | `app/api/rag/documents/route.ts` | List ingested documents |
| 1 | `components/policy-assistant/` | Chat UI + upload UI |
| 1 | `scripts/seed-rag-demo.ts` | Seed demo CMS policy documents |
| 1 | `backend/__tests__/rag/` | RAG endpoint tests |
| 3 | `Dockerfile` | Multi-stage Next.js container |
| 3 | `docker-compose.yml` | App + Postgres + pgvector |
| 3 | `.dockerignore` | Docker build exclusions |
| 3 | `.env.docker.example` | Template for Docker env vars |

---

## Resume Technical Skills (Target Final State)

**Languages:** TypeScript, JavaScript, SQL
**Frameworks:** Next.js (App Router), React, React Email, Zod, Drizzle ORM
**AI / LLM:** RAG (Retrieval-Augmented Generation), pgvector, Google Gemini API, prompt engineering, vector embeddings
**Cloud & DevOps:** Docker, docker-compose, AWS EC2, Vercel, N8N
**Developer Tools:** Git, GitHub, Claude Code, VSCode, Postman
**Libraries & Platforms:** Tailwind CSS, shadcn/ui (Radix UI), Supabase Auth, JWT, React-PDF, react-signature-canvas
**Databases & Services:** PostgreSQL, Supabase, pgvector, Cloudinary, SendGrid, Twilio, OpenStreetMap Nominatim
