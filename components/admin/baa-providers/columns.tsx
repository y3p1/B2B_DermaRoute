"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export type BaaProviderRow = {
  id: string;
  createdAt: string | null;
  status: string;
  clinicName: string | null;
  providerEmail: string | null;
  coveredEntity: string;
  coveredEntityName: string;
  businessAssociateName: string | null;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

type BaaProviderColumnsOptions = {
  basePath?: string;
  viewQuery?: string;
  editQuery?: string;
};

export function getBaaProviderColumns(
  options: BaaProviderColumnsOptions = {},
): ColumnDef<BaaProviderRow>[] {
  const basePath = options.basePath ?? "/admin/baa-providers";
  const viewSuffix = options.viewQuery ? `?${options.viewQuery}` : "";
  const editSuffix = options.editQuery ? `?${options.editQuery}` : "";

  return [
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      accessorKey: "clinicName",
      header: "Clinic",
      cell: ({ row }) => row.original.clinicName ?? "—",
    },
    {
      accessorKey: "coveredEntityName",
      header: "Signer Name",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const v = row.original.status;
        if (!v) return <span className="text-slate-400">—</span>;
        const colorClass =
          v === "approved"
            ? "bg-green-100 text-green-800 border border-green-200"
            : v === "signed"
              ? "bg-blue-100 text-blue-800 border border-blue-200"
              : v === "pending"
                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                : v === "cancelled"
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200";
        return (
          <span
            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${colorClass}`}
          >
            {v.replace(/_/g, " ")}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const id = row.original.id;
        return (
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`${basePath}/${id}${viewSuffix}`}>View</Link>
            </Button>
            <Button asChild variant="default" size="sm">
              <Link href={`${basePath}/${id}/edit${editSuffix}`}>Edit</Link>
            </Button>
          </div>
        );
      },
    },
  ];
}

export const baaProviderColumns: ColumnDef<BaaProviderRow>[] =
  getBaaProviderColumns();
