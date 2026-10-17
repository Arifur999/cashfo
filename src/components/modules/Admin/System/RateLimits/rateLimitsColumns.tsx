import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { DATE_TIME_FORMAT, formatDateTime } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import { humanizeEnum } from "@/lib/statusBadge";
import type { IRateLimitLog } from "@/types/system.types";
import T from "@/components/shared/T";

export const rateLimitsColumns: ColumnDef<IRateLimitLog>[] = [
  {
    id: "windowStart",
    accessorKey: "windowStart",
    header: "Window",
    cell: ({ row }) => <DateCell date={row.original.windowStart} formatString={DATE_TIME_FORMAT} />,
    meta: { exportValue: (row) => formatDateTime(row.windowStart) },
  },
  {
    id: "endpoint",
    accessorKey: "endpoint",
    header: "Endpoint",
    cell: ({ row }) => <span className="font-mono text-xs text-foreground">{row.original.endpoint}</span>,
  },
  {
    id: "caller",
    accessorFn: (row) => `${row.identifierType}:${row.identifier}`,
    header: "Caller",
    cell: ({ row }) => (
      <div className="space-y-0.5">
        <p className="font-mono text-xs text-foreground">{row.original.identifier}</p>
        <p className="text-xs text-muted-foreground">
          <T>{humanizeEnum(row.original.identifierType.toUpperCase())}</T>
        </p>
      </div>
    ),
  },
  {
    id: "requestCount",
    accessorKey: "requestCount",
    header: "Requests",
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.requestCount)}</span>,
  },
  {
    id: "limitExceeded",
    accessorFn: (row) => (row.limitExceeded ? "EXCEEDED" : "OK"),
    header: "Result",
    cell: ({ row }) =>
      row.original.limitExceeded ? (
        <StatusBadgeCell status="FAILED" label="Exceeded" />
      ) : (
        <StatusBadgeCell status="SUCCESS" label="Within limit" />
      ),
  },
];
