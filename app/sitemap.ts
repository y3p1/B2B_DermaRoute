import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://derma-route.vercel.app";
  return ["", "/demo", "/legal/privacy-policy", "/legal/terms-of-service"].map(
    (p) => ({
      url: `${base}${p}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: p === "" ? 1 : 0.6,
    }),
  );
}
