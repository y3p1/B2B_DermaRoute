import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

type Row = {
  id: string;
  createdAt: string | null;
  status: string;
  provider: string | null;
  practice: string | null;
  woundSize: string | null;
};

function statusColor(status: string) {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 border border-green-200";
    case "rejected":
      return "bg-red-100 text-red-800 border border-red-200";
    case "downloaded":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    case "pending":
    default:
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
  }
}

export default function DashboardTable({
  rows,
  loading,
  error,
}: {
  rows: Row[];
  loading?: boolean;
  error?: string | null;
}) {
  return (
    <Table className="bg-white rounded-xl">
      <TableHeader>
        <TableRow className="bg-[#18192B] text-white text-left !hover:bg-[#18192B]">
          <TableHead className="px-6 py-3 font-semibold text-white">
            Date
          </TableHead>
          <TableHead className="px-6 py-3 font-semibold text-white">
            Practice
          </TableHead>
          <TableHead className="px-6 py-3 font-semibold text-white">
            Provider
          </TableHead>
          <TableHead className="px-6 py-3 font-semibold text-white">
            Product
          </TableHead>
          <TableHead className="px-6 py-3 font-semibold text-white">
            Size
          </TableHead>
          <TableHead className="px-6 py-3 font-semibold text-white">
            Status
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && (
          <TableRow>
            <TableCell className="px-6 py-6" colSpan={6}>
              Loading...
            </TableCell>
          </TableRow>
        )}
        {error && !loading && (
          <TableRow>
            <TableCell className="px-6 py-6 text-red-600" colSpan={6}>
              {error}
            </TableCell>
          </TableRow>
        )}
        {!loading && !error && rows.length === 0 && (
          <TableRow>
            <TableCell className="px-6 py-6" colSpan={6}>
              No BV requests yet.
            </TableCell>
          </TableRow>
        )}
        {!loading &&
          !error &&
          rows.map((row, i) => (
            <TableRow
              key={String(row.id)}
              className={i === 0 ? "border-b last:border-b-0" : undefined}
            >
              <TableCell className="px-6 py-4">
                {row.createdAt ? row.createdAt.slice(0, 10) : ""}
              </TableCell>
              <TableCell className="px-6 py-4">{row.practice ?? ""}</TableCell>
              <TableCell className="px-6 py-4">{row.provider ?? ""}</TableCell>
              <TableCell className="px-6 py-4">
                <span className="font-semibold">Recommended</span>
                <div className="text-xs text-gray-500">(not stored yet)</div>
              </TableCell>
              <TableCell className="px-6 py-4">{row.woundSize ?? ""}</TableCell>
              <TableCell className="px-6 py-4">
                <span
                  className={`${statusColor(row.status)} text-xs font-medium px-3 py-1 rounded-full`}
                >
                  {row.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
