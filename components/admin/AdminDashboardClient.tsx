"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import ClinicStaffDashboardClient from "@/components/clinic-staff/ClinicStaffDashboardClient";
import { isClientDemoMode } from "@/lib/demoMode";

const AdminDashboardClient: React.FC = () => {
  const router = useRouter();
  const authStatus = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.role);

  React.useEffect(() => {
    if (isClientDemoMode()) return;
    if (authStatus === "unauthenticated") {
      router.replace("/admin/signin");
    }
  }, [authStatus, router]);

  React.useEffect(() => {
    if (authStatus !== "authenticated") return;

    // Redirect non-admin users
    if (role === "clinic_staff") {
      router.replace("/clinic-staff");
    } else if (role === "provider") {
      router.replace("/");
    }
  }, [authStatus, role, router]);

  if (authStatus === "idle" || authStatus === "loading") {
    return <div className="min-h-screen bg-[#F8F9FB]" />;
  }

  if (authStatus === "error") {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 text-sm text-red-600">
          Failed to load session. Please sign in again.
        </div>
      </div>
    );
  }

  return authStatus === "authenticated" && role === "admin" ? (
    <ClinicStaffDashboardClient titleOverride={"Admin"} />
  ) : null;
};

export default AdminDashboardClient;
