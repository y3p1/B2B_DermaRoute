import type { NextConfig } from "next";

// Supabase origin (REST + realtime WSS) is needed in connect-src / img-src.
// Pull from the public env so the CSP tracks whichever project is deployed.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseWss = supabaseUrl.replace(/^https:/, "wss:");

// Report-Only CSP: the browser reports violations to the console but blocks
// NOTHING. This lets us observe what a strict policy would break (inline
// scripts, third-party origins) before switching to an enforcing
// `Content-Security-Policy` header. Tighten script-src/style-src (drop
// 'unsafe-inline') once the console is clean, ideally with a nonce.
const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https://placehold.co " + supabaseUrl,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
  ["connect-src 'self'", supabaseUrl, supabaseWss,
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
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
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
