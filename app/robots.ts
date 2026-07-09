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
      {
        userAgent: "GPTBot",
        allow: ["/", "/demo", "/legal/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/demo", "/legal/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/demo", "/legal/"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/demo", "/legal/"],
      },
    ],
    sitemap: "https://derma-route.vercel.app/sitemap.xml",
  };
}
