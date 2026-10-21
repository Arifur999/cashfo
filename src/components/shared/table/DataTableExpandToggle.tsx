"use client";

import type { Table } from "@tanstack/react-table";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import Button from "@/components/smartly/Button";
import T from "../T";

// Expand / collapse every row of a tree table at once. Renders nothing for
// flat tables. 32px, like the filter chips beside it.
const DataTableExpandToggle = <TData,>({ table }: { table: Table<TData> }) => {
  if (!table.getCanSomeRowsExpand()) {
    return null;
  }

  const isAllExpanded = table.getIsAllRowsExpanded();

  return (
    <Button variant="secondary" size="sm" className="h-8 px-3" onClick={() => table.toggleAllRowsExpanded(!isAllExpanded)}>
      {isAllExpanded ? <ChevronsDownUp aria-hidden="true" /> : <ChevronsUpDown aria-hidden="true" />}
      <T>{isAllExpanded ? "Collapse all" : "Expand all"}</T>
    </Button>
  );
};

export default DataTableExpandToggle;
