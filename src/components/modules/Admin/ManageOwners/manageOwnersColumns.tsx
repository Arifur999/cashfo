import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import type { IOwnerOverviewItem } from "@/types/owner.types";

export const manageOwnersColumns: ColumnDef<IOwnerOverviewItem>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Owner",
    cell: ({ row }) => <UserInfoCell name={row.original.name} email={row.original.email} meta={row.original.phone} />,
    meta: { exportValue: (row) => `${row.name} <${row.email}>` },
  },
  {
    id: "businessName",
    accessorKey: "businessName",
    header: "Workspace",
    cell: ({ row }) => row.original.businessName ?? "—",
  },
  {
    id: "planName",
    accessorKey: "planName",
    header: "Active Plan",
    cell: ({ row }) => row.original.planName ?? "—",
  },
  {
    id: "daysUsing",
    accessorKey: "daysUsing",
    header: "Days Using",
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} />,
  },
];
