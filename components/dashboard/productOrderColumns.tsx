"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";

export type ProductOrderRow = {
  id: string;
  createdAt: string | null;
  status: string;
  bvRequestId: string;
  practice: string | null;
  manufacturer: string | null;
  product: string | null;
  productCode: string | null;
  woundSize: string | null;
  patientInitials?: string | null;
};

export const createProductOrderColumns = (
  onView: (id: string) => void,
): ColumnDef<ProductOrderRow, unknown>[] => [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: (info) =>
      info.getValue() ? String(info.getValue()).slice(0, 10) : "",
  },
  {
    accessorKey: "practice",
    header: "Practice",
    cell: (info) => info.getValue() ?? "",
  },
  {
    accessorKey: "manufacturer",
    header: "Manufacturer",
    cell: (info) => info.getValue() ?? "",
  },
  {
    accessorKey: "product",
    header: "Product",
    cell: ({ row }) => (
      <div>
        <span className="font-semibold">{row.original.product ?? "N/A"}</span>
        {row.original.productCode && (
          <div className="text-xs text-gray-500">
            {row.original.productCode}
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "patientInitials",
    header: "Patient Initials",
    cell: (info) => info.getValue() ?? "N/A",
  },
  {
    accessorKey: "woundSize",
    header: "Size",
    cell: (info) => info.getValue() ?? "",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: (info) => {
      const s = String(info.getValue());
      const cls =
        s === "completed"
          ? "bg-green-100 text-green-800"
          : s === "cancelled"
            ? "bg-red-100 text-red-800"
            : s === "shipped"
              ? "bg-blue-100 text-blue-800"
              : "bg-yellow-100 text-yellow-800";
      return (
        <span className={`${cls} text-xs font-medium px-3 py-1 rounded-full`}>
          {s}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onView(row.original.id)}
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          View / Manage
        </button>
      </div>
    ),
  },
];

export default createProductOrderColumns;
