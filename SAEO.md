# DermaRoute — SEO & AEO Optimization Plan

> **Goal:** Make the public surface of DermaRoute search-optimized (SEO) and answer-engine-optimized (AEO — citable by ChatGPT, Perplexity, Google AI Overviews).

## Scope & honest expectations

DermaRoute is **mostly gated** (provider/admin dashboards behind auth). SEO/AEO only helps the **public surface**:

- `/` — landing page
- `/demo` — role switcher
- `/legal/privacy-policy`, `/legal/terms-of-service`

Everything else (dashboards, `/api/*`, `/auth`) should be **blocked from indexing**.

**Reality check:** this will not outrank established healthcare sites for generic terms — it's a demo. The real ROI is twofold: (1) the site becomes technically excellent and citable, and (2) it **demonstrates the SEO/AEO skill itself** — valuable for the job application.

## Current state (baseline)

- Root metadata = bare `title` + `description` only ([app/layout.tsx](app/layout.tsx))
- **Missing:** `metadataBase`, OpenGraph/Twitter tags, canonical, `robots.ts`, `sitemap.ts`, OG image, real favicon, JSON-LD structured data, `llms.txt`

---

## SEO foundations

### 1. Upgrade root metadata — `app/layout.tsx`

Add `metadataBase`, title template, canonical, OpenGraph + Twitter:

```ts
export const metadata: Metadata = {
  metadataBase: new URL("https://derma-route.vercel.app"),
  title: {
    default: "DermaRoute — B2B Wound Care Procurement Portal",
    template: "%s | DermaRoute",
  },
  description:
    "DermaRoute routes benefit verifications, product ordering, and CMS policy intelligence for wound care providers. Built with Next.js, Supabase, and a RAG-powered policy assistant.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://derma-route.vercel.app",
    title: "DermaRoute — B2B Wound Care Procurement Portal",
    description:
      "Benefit verification, ordering, and AI policy assistant for wound care providers.",
    siteName: "DermaRoute",
  },
  twitter: {
    card: "summary_large_image",
    title: "DermaRoute",
    description: "B2B wound care portal with an AI policy assistant.",
  },
};
```

### 2. `app/robots.ts` — index public, block app/api

**Critical:** keep dashboards out of search.

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/demo", "/legal/"],
        disallow: [
          "/admin",
          "/clinic-staff",
          "/wound-care",
          "/ocular",
          "/medical-devices",
          "/policy-assistant",
          "/auth",
          "/api/",
        ],
      },
    ],
    sitemap: "https://derma-route.vercel.app/sitemap.xml",
  };
}
```

### 3. `app/sitemap.ts` — only public URLs

```ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://derma-route.vercel.app";
  return ["", "/demo", "/legal/privacy-policy", "/legal/terms-of-service"].map(
    (p) => ({
      url: `${base}${p}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: p === "" ? 1 : 0.6,
    }),
  );
}
```

### 4. OG image — `app/opengraph-image.tsx`

Generate a dynamic 1200×630 social card via `next/og` `ImageResponse` so links unfurl nicely in Slack / LinkedIn / iMessage. Big perceived-quality win.

### 5. Real favicon

Replace the inline data-URI icon with `app/icon.png` + `app/apple-icon.png`.

---

## AEO — get cited by ChatGPT / Perplexity / Google AI Overviews

### 6. JSON-LD structured data on the landing page

Inject `<script type="application/ld+json">` with `SoftwareApplication` + `Organization` + a `FAQPage`. LLMs and AI Overviews lean heavily on schema + FAQ.

```tsx
const ld = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DermaRoute",
  applicationCategory: "BusinessApplication",
  description:
    "B2B wound care procurement portal with benefit verification, ordering, and a RAG-powered CMS policy assistant.",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0" },
};
// render:
// <script type="application/ld+json"
//   dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
```

### 7. `public/llms.txt` — standard for AI crawlers

Plain-markdown summary of what the site is + key links. Cheap, signals AEO awareness.

```
# DermaRoute
> B2B wound care procurement portal: benefit verification, product ordering, BAA e-signing, and a RAG-powered CMS policy assistant.

## Tech
Next.js (App Router), TypeScript, Supabase/Postgres, pgvector, Gemini RAG.

## Links
- Live demo: https://derma-route.vercel.app/demo
- Source: [your GitHub]
```

### 8. Answer-shaped content on the landing page

Add a short FAQ section with direct question→answer pairs ("What is DermaRoute?", "What is a benefit verification?"). LLMs extract clean Q&A far better than marketing prose. Pair it with the `FAQPage` JSON-LD.

### 9. Allow AI crawlers (since you want citation)

The `*` rule in `robots.ts` already permits them on public paths. Optionally name `GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended` explicitly to be unambiguous.

---

## Priority order

1. **`robots.ts` + `sitemap.ts`** — stops dashboard leaks, enables indexing. *Do first.*
2. **Rich root metadata + OG image** — link unfurls, perceived quality.
3. **JSON-LD + FAQ section + `llms.txt`** — the actual AEO layer.

All of it: ~6 files, native to Next.js 16, no new dependencies.

## Implementation checklist

- [x] Confirm production domain (assumed `https://derma-route.vercel.app`)
- [x] Upgrade root metadata in `app/layout.tsx`
- [x] Add `app/robots.ts`
- [x] Add `app/sitemap.ts`
- [x] Add `app/opengraph-image.tsx`
- [x] Add `app/icon.svg` + `app/apple-icon.svg` (SVG favicons — brand-matched gradient)
- [x] Add JSON-LD (`SoftwareApplication` + `Organization` + `FAQPage`) to landing
- [x] Add FAQ section to landing page
- [x] Add `public/llms.txt`
- [ ] Verify: `robots.txt`, `sitemap.xml`, OG unfurl (use a link preview tester), Rich Results Test for JSON-LD

---

## Implementation notes

### Step 1 — Root metadata (`app/layout.tsx`)
Added `metadataBase`, `title` template, `alternates.canonical`, full `openGraph` and `twitter` card config. Replaced bare `title` string with a `{ default, template }` object so child pages auto-append `| DermaRoute`. Removed the inline data-URI favicon in `<head>` — replaced with link to `/icon.svg`.

### Step 2 — `app/robots.ts`
Created Next.js `MetadataRoute.Robots` export. Allows `/`, `/demo`, `/legal/` for all user-agents. Blocks all dashboard routes (`/admin`, `/clinic-staff`, `/wound-care`, `/ocular`, `/medical-devices`, `/policy-assistant`, `/auth`, `/api/`). Added explicit `allow` rules for `GPTBot`, `PerplexityBot`, `ClaudeBot`, and `Google-Extended` (step 9 — AI crawler allowlisting) in the same file.

### Step 3 — `app/sitemap.ts`
Created Next.js `MetadataRoute.Sitemap` export listing only public URLs: `/`, `/demo`, `/legal/privacy-policy`, `/legal/terms-of-service`. Root gets `priority: 1`, others `0.6`. All `changeFrequency: "monthly"`. Build confirms `/sitemap.xml` is generated.

### Step 4 — OG image (`app/opengraph-image.tsx`)
Used `next/og` `ImageResponse` (edge runtime) to generate a 1200×630 social card. Shows brand logo (gradient square "D"), "DermaRoute" with the orange accent, subtitle, and three feature pills. No external dependencies — everything inline via JSX-to-image.

### Step 5 — Favicon (`public/icon.svg` + `public/apple-icon.svg`)
Created SVG favicons using brand gradient (#E8724A → #C5573A) and Georgia serif "D" — matches the existing logo. `icon.svg` is 32×32 viewBox, `apple-icon.svg` is 180×180. Used SVG instead of PNG — sharper at all sizes, smaller file, no build step needed.

### Step 6 — JSON-LD structured data (`app/page.tsx`)
Injected `<script type="application/ld+json">` in the server component (`app/page.tsx`) containing three schema objects:
1. `SoftwareApplication` — name, category, description, free offer
2. `Organization` — name, URL, description
3. `FAQPage` — four Q&A pairs matching the visible FAQ section

This lives in the server component so it's in the initial HTML (not hydration-dependent). The FAQ Q&A content is duplicated between JSON-LD and the client component intentionally — JSON-LD must be static for crawlers.

### Step 7 — `public/llms.txt`
Created plain-markdown summary: what DermaRoute is, key features, tech stack, links to demo and GitHub source. Follows the emerging `llms.txt` convention for AI crawler discoverability.

### Step 8 — FAQ section on landing page (`components/landing/LandingPage.tsx`)
Added collapsible accordion FAQ below the service cards (only shown to unauthenticated visitors). Four questions matching the JSON-LD `FAQPage` schema. Uses `ChevronDown` from lucide-react with rotate animation. Styled to match existing card design (same border color, rounded-xl, white bg).

### Step 9 — AI crawler allowlisting
Handled inside `app/robots.ts` (step 2) — added explicit user-agent rules for `GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended` with matching `allow` directives.

### What's left
Deploy and verify:
- `https://derma-route.vercel.app/robots.txt` — check dashboard routes are blocked
- `https://derma-route.vercel.app/sitemap.xml` — check all 4 URLs present
- Test OG unfurl with a link preview tool (e.g. opengraph.xyz)
- Run Google Rich Results Test on `/` to validate JSON-LD
- Check favicon renders in browser tab
