import type { ColumnDef } from "@tanstack/react-table";
import { CountCell, PersonLinkCell, WorkspaceNamesCell } from "@/components/modules/Admin/UserManagement/PeopleCells";
import PlanChipCell from "@/components/shared/cell/PlanChipCell";
import { formatAmount } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { IWorkspaceOverviewItem } from "@/types/workspace.types";

const NUMBER = { align: "right" as const };

// The design's Workspaces list: the owner (a link to their page) over their
// workspaces' names, plan, how many workspaces, how many extra, and the
// add-on they could pay. Counts in the reader's digits; money stays Latin,
// with paisa only when there are some ("৳ 0", "৳ 1,198.50").
export const workspacesColumns: ColumnDef<IWorkspaceOverviewItem>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Owner",
    cell: ({ row }) => (
      <span className="flex min-w-0 flex-col gap-px">
        <PersonLinkCell userId={row.original.userId} name={row.original.name} from="workspaces" />
        <WorkspaceNamesCell row={row.original} />
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
    cell: ({ row }) => <CountCell value={row.original.totalWorkspaces} />,
    meta: { ...NUMBER, width: 140 },
  },
  {
    id: "additionalWorkspaces",
    accessorKey: "additionalWorkspaces",
    header: "Extra",
    cell: ({ row }) => <CountCell value={row.original.additionalWorkspaces} prefix="+" className="font-semibold" />,
    meta: { ...NUMBER, width: 110 },
  },
  {
    id: "estimatedMonthlyAddOnRevenue",
    accessorKey: "estimatedMonthlyAddOnRevenue",
    header: "Add-on, a month",
    cell: ({ row }) => (
      <span className={cn("font-semibold tabular-nums", Number(row.original.estimatedMonthlyAddOnRevenue) > 0 ? "text-ink" : "text-ink-muted")}>
        {formatAmount(row.original.estimatedMonthlyAddOnRevenue)}
      </span>
    ),
    meta: { ...NUMBER, width: 170 },
  },
];
