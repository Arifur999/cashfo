import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import DataTableTreeCell from "@/components/shared/table/DataTableTreeCell";
import { humanizeEnum } from "@/lib/statusBadge";
import { cn } from "@/lib/utils";
import type { IAccountTemplate } from "@/types/accountTemplate.types";

export const ACCOUNT_TEMPLATES_HIDDEN_COLUMNS = ["displayOrder"] as const;

const statusOf = (template: IAccountTemplate) => (template.isActive ? "ACTIVE" : "INACTIVE");

export const accountTemplatesColumns: ColumnDef<IAccountTemplate>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Account",
    cell: ({ row }) => (
      <DataTableTreeCell row={row}>
        <div className={cn("min-w-0", !row.original.isActive && "opacity-50")}>
          <p className={cn("font-medium text-foreground", row.depth === 0 && "font-semibold")}>{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.nameBn}</p>
        </div>
      </DataTableTreeCell>
    ),
    meta: { exportValue: (row) => `${row.name} / ${row.nameBn}` },
  },
  {
    id: "accountType",
    accessorKey: "accountType",
    header: "Type",
    cell: ({ row }) => <StatusBadgeCell status={row.original.accountType} />,
  },
  {
    id: "accountSubtype",
    accessorKey: "accountSubtype",
    header: "Subtype",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.accountSubtype || "—"}</span>,
  },
  {
    id: "appliesTo",
    accessorKey: "appliesTo",
    header: "Seeded Into",
    enableSorting: false,
    // Facet counts per workspace kind, not per combination.
    getUniqueValues: (row) => row.appliesTo,
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.appliesTo.map((workspaceType) => (
          <StatusBadgeCell key={workspaceType} status={workspaceType} />
        ))}
      </div>
    ),
    meta: { exportValue: (row) => row.appliesTo.map(humanizeEnum).join(", ") },
  },
  {
    id: "displayOrder",
    accessorKey: "displayOrder",
    header: "Order",
    cell: ({ row }) => <span className="tabular-nums">{row.original.displayOrder}</span>,
  },
  {
    id: "status",
    accessorFn: statusOf,
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={statusOf(row.original)} />,
  },
];
