import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No rewrites needed: the app already calls `/api/*` and those routes now live
  // under `app/api/*` for Vercel compatibility.
  turbopack: {
    root: process.cwd(),
  },
  // pdf-parse imports canvas-related packages that fail during SSR bundling
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
