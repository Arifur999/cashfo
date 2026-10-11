import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import { DATE_TIME_FORMAT, formatDateTime } from "@/lib/date";
import { humanizeEnum } from "@/lib/statusBadge";
import type { ISupportTicket } from "@/types/ticket.types";

// Toggle-able from the View menu; "Last Updated" is what triage looks at.
export const TICKETS_HIDDEN_COLUMNS = ["createdAt"] as const;

export const ticketsColumns: ColumnDef<ISupportTicket>[] = [
  {
    id: "subject",
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => (
      <span className="block max-w-xs truncate font-medium text-foreground" title={row.original.subject}>
        {row.original.subject}
      </span>
    ),
  },
  {
    id: "user",
    accessorFn: (row) => row.platformUser?.name ?? "Unknown",
    header: "User",
    cell: ({ row }) => <UserInfoCell name={row.original.platformUser?.name} email={row.original.platformUser?.email} />,
    meta: { exportValue: (row) => `${row.platformUser?.name ?? "Unknown"} <${row.platformUser?.email ?? ""}>` },
  },
  {
    id: "category",
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => <span className="text-muted-foreground">{humanizeEnum(row.original.category)}</span>,
    meta: { exportValue: (row) => humanizeEnum(row.category) },
  },
  {
    id: "priority",
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => <StatusBadgeCell status={row.original.priority} />,
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} />,
  },
  {
    id: "assignee",
    accessorFn: (row) => row.assignedAdmin?.name ?? "Unassigned",
    header: "Assigned To",
    cell: ({ row }) =>
      row.original.assignedAdmin ? (
        <span className="text-foreground">{row.original.assignedAdmin.name}</span>
      ) : (
        <span className="text-muted-foreground italic">Unassigned</span>
      ),
  },
  {
    id: "updatedAt",
    accessorKey: "updatedAt",
    header: "Last Updated",
    cell: ({ row }) => <DateCell date={row.original.updatedAt} formatString={DATE_TIME_FORMAT} />,
    meta: { exportValue: (row) => formatDateTime(row.updatedAt) },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => <DateCell date={row.original.createdAt} formatString={DATE_TIME_FORMAT} />,
    meta: { exportValue: (row) => formatDateTime(row.createdAt) },
  },
];
