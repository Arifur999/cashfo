import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { DATE_TIME_FORMAT, formatDateTime } from "@/lib/date";
import type { IErrorLog } from "@/types/system.types";

export const statusOfError = (error: IErrorLog) => (error.resolved ? "RESOLVED" : "OPEN");

export const errorLogsColumns: ColumnDef<IErrorLog>[] = [
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => <DateCell date={row.original.createdAt} formatString={DATE_TIME_FORMAT} />,
    meta: { exportValue: (row) => formatDateTime(row.createdAt) },
  },
  {
    id: "severity",
    accessorKey: "severity",
    header: "Severity",
    cell: ({ row }) => <StatusBadgeCell status={row.original.severity} />,
  },
  {
    id: "source",
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => <StatusBadgeCell status={row.original.source} />,
  },
  {
    id: "message",
    accessorKey: "message",
    header: "Message",
    cell: ({ row }) => (
      <span className="line-clamp-2 max-w-lg font-mono text-xs whitespace-normal text-foreground" title={row.original.message}>
        {row.original.message}
      </span>
    ),
  },
  {
    id: "status",
    accessorFn: statusOfError,
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={statusOfError(row.original)} />,
  },
];
