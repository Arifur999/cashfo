"use client";

import type { Table } from "@tanstack/react-table";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import T from "../T";

// Expand / collapse every row of a tree table at once. Renders nothing for
// flat tables.
const DataTableExpandToggle = <TData,>({ table }: { table: Table<TData> }) => {
  if (!table.getCanSomeRowsExpand()) {
    return null;
  }

  const isAllExpanded = table.getIsAllRowsExpanded();

  return (
    <Button variant="outline" size="sm" className="h-8" onClick={() => table.toggleAllRowsExpanded(!isAllExpanded)}>
      {isAllExpanded ? <ChevronsDownUp aria-hidden="true" /> : <ChevronsUpDown aria-hidden="true" />}
      <T>{isAllExpanded ? "Collapse all" : "Expand all"}</T>
    </Button>
  );
};

export default DataTableExpandToggle;
