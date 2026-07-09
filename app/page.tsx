import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  description:
    "DermaRoute Provider Portal — Tissue Products & PRP, Medical Devices / Equipment, and Ocular Products ordering for healthcare providers.",
};

const isDemoEnv =
  process.env.DEMO_MODE === "true" ||
  process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "DermaRoute",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "B2B wound care procurement portal with benefit verification, ordering, and a RAG-powered CMS policy assistant.",
    url: "https://derma-route.vercel.app",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DermaRoute",
    url: "https://derma-route.vercel.app",
    description:
      "B2B wound care procurement platform for healthcare providers.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is DermaRoute?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "DermaRoute is a B2B wound care procurement portal that streamlines benefit verifications, product ordering, and CMS policy lookups for healthcare providers. It supports tissue biologics, ocular products, and medical devices.",
        },
      },
      {
        "@type": "Question",
        name: "What is a benefit verification?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A benefit verification (BV) confirms a patient's insurance coverage for specific wound care products before ordering. DermaRoute automates the BV submission and tracking workflow between providers and distributors.",
        },
      },
      {
        "@type": "Question",
        name: "What technology does DermaRoute use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "DermaRoute is built with Next.js (App Router), TypeScript, Supabase/Postgres, Drizzle ORM, and Tailwind CSS. Its AI policy assistant uses Retrieval-Augmented Generation (RAG) with Google Gemini and pgvector.",
        },
      },
      {
        "@type": "Question",
        name: "Who uses DermaRoute?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "DermaRoute serves three user roles: healthcare providers who submit benefit verifications and orders, clinic staff who manage multi-provider practices, and admin users who oversee operations, products, and analytics.",
        },
      },
    ],
  },
];

export default async function HomePage() {
  if (isDemoEnv) {
    const cookieStore = await cookies();
    const demoRole = cookieStore.get("demo_role")?.value;

    if (!demoRole) redirect("/demo");
    if (demoRole === "admin") redirect("/admin");
    if (demoRole === "clinic_staff") redirect("/clinic-staff");
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
