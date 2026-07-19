import type { NextConfig } from "next";

// Supabase origin (REST + realtime WSS) is needed in connect-src / img-src.
// Pull from the public env so the CSP tracks whichever project is deployed.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseWss = supabaseUrl.replace(/^https:/, "wss:");

// Enforcing CSP: the browser BLOCKS any resource that violates this policy.
// Verified clean in Report-Only across dashboards, policy assistant, and the
// PDF viewer before enforcing. Remaining loosening to harden later: drop
// 'unsafe-inline'/'unsafe-eval' from script-src via a nonce.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  // @react-pdf/renderer draws PDFs into a same-origin blob; the in-app viewer
  // shows it via <object data="blob:…"> and the browser frames it. Both are
  // our own same-origin blobs, so allow blob: for object/frame only.
  "object-src 'self' blob:",
  "frame-src 'self' blob:",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https://placehold.co " + supabaseUrl,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
  // data: — @react-pdf/renderer fetches its layout/font WASM from a data: URI.
  ["connect-src 'self' data:", supabaseUrl, supabaseWss,
    "https://va.vercel-scripts.com", "https://vitals.vercel-insights.com"]
    .filter(Boolean)
    .join(" "),
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  // Stop MIME-sniffing (matters for the inline-served PDF uploads).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Anti-clickjacking; frame-ancestors in the CSP is the modern equivalent.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Send origin only on cross-site navigations — don't leak full URLs/IDs.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features the app never uses.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  // No rewrites needed: the app already calls `/api/*` and those routes now live
  // under `app/api/*` for Vercel compatibility.
  turbopack: {
    root: process.cwd(),
  },
  // pdf-parse imports canvas-related packages that fail during SSR bundling
  serverExternalPackages: ["pdf-parse"],
  async headers() {
    return [
      {
        // Apply to every route.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
