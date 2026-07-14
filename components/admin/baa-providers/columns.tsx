"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

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
      cell: ({ row }) =>
        row.original.status ? (
          <StatusBadge status={row.original.status} viewer="staff" />
        ) : (
          <span className="text-slate-400">—</span>
        ),
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
