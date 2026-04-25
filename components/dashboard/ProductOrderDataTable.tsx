"use client";

import * as React from "react";
import DataTable from "@/components/admin/baa-providers/DataTable";
import createProductOrderColumns, {
  type ProductOrderRow,
} from "./productOrderColumns";

export default function ProductOrderDataTable({
  rows,
  loading,
  onView,
}: {
  rows: ProductOrderRow[];
  loading?: boolean;
  onView: (id: string) => void;
}) {
  const columns = React.useMemo(
    () => createProductOrderColumns(onView),
    [onView],
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
