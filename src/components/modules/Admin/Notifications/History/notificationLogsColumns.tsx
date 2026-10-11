import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import { DATE_TIME_FORMAT, formatDateTime } from "@/lib/date";
import type { INotificationLog } from "@/types/notification.types";

export const notificationLogsColumns: ColumnDef<INotificationLog>[] = [
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Queued",
    cell: ({ row }) => <DateCell date={row.original.createdAt} formatString={DATE_TIME_FORMAT} />,
    meta: { exportValue: (row) => formatDateTime(row.createdAt) },
  },
  {
    id: "user",
    accessorFn: (row) => row.platformUser?.name ?? "Unknown",
    header: "Recipient",
    cell: ({ row }) => <UserInfoCell name={row.original.platformUser?.name} email={row.original.platformUser?.email} />,
    meta: { exportValue: (row) => `${row.platformUser?.name ?? "Unknown"} <${row.platformUser?.email ?? ""}>` },
  },
  {
    id: "templateKey",
    accessorKey: "templateKey",
    header: "Template",
    cell: ({ row }) => <span className="font-mono text-xs text-foreground">{row.original.templateKey}</span>,
  },
  {
    id: "channel",
    accessorKey: "channel",
    header: "Channel",
    cell: ({ row }) => <StatusBadgeCell status={row.original.channel} />,
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="space-y-1">
        <StatusBadgeCell status={row.original.status} />
        {row.original.errorMessage && <p className="max-w-xs text-xs whitespace-normal text-destructive">{row.original.errorMessage}</p>}
      </div>
    ),
    meta: { exportValue: (row) => (row.errorMessage ? `${row.status}: ${row.errorMessage}` : row.status) },
  },
  {
    id: "sentAt",
    accessorKey: "sentAt",
    header: "Sent",
    cell: ({ row }) => <DateCell date={row.original.sentAt} formatString={DATE_TIME_FORMAT} />,
    meta: { exportValue: (row) => formatDateTime(row.sentAt) },
  },
];
