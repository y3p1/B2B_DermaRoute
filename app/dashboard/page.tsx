import { Suspense } from "react";
import ProviderDashboardClient from "@/components/dashboard/ProviderDashboardClient";

export const metadata = {
  title: "Provider Dashboard",
};

export default function DashboardPage() {
  return (
    <Suspense>
      <ProviderDashboardClient />
    </Suspense>
  );
}
