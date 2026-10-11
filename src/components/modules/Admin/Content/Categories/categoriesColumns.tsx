import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import IconPreview from "@/components/shared/IconPreview";
import { cn } from "@/lib/utils";
import type { ICategory } from "@/types/category.types";

export const CATEGORIES_HIDDEN_COLUMNS = ["displayOrder"] as const;

const statusOf = (category: ICategory) => (category.isActive ? "ACTIVE" : "INACTIVE");

export const categoriesColumns: ColumnDef<ICategory>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Category",
    cell: ({ row }) => (
      <div className={cn("flex items-center gap-3", !row.original.isActive && "opacity-50")}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <IconPreview name={row.original.icon} />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-foreground">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.nameBn}</p>
        </div>
      </div>
    ),
    meta: { exportValue: (row) => `${row.name} / ${row.nameBn}` },
  },
  {
    id: "type",
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <StatusBadgeCell status={row.original.type} />,
  },
  {
    id: "icon",
    accessorKey: "icon",
    header: "Icon",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.icon || "—"}</span>,
  },
  {
    id: "linkedAccount",
    accessorFn: (row) => row.linkedAccountTemplate?.name ?? "",
    header: "Linked Account",
    cell: ({ row }) =>
      row.original.linkedAccountTemplate ? (
        <span className="text-foreground">{row.original.linkedAccountTemplate.name}</span>
      ) : (
        <span className="text-muted-foreground italic">Not linked</span>
      ),
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
