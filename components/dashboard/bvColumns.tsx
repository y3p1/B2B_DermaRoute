"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import ManufacturerProofUpload from "./ManufacturerProofUpload";

export type BvRow = {
  id: string;
  createdAt: string | null;
  status: string;
  provider: string | null;
  practice: string | null;
  woundSize: string | null;
  proofStatus: string | null;
  approvalProofUrl: string | null;
  initials: string | null;
  placeOfService: string | null;
  insurance: string | null;
  woundLocation: string | null;
};

export const createBvColumns = (
  onView: (id: string) => void,
  onEdit: (id: string) => void,
  onUploaded: () => void,
  _onStatusChange?: (id: string, status: "approved" | "rejected") => void,
): ColumnDef<BvRow, unknown>[] => [
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
    accessorKey: "placeOfService",
    header: "Place of Service",
    cell: (info) => info.getValue() ?? "",
  },
  {
    accessorKey: "initials",
    header: "Patient Initials",
    cell: (info) => info.getValue() ?? "",
  },
  {
    accessorKey: "insurance",
    header: "Insurance",
    cell: (info) => info.getValue() ?? "",
  },
  {
    accessorKey: "woundLocation",
    header: "Wound Location",
    cell: (info) => info.getValue() ?? "",
  },
  {
    id: "product",
    header: "Product",
    cell: ({ row }) => (
      <div>
        <span className="font-semibold">Recommended</span>
        <div className="mt-2">
          <ManufacturerProofUpload
            bvRequestId={row.original.id}
            currentProofStatus={row.original.proofStatus}
            currentProofUrl={row.original.approvalProofUrl}
            onUploaded={onUploaded}
          />
        </div>
      </div>
    ),
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
        s === "approved"
          ? "bg-green-100 text-green-800"
          : s === "rejected"
            ? "bg-red-100 text-red-800"
            : s === "downloaded"
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
          View
        </button>
        {row.original.status === "pending" && (
          <button
            type="button"
            onClick={() => onEdit(row.original.id)}
            className="px-4 py-2 rounded-md bg-black text-white text-sm font-medium shadow hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors"
          >
            Edit
          </button>
        )}
      </div>
    ),
  },
];

export default createBvColumns;
