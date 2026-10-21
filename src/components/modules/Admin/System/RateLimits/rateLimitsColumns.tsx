import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import T from "@/components/shared/T";
import { DATE_TIME_FORMAT, formatDateTime } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { humanizeEnum } from "@/lib/statusBadge";
import type { IRateLimitLog } from "@/types/system.types";

// A count in the reader's digits.
const CountCell = ({ value }: { value: number }) => {
  const { locale } = useLocale();
  return <span className="tabular-nums">{formatCount(value, locale)}</span>;
};

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
    cell: ({ row }) => <span className="font-mono text-small wrap-anywhere text-ink">{row.original.endpoint}</span>,
  },
  {
    id: "caller",
    accessorFn: (row) => `${row.identifierType}:${row.identifier}`,
    header: "Caller",
    cell: ({ row }) => (
      <span className="flex flex-col gap-0.5">
        <span className="font-mono text-small wrap-anywhere text-ink">{row.original.identifier}</span>
        <span className="text-caption text-ink-muted">
          <T>{humanizeEnum(row.original.identifierType.toUpperCase())}</T>
        </span>
      </span>
    ),
  },
  {
    id: "requestCount",
    accessorKey: "requestCount",
    header: "Requests",
    cell: ({ row }) => <CountCell value={row.original.requestCount} />,
  },
  {
    id: "limitExceeded",
    accessorFn: (row) => (row.limitExceeded ? "EXCEEDED" : "OK"),
    header: "Result",
    cell: ({ row }) =>
      row.original.limitExceeded ? <StatusBadgeCell status="FAILED" label="Exceeded" /> : <StatusBadgeCell status="SUCCESS" label="Within limit" />,
  },
];
