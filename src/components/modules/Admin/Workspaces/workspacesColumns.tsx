import type { ColumnDef } from "@tanstack/react-table";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import { formatCurrency } from "@/lib/currency";
import type { IWorkspaceOverviewItem } from "@/types/workspace.types";

export const workspacesColumns: ColumnDef<IWorkspaceOverviewItem>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Owner",
    cell: ({ row }) => <UserInfoCell name={row.original.name} email={row.original.email} />,
    meta: { exportValue: (row) => `${row.name} <${row.email}>` },
  },
  {
    id: "planName",
    accessorKey: "planName",
    header: "Plan",
    cell: ({ row }) => row.original.planName ?? "—",
  },
  {
    id: "totalWorkspaces",
    accessorKey: "totalWorkspaces",
    header: "Total Workspaces",
  },
  {
    id: "additionalWorkspaces",
    accessorKey: "additionalWorkspaces",
    header: "Additional",
  },
  {
    id: "estimatedMonthlyAddOnRevenue",
    accessorKey: "estimatedMonthlyAddOnRevenue",
    header: "Est. Monthly Add-On Fee",
    cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.estimatedMonthlyAddOnRevenue)}</span>,
  },
];
