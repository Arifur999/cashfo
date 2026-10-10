import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import type { IOwnerOverviewItem } from "@/types/owner.types";

export const USERS_HIDDEN_COLUMNS = ["email"] as const;

export const usersColumns: ColumnDef<IOwnerOverviewItem>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Owner",
    cell: ({ row }) => <UserInfoCell name={row.original.name} email={row.original.email} meta={row.original.phone} />,
    meta: { exportValue: (row) => `${row.name} <${row.email}>` },
  },
  {
    id: "email",
    accessorKey: "email",
    header: "Email",
    // Already shown under the name, so hidden by default (USERS_HIDDEN_COLUMNS);
    // it can be toggled on from the View menu.
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} />,
  },
  {
    id: "planName",
    accessorKey: "planName",
    header: "Plan",
    cell: ({ row }) => row.original.planName ?? "None",
  },
  {
    id: "workspaceCount",
    accessorKey: "workspaceCount",
    header: "Workspaces",
  },
  {
    id: "lastLoginAt",
    accessorKey: "lastLoginAt",
    header: "Last Login",
    cell: ({ row }) => <DateCell date={row.original.lastLoginAt} />,
  },
];
