import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  description:
    "DermaRoute Provider Portal — Tissue Products & PRP, Medical Devices / Equipment, and Ocular Products ordering for healthcare providers.",
};

export default async function HomePage() {
  if (process.env.DEMO_MODE === "true") {
    const cookieStore = await cookies();
    const demoRole = cookieStore.get("demo_role")?.value;

    if (!demoRole) redirect("/demo");
    if (demoRole === "admin") redirect("/admin");
    if (demoRole === "clinic_staff") redirect("/clinic-staff");
  }

  return <LandingPage />;
}
