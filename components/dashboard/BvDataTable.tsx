"use client";

import * as React from "react";
import DataTable from "@/components/admin/baa-providers/DataTable";
import createBvColumns, { type BvRow } from "./bvColumns";

export default function BvDataTable({
  rows,
  loading,
  onView,
  onEdit,
  onUploaded,
}: {
  rows: BvRow[];
  loading?: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onUploaded: () => void;
}) {
  const columns = React.useMemo(
    () => createBvColumns(onView, onEdit, onUploaded),
    [onView, onEdit, onUploaded],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      filterColumnId="practice"
      filterPlaceholder="Search practice…"
      loading={loading}
    />
  );
}
