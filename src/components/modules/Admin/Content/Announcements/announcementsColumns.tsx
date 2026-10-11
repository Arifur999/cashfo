import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { formatDateTime } from "@/lib/date";
import type { IAnnouncement } from "@/types/announcement.types";

const audienceOf = (announcement: IAnnouncement, planNames: Map<string, string>) =>
  announcement.targetPlan ? `${planNames.get(announcement.targetPlan) ?? "Unknown plan"} subscribers` : "All users";

// Built per plan list, since the audience column shows plan names for ids.
export const buildAnnouncementsColumns = (planNames: Map<string, string>): ColumnDef<IAnnouncement>[] => [
  {
    id: "title",
    accessorKey: "title",
    header: "Announcement",
    cell: ({ row }) => (
      <div className="max-w-md min-w-0 space-y-0.5">
        <p className="font-medium whitespace-normal text-foreground">{row.original.title}</p>
        <p className="line-clamp-2 text-xs whitespace-normal text-muted-foreground">{row.original.body}</p>
      </div>
    ),
  },
  {
    id: "type",
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <StatusBadgeCell status={row.original.type} />,
  },
  {
    id: "audience",
    accessorFn: (row) => audienceOf(row, planNames),
    header: "Audience",
    cell: ({ getValue }) => <span className="text-muted-foreground">{String(getValue())}</span>,
  },
  {
    id: "startAt",
    accessorKey: "startAt",
    header: "Schedule",
    cell: ({ row }) => (
      <div className="text-xs whitespace-nowrap">
        <p className="text-foreground">{formatDateTime(row.original.startAt)}</p>
        <p className="text-muted-foreground">{row.original.endAt ? `until ${formatDateTime(row.original.endAt)}` : "No end date"}</p>
      </div>
    ),
    meta: { exportValue: (row) => `${formatDateTime(row.startAt)} - ${row.endAt ? formatDateTime(row.endAt) : "open"}` },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} />,
  },
];
