import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Dashboard from "./dashboard/page";

export default async function HomePage() {
  if (process.env.DEMO_MODE === "true") {
    const cookieStore = await cookies();
    const demoRole = cookieStore.get("demo_role")?.value;

    if (!demoRole) {
      redirect("/demo");
    }

    if (demoRole === "admin") redirect("/admin");
    if (demoRole === "clinic_staff") redirect("/clinic-staff");
    // provider → fall through to provider dashboard below
  }

  return <Dashboard />;
}
