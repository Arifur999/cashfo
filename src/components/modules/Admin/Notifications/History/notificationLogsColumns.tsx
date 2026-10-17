import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import RelativeTime from "@/components/shared/RelativeTime";
import T from "@/components/shared/T";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { INotificationLog } from "@/types/notification.types";
import { CHANNEL_META, LOG_STATUS_LABEL } from "../notificationOptions";

// Every message the platform tried to send: when, to whom, which template,
// how, and whether it went.
export const notificationLogsColumns: ColumnDef<INotificationLog>[] = [
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "When",
    cell: ({ row }) => <span className="text-small whitespace-nowrap text-ink-2">
        <RelativeTime value={row.original.createdAt} />
      </span>,
    meta: { exportValue: (row) => formatDateTime(row.createdAt) },
  },
  {
    id: "user",
    accessorFn: (row) => row.platformUser?.name ?? "Unknown",
    header: "To@@recipient",
    cell: ({ row }) => <UserInfoCell name={row.original.platformUser?.name} email={row.original.platformUser?.email} avatar={false} />,
    meta: { exportValue: (row) => `${row.platformUser?.name ?? "Unknown"} <${row.platformUser?.email ?? ""}>`, cellClassName: "max-w-72" },
  },
  {
    id: "templateKey",
    accessorKey: "templateKey",
    header: "Template",
    cell: ({ row }) => <code className="font-mono text-small text-ink">{row.original.templateKey}</code>,
  },
  {
    id: "channel",
    accessorKey: "channel",
    header: "Channel",
    cell: ({ row }) => (
      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-caption font-semibold", CHANNEL_META[row.original.channel].chip)}>
        <T>{CHANNEL_META[row.original.channel].label}</T>
      </span>
    ),
    meta: { exportValue: (row) => CHANNEL_META[row.channel].label },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span className="flex flex-col items-start gap-1">
        <StatusBadgeCell status={row.original.status} label={LOG_STATUS_LABEL[row.original.status]} dot />
        {row.original.errorMessage && <span className="max-w-72 text-caption whitespace-normal text-expense">{row.original.errorMessage}</span>}
      </span>
    ),
    meta: { exportValue: (row) => (row.errorMessage ? `${LOG_STATUS_LABEL[row.status]}: ${row.errorMessage}` : LOG_STATUS_LABEL[row.status]) },
  },
  {
    id: "sentAt",
    accessorKey: "sentAt",
    header: "Sent",
    cell: ({ row }) => <span className="text-small whitespace-nowrap text-ink-muted">
        <RelativeTime value={row.original.sentAt} />
      </span>,
    meta: { exportValue: (row) => formatDateTime(row.sentAt) },
  },
];
