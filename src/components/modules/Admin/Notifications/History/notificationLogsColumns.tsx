import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import RelativeTime from "@/components/shared/RelativeTime";
import T from "@/components/shared/T";
import Chip from "@/components/smartly/Chip";
import { formatDateTime } from "@/lib/date";
import type { INotificationLog } from "@/types/notification.types";
import { CHANNEL_META, LOG_STATUS_LABEL, templateName } from "../notificationOptions";

// Every message the platform tried to send: when, to whom, which template,
// how, and whether it went. The design's fixed grid: the recipient (a name
// over an email) takes what the other columns leave.
export const notificationLogsColumns: ColumnDef<INotificationLog>[] = [
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "When",
    cell: ({ row }) => <span className="text-small whitespace-nowrap text-ink-2">
        <RelativeTime value={row.original.createdAt} />
      </span>,
    meta: { width: 120, exportValue: (row) => formatDateTime(row.createdAt) },
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
    cell: ({ row }) => (
      <span title={row.original.templateKey} className="block truncate text-small text-ink">
        <T>{templateName(row.original.templateKey)}</T>
      </span>
    ),
    // The longest seeded key (subscription_expiring) is about 165px; a
    // longer one is cut, with the whole key in its title.
    meta: { width: 180 },
  },
  {
    id: "channel",
    accessorKey: "channel",
    header: "Channel",
    cell: ({ row }) => (
      <Chip tone={CHANNEL_META[row.original.channel].tone} size="sm" className="font-semibold">
        <T>{CHANNEL_META[row.original.channel].label}</T>
      </Chip>
    ),
    meta: { width: 100, exportValue: (row) => CHANNEL_META[row.channel].label },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span className="flex flex-col items-start gap-1">
        <StatusBadgeCell status={row.original.status} label={LOG_STATUS_LABEL[row.original.status]} dot />
        {row.original.errorMessage && <span className="max-w-full text-caption wrap-break-word whitespace-normal text-expense">{row.original.errorMessage}</span>}
      </span>
    ),
    meta: { width: 150, exportValue: (row) => (row.errorMessage ? `${LOG_STATUS_LABEL[row.status]}: ${row.errorMessage}` : LOG_STATUS_LABEL[row.status]) },
  },
  {
    id: "sentAt",
    accessorKey: "sentAt",
    header: "Sent",
    cell: ({ row }) => <span className="text-small whitespace-nowrap text-ink-muted">
        <RelativeTime value={row.original.sentAt} />
      </span>,
    meta: { width: 110, align: "right", exportValue: (row) => formatDateTime(row.sentAt) },
  },
];
