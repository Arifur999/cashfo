import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import type { IOwnerOverviewItem } from "@/types/owner.types";

// The design's Manage owners list: who, their workspace, plan, when they
// last signed in, status -- and the View / Reset data buttons DataTable adds.
export const manageOwnersColumns: ColumnDef<IOwnerOverviewItem>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Owner",
    cell: ({ row }) => <UserInfoCell name={row.original.name} email={row.original.email} avatar={false} muted={row.original.status === "DELETED"} />,
    meta: { exportValue: (row) => `${row.name} <${row.email}>`, cellClassName: "max-w-80" },
  },
  {
    id: "businessName",
    accessorKey: "businessName",
    header: "Workspace",
    cell: ({ row }) => <span className={row.original.businessName ? "text-ink-2" : "text-ink-muted"}>{row.original.businessName ?? "—"}</span>,
    meta: { cellClassName: "max-w-48 truncate" },
  },
  {
    id: "planName",
    accessorKey: "planName",
    header: "Plan",
    cell: ({ row }) => <span className={row.original.planName ? "text-ink-2" : "text-ink-muted"}>{row.original.planName ?? "—"}</span>,
  },
  {
    id: "lastLoginAt",
    accessorKey: "lastLoginAt",
    header: "Last login",
    cell: ({ row }) => <DateCell date={row.original.lastLoginAt} relative />,
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} dot />,
  },
];
