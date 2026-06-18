# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev           # Next.js dev server on localhost:3000
npm run build         # Production build (also runs on pre-commit via husky)
npm run lint          # ESLint (auto-fixes on pre-commit via lint-staged)

# Testing
npm test                        # Run all tests
npx jest backend/__tests__/health.test.ts   # Run a single test file

# Database (Drizzle ORM + Supabase Postgres)
npm run db:generate   # Generate migration files
npm run db:push       # Push schema + apply RLS policies
npm run db:push-only  # Push schema without RLS

# Seeding
npm run seed:admin
npm run seed:bv
npm run seed:clinic-staff
npm run seed:provider
npm run seed:insurances
npm run seed:manufacturers:q1
npm run seed:products:q1
```

**Pre-commit hook** (`husky`): runs `lint-staged` (ESLint fix) then `npm run build`. Commits will fail if the build breaks.

## Environment Variables

Required at runtime:
- `DATABASE_URL` — Supabase Postgres connection string (automatically switched to port 6543 for transaction pooling)
- `SUPABASE_SERVICE_ROLE_KEY` — server-side admin key (never expose as `NEXT_PUBLIC_`)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` — transactional email
- `APP_URL` — base URL used in email links (defaults to `http://localhost:3000`)

Optional:
- `NEXT_PUBLIC_ALLOW_INTERNATIONAL_PHONE=true` — enables international phone numbers in signup
- `FRONTEND_ORIGINS` — comma-separated additional CORS origins

## Architecture

### Three User Roles

| Role | Dashboard | Auth path |
|------|-----------|-----------|
| `provider` | `/dashboard` | `/auth` → OTP via Twilio |
| `clinic` (clinic staff) | `/clinic-staff` | `/auth` |
| `admin` | `/admin` | `/admin/signin` |

Route protection runs in two layers: a `ClientLayout` (`app/client-layout.tsx`) that checks auth state on every render via `useRouteGuard`, and per-request middleware in the API pipeline.

### API Request Pipeline

Next.js App Router route handlers (`app/api/**/route.ts`) do **not** use the Next.js middleware file. Instead, every route manually composes a middleware stack using `runServerPipeline` (`backend/serverPipeline.ts`), which bridges Next.js `Request`/`Response` objects to an Express-style `req/res/next` pattern. A typical route looks like:

```ts
export async function GET(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, rateLimit, requireAuth],
    handler: myController,
    errorHandler,
  });
}
```

Available middleware: `cors`, `rateLimit`, `requireAuth`, `requireAdmin`, `requireAdminOrClinicStaff`, `otpAbuseGuard`.

After `requireAuth` runs, downstream handlers access the user via `res.locals.userId`, `res.locals.user`, and `res.locals.accessToken`.

### Backend Layer (`backend/`)

- **`controllers/`** — thin handlers that validate input (Zod), call services, and send responses
- **`services/`** — all business logic and database queries using Drizzle ORM
- **`middlewares/`** — Express-style middleware functions
- **`services/db.ts`** — singleton Drizzle client (`getDb()`)
- **`services/supabaseAdmin.ts`** — Supabase admin client for auth operations
- **`services/sendgrid.service.ts`** — all transactional email templates (BV requests, BAA, product orders, provider account notifications)
- **`utils/httpError.ts`** — `HttpError` class; throw it in services to propagate HTTP status codes

### Database Schema (`db/`)

Schema is split into one file per domain, all re-exported from `db/schema.ts`. Key tables:
- `provider_acct` — provider profiles linked to Supabase `auth.users`
- `admin_acct` — admin accounts with `role` field
- `clinic_staff_acct` — clinic staff accounts
- `bv_requests` — Benefits Verification requests (core domain object)
- `baa_provider` — Business Associate Agreements
- `products`, `manufacturers`, `bv_products` — product catalog
- `order_outcomes` — product order lifecycle
- `wound_measurements` — healing tracker data

Schema changes require `npm run db:push` to apply to Supabase, followed by manual RLS policy updates if needed (see `scripts/applyRls.ts`).

### Frontend Layer

- **`app/`** — Next.js App Router pages; each page is a thin shell that renders a client component
- **`components/`** — all UI logic organized by feature (`dashboard/`, `clinic-staff/`, `admin/`, `auth/`)
- **`components/ui/`** — shadcn/ui primitives (Radix UI + Tailwind)
- **`lib/apiClient.ts`** — fetch wrapper used by all client components to call API routes
- **`lib/supabaseClient.ts`** — browser Supabase client
- **`hooks/useRouteGuard.ts`** — client-side auth guard; redirects unauthenticated users
- **`lib/routeGuard.ts`** — path classification constants (`PUBLIC_ROUTE_PREFIXES`, etc.)

### Testing

Tests live in `backend/__tests__/` and use Jest + `ts-jest`. Tests call route handlers directly via `callRoute` helper (`nextApiTestUtils.ts`) which constructs a real `Request` object — no mocking of HTTP internals. External dependencies (Supabase, SendGrid, Drizzle) are mocked at the module level in each test file.

Run a specific test: `npx jest --testPathPattern=health`

Frontend Website Rules

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or user says so.

## Local Server
- **Always serve on localhost** — never screenshot a `file:///` URL.
- Start the dev server: `node serve.mjs` (serves the project root at `http://localhost:3000`)
- `serve.mjs` lives in the project root. Start it in the background before taking any screenshots.
- If the server is already running, do not start a second instance.

## Screenshot Workflow
- Puppeteer is installed at `C:/Users/nateh/AppData/Local/Temp/puppeteer-test/`. Chrome cache is at `C:/Users/nateh/.cache/puppeteer/`.
- **Always screenshot from localhost:** `node screenshot.mjs http://localhost:3000`
- Screenshots are saved automatically to `./temporary screenshots/screenshot-N.png` (auto-incremented, never overwritten).
- Optional label suffix: `node screenshot.mjs http://localhost:3000 label` → saves as `screenshot-N-label.png`
- `screenshot.mjs` lives in the project root. Use it as-is.
- After screenshotting, read the PNG from `temporary screenshots/` with the Read tool — Claude can see and analyze the image directly.
- When comparing, be specific: "heading is 32px but reference shows ~24px", "card gap is 16px but should be 24px"
- Check: spacing/padding, font size/weight/line-height, colors (exact hex), alignment, border-radius, shadows, image sizing

## Output Defaults
- Single `index.html` file, all styles inline, unless user says otherwise
- Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT`
- Mobile-first responsive

## Brand Assets
- Always check the `brand_assets/` folder before designing. It may contain logos, color guides, style guides, or images.
- If assets exist there, use them. Do not use placeholders where real assets are available.
- If a logo is present, use it. If a color palette is defined, use those exact values — do not invent brand colors.

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Pick a custom brand color and derive from it.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body. Pair a display/serif with a clean sans. Apply tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. No exceptions.
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens — not random Tailwind steps.
- **Depth:** Surfaces should have a layering system (base → elevated → floating), not all sit at the same z-plane.

## Hard Rules
- Do not add sections, features, or content not in the reference
- Do not "improve" a reference design — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color

