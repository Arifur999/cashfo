import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { DATE_TIME_FORMAT, formatDateTime } from "@/lib/date";
import { humanizeEnum } from "@/lib/statusBadge";
import type { ISecurityFlag } from "@/types/securityFlag.types";
import FlagStatusSelect from "./FlagStatusSelect";

export const FLAGS_HIDDEN_COLUMNS = ["type"] as const;

const subjectOf = (flag: ISecurityFlag) => flag.relatedAdmin?.name ?? flag.relatedIp ?? "";

export const flagsColumns: ColumnDef<ISecurityFlag>[] = [
  {
    id: "severity",
    accessorKey: "severity",
    header: "Severity",
    cell: ({ row }) => <StatusBadgeCell status={row.original.severity} />,
  },
  {
    id: "description",
    accessorKey: "description",
    header: "Activity",
    cell: ({ row }) => (
      <div className="max-w-md min-w-0 space-y-0.5">
        <p className="whitespace-normal text-foreground">{row.original.description}</p>
        <p className="text-xs text-muted-foreground">{humanizeEnum(row.original.type)}</p>
      </div>
    ),
  },
  {
    id: "type",
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => humanizeEnum(row.original.type),
  },
  {
    id: "subject",
    accessorFn: subjectOf,
    header: "Admin / IP",
    cell: ({ row }) =>
      row.original.relatedAdmin ? (
        <span className="text-foreground">{row.original.relatedAdmin.name}</span>
      ) : (
        <span className="font-mono text-xs text-muted-foreground">{row.original.relatedIp ?? "—"}</span>
      ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="space-y-1">
        <FlagStatusSelect flag={row.original} />
        {row.original.reviewer && (
          <p className="text-xs text-muted-foreground">
            by {row.original.reviewer.name}, {formatDateTime(row.original.reviewedAt)}
          </p>
        )}
      </div>
    ),
    meta: { exportValue: (row) => humanizeEnum(row.status) },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Raised",
    cell: ({ row }) => <DateCell date={row.original.createdAt} formatString={DATE_TIME_FORMAT} />,
    meta: { exportValue: (row) => formatDateTime(row.createdAt) },
  },
];
