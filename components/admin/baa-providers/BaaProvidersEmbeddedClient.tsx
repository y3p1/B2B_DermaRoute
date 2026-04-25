"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { apiGet } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";

import DataTable from "./DataTable";
import { getBaaProviderColumns, type BaaProviderRow } from "./columns";

type ListResponse = {
  success: true;
  data: BaaProviderRow[];
};

type BaaProvidersEmbeddedClientProps = {
  basePath?: string;
};

export default function BaaProvidersEmbeddedClient({
  basePath = "/admin/baa-providers",
}: BaaProvidersEmbeddedClientProps) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const token = useAuthStore((s) => s.jwt);
  const role = useAuthStore((s) => s.role);

  const [rows, setRows] = React.useState<BaaProviderRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const columns = React.useMemo(
    () =>
      getBaaProviderColumns({
        basePath,
        viewQuery: "returnTo=dashboard",
        editQuery: "returnTo=dashboard",
      }),
    [basePath],
  );

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
    return <div className="min-h-[240px]" />;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="text-base font-semibold text-[#18192B]">
            BAA Provider Agreements
          </div>
          <div className="text-sm text-muted-foreground">
            Review and complete Business Associate signatures.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="bg-white rounded-lg p-3 text-sm text-red-600 mb-3">
          {error}
        </div>
      ) : null}

      <div className="text-sm text-muted-foreground mb-3">
        {loading ? "Loading…" : `${rows.length} record(s)`}
      </div>
      <DataTable
        columns={columns}
        data={rows}
        filterColumnId="clinicName"
        filterPlaceholder="Search clinic name…"
        loading={loading}
      />
    </div>
  );
}
