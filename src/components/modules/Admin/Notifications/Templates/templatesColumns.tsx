import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { formatDate } from "@/lib/date";
import type { INotificationTemplate } from "@/types/notification.types";

export const templatesColumns: ColumnDef<INotificationTemplate>[] = [
  {
    id: "key",
    accessorKey: "key",
    header: "Template",
    cell: ({ row }) => (
      <div className="max-w-md min-w-0 space-y-0.5">
        <p className="font-mono text-xs font-medium text-foreground">{row.original.key}</p>
        {row.original.subjectEn && <p className="text-sm text-foreground">{row.original.subjectEn}</p>}
        <p className="line-clamp-2 text-xs whitespace-normal text-muted-foreground">{row.original.bodyEn}</p>
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
    id: "variables",
    accessorFn: (row) => row.variables.join(", "),
    header: "Variables",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex max-w-xs flex-wrap gap-1">
        {row.original.variables.map((name) => (
          <code key={name} className="rounded bg-muted px-1 py-0.5 text-[11px] text-muted-foreground">
            {name}
          </code>
        ))}
      </div>
    ),
  },
  {
    id: "updatedAt",
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => <DateCell date={row.original.updatedAt} />,
    meta: { exportValue: (row) => formatDate(row.updatedAt) },
  },
];
