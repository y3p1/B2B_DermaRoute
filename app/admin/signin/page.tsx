import { redirect } from "next/navigation";
import AdminSignInComponent from "@/components/auth/signin/admin/AdminSignInComponent";

const isDemoEnv =
  process.env.DEMO_MODE === "true" ||
  process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function AdminSignInPage() {
  if (isDemoEnv) {
    redirect("/demo");
  }

  return <AdminSignInComponent />;
}
