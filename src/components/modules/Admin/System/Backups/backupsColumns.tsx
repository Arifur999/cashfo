import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { DATE_TIME_FORMAT, formatDateTime } from "@/lib/date";
import { humanizeEnum } from "@/lib/statusBadge";
import type { IBackupRecord } from "@/types/system.types";

export const backupsColumns: ColumnDef<IBackupRecord>[] = [
  {
    id: "startedAt",
    accessorKey: "startedAt",
    header: "Started",
    cell: ({ row }) => <DateCell date={row.original.startedAt} formatString={DATE_TIME_FORMAT} />,
    meta: { exportValue: (row) => formatDateTime(row.startedAt) },
  },
  {
    id: "type",
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => humanizeEnum(row.original.type),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} />,
  },
  {
    id: "sizeMb",
    accessorKey: "sizeMb",
    header: "Size",
    cell: ({ row }) => <span className="tabular-nums">{row.original.sizeMb === null ? "—" : `${row.original.sizeMb.toFixed(1)} MB`}</span>,
  },
  {
    id: "completedAt",
    accessorKey: "completedAt",
    header: "Finished",
    cell: ({ row }) => <DateCell date={row.original.completedAt} formatString={DATE_TIME_FORMAT} />,
    meta: { exportValue: (row) => formatDateTime(row.completedAt) },
  },
  {
    id: "errorMessage",
    accessorKey: "errorMessage",
    header: "Error",
    cell: ({ row }) => <span className="text-xs whitespace-normal text-destructive">{row.original.errorMessage ?? ""}</span>,
  },
];
