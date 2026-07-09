import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "./client-layout";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientLayout>{children}</ClientLayout>
        <Analytics />
      </body>
    </html>
  );
}
