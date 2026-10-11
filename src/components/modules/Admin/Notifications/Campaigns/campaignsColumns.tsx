import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { DATE_TIME_FORMAT, formatDate, formatDateTime } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import type { ICampaign } from "@/types/notification.types";
import { describeAudience } from "./campaignOptions";

// Built per plan list, since the audience names plans by id.
export const buildCampaignsColumns = (planNames: Map<string, string>): ColumnDef<ICampaign>[] => [
  {
    id: "title",
    accessorKey: "title",
    header: "Campaign",
    cell: ({ row }) => (
      <div className="space-y-0.5">
        <p className="font-medium text-foreground">{row.original.title}</p>
        <p className="font-mono text-xs text-muted-foreground">{row.original.templateKey}</p>
      </div>
    ),
  },
  {
    id: "channel",
    accessorKey: "channel",
    header: "Channel",
    cell: ({ row }) => <StatusBadgeCell status={row.original.channel} />,
  },
  {
    id: "audience",
    accessorFn: (row) => describeAudience(row.targetFilter, planNames),
    header: "Audience",
    cell: ({ getValue }) => <span className="text-muted-foreground">{String(getValue())}</span>,
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} />,
  },
  {
    id: "scheduledFor",
    accessorKey: "scheduledFor",
    header: "Scheduled",
    cell: ({ row }) =>
      row.original.scheduledFor ? (
        <DateCell date={row.original.scheduledFor} formatString={DATE_TIME_FORMAT} />
      ) : (
        <span className="text-muted-foreground italic">Not scheduled</span>
      ),
    meta: { exportValue: (row) => formatDateTime(row.scheduledFor, "") },
  },
  {
    id: "results",
    accessorFn: (row) => row.sentCount + row.failedCount,
    header: "Delivered",
    cell: ({ row }) => (
      <span className="text-xs tabular-nums">
        <span className="text-foreground">{formatNumber(row.original.sentCount)} sent</span>
        {row.original.failedCount > 0 && <span className="text-destructive"> &middot; {formatNumber(row.original.failedCount)} failed</span>}
      </span>
    ),
    meta: { exportValue: (row) => `${row.sentCount} sent, ${row.failedCount} failed` },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => <DateCell date={row.original.createdAt} />,
    meta: { exportValue: (row) => formatDate(row.createdAt) },
  },
];
