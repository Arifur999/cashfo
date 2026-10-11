import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { DATE_TIME_FORMAT, formatDateTime } from "@/lib/date";
import { humanizeEnum } from "@/lib/statusBadge";
import type { ILoginAttempt } from "@/types/loginAttempt.types";

export const LOGIN_ATTEMPTS_HIDDEN_COLUMNS = ["userAgent"] as const;

const resultOf = (attempt: ILoginAttempt) => (attempt.success ? "SUCCESS" : "FAILED");

// "invalid_password" -> "Invalid password"
const reasonOf = (attempt: ILoginAttempt) => (attempt.failureReason ? humanizeEnum(attempt.failureReason.toUpperCase()) : "");

export const loginAttemptsColumns: ColumnDef<ILoginAttempt>[] = [
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => <DateCell date={row.original.createdAt} formatString={DATE_TIME_FORMAT} />,
    meta: { exportValue: (row) => formatDateTime(row.createdAt) },
  },
  {
    id: "email",
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <span className="text-foreground">{row.original.email}</span>,
  },
  {
    id: "ipAddress",
    accessorKey: "ipAddress",
    header: "IP Address",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.ipAddress}</span>,
  },
  {
    id: "result",
    accessorFn: resultOf,
    header: "Result",
    cell: ({ row }) => <StatusBadgeCell status={resultOf(row.original)} label={row.original.success ? "Succeeded" : "Failed"} />,
  },
  {
    id: "failureReason",
    accessorFn: reasonOf,
    header: "Reason",
    cell: ({ row }) => <span className="text-muted-foreground">{reasonOf(row.original) || "—"}</span>,
  },
  {
    id: "userAgent",
    accessorKey: "userAgent",
    header: "Browser",
    cell: ({ row }) => (
      <span className="block max-w-xs truncate text-xs text-muted-foreground" title={row.original.userAgent ?? undefined}>
        {row.original.userAgent ?? "—"}
      </span>
    ),
  },
];
