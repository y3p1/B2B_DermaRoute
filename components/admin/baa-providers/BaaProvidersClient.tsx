"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";

import DataTable from "./DataTable";
import { baaProviderColumns, type BaaProviderRow } from "./columns";

type ListResponse = {
  success: true;
  data: BaaProviderRow[];
};

export default function BaaProvidersClient() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const token = useAuthStore((s) => s.jwt);
  const role = useAuthStore((s) => s.role);

  const [rows, setRows] = React.useState<BaaProviderRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth");
  }, [router, status]);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    if (role !== "admin" && role !== "clinic_staff") {
      router.replace("/");
    }
  }, [role, router, status]);

  const refresh = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<ListResponse>("/api/baa-providers", { token });
      setRows(res.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load BAA records";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    if (role !== "admin" && role !== "clinic_staff") return;
    void refresh();
  }, [refresh, role, status]);

  if (status === "idle" || status === "loading") {
    return <div className="min-h-screen bg-[#F8F9FB]" />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#18192B]">
              BAA Provider Agreements
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and complete Business Associate signatures.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/clinic-staff">Back</Link>
            </Button>
            <Button variant="outline" onClick={refresh} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error ? (
          <div className="bg-white rounded-lg shadow p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-muted-foreground mb-3">
            {loading ? "Loading…" : `${rows.length} record(s)`}
          </div>
          <DataTable
            columns={baaProviderColumns}
            data={rows}
            filterColumnId="clinicName"
            filterPlaceholder="Search clinic name…"
            loading={loading}
          />
        </div>
      </main>
    </div>
  );
}
