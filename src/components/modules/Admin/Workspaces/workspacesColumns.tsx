import type { ColumnDef } from "@tanstack/react-table";
import PlanChipCell from "@/components/shared/cell/PlanChipCell";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { IWorkspaceOverviewItem } from "@/types/workspace.types";

const NUMBER = { align: "right" as const };

// The design's Workspaces list: the owner over their workspaces' names,
// plan, how many workspaces, how many extra, and the add-on they could pay.
export const workspacesColumns: ColumnDef<IWorkspaceOverviewItem>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Owner",
    cell: ({ row }) => (
      <span className="flex min-w-0 flex-col gap-px">
        <span className="font-semibold text-ink">{row.original.name}</span>
        <span className="truncate text-small text-ink-muted">{row.original.workspaceNames.join(", ")}</span>
      </span>
    ),
    meta: { exportValue: (row) => `${row.name} <${row.email}>` },
  },
  {
    id: "planName",
    accessorKey: "planName",
    header: "Plan",
    cell: ({ row }) => <PlanChipCell plan={row.original.planName} />,
    meta: { width: 120 },
  },
  {
    id: "totalWorkspaces",
    accessorKey: "totalWorkspaces",
    header: "Total workspaces",
    cell: ({ row }) => <span className="tabular-nums">{row.original.totalWorkspaces}</span>,
    meta: { ...NUMBER, width: 140 },
  },
  {
    id: "additionalWorkspaces",
    accessorKey: "additionalWorkspaces",
    header: "Extra",
    cell: ({ row }) => <span className="font-semibold tabular-nums">+{row.original.additionalWorkspaces}</span>,
    meta: { ...NUMBER, width: 110 },
  },
  {
    id: "estimatedMonthlyAddOnRevenue",
    accessorKey: "estimatedMonthlyAddOnRevenue",
    header: "Add-on, a month",
    cell: ({ row }) => (
      <span className={cn("font-semibold tabular-nums", Number(row.original.estimatedMonthlyAddOnRevenue) > 0 ? "text-ink" : "text-ink-muted")}>
        {formatCurrency(row.original.estimatedMonthlyAddOnRevenue)}
      </span>
    ),
    meta: { ...NUMBER, width: 170 },
  },
];
