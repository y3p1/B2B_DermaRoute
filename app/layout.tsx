import type { Metadata } from "next";
import { Hanken_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "./client-layout";
import { Analytics } from "@vercel/analytics/next";

// DermaRoute brand type roles (see design-system BRAND.md):
// Hanken = display/headings · IBM Plex Sans = body/UI · IBM Plex Mono = data
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${hanken.variable} ${plexSans.variable} ${plexMono.variable} antialiased`}
      >
        <ClientLayout>{children}</ClientLayout>
        <Analytics />
      </body>
    </html>
  );
}
