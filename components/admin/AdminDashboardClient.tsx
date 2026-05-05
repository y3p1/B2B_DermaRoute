"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import ClinicStaffDashboardClient from "@/components/clinic-staff/ClinicStaffDashboardClient";
import { isClientDemoMode } from "@/lib/demoMode";
import { apiPost } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { RefreshCw, Loader2 } from "lucide-react";

function DemoResetButton() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const jwt = useAuthStore((s) => s.jwt);

  const handleReset = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await apiPost("/api/demo/reset", {}, { token: jwt || undefined });
      setMessage({ type: "success", text: "Demo data reset successfully." });
      setOpen(false);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Reset failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {message && (
        <span className={`text-xs font-medium ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        className="border-orange-400 text-orange-600 hover:bg-orange-50"
        onClick={() => setOpen(true)}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Reset Demo Data
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset demo data?</DialogTitle>
            <DialogDescription>
              This will truncate all volatile demo tables and re-seed with
              fresh data. The operation takes a few seconds and cannot be
              undone. User accounts are preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting…
                </>
              ) : (
                "Reset"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
    <div className="relative">
      {isClientDemoMode() && (
        <div className="absolute top-4 right-4 z-50">
          <DemoResetButton />
        </div>
      )}
      <ClinicStaffDashboardClient titleOverride={"Admin"} />
    </div>
  ) : null;
};

export default AdminDashboardClient;
