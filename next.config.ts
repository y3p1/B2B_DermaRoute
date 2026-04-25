import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No rewrites needed: the app already calls `/api/*` and those routes now live
  // under `app/api/*` for Vercel compatibility.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
