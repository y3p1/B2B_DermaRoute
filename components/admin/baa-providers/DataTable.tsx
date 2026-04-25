"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumnId?: string;
  filterPlaceholder?: string;
  loading?: boolean;
};

export default function DataTable<TData, TValue>({
  columns,
  data,
  filterColumnId = "clinicName",
  filterPlaceholder = "Search...",
  loading = false,
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const table = useReactTable({
    data,
    columns,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnFilters,
    },
  });

  const filterColumn = table.getColumn(filterColumnId);

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder={filterPlaceholder}
          value={(filterColumn?.getFilterValue() as string) ?? ""}
          onChange={(event) => filterColumn?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-[#18192B] text-white text-left !hover:bg-[#18192B]"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              // Skeleton rows to indicate table is loading
              Array.from({ length: 5 }).map((_, rIdx) => (
                <TableRow
                  key={`skeleton-${rIdx}`}
                  className={rIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  {columns.map((_, cIdx) => (
                    <TableCell key={`skeleton-${rIdx}-${cIdx}`}>
                      <div
                        className={`h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse ${
                          cIdx === 0 ? "w-1/3" : "w-full"
                        }`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, idx) => (
                <TableRow
                  key={row.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
