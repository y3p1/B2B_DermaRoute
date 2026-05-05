import { redirect } from "next/navigation";
import AdminSignInComponent from "@/components/auth/signin/admin/AdminSignInComponent";

export default function AdminSignInPage() {
  if (process.env.DEMO_MODE === "true") {
    redirect("/demo");
  }

  return <AdminSignInComponent />;
}
