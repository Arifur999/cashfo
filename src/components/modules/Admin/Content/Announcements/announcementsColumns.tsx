import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { ANNOUNCEMENT_STATUS_LABEL, audienceText, scheduleText } from "@/lib/announcements";
import { cn } from "@/lib/utils";
import type { IAnnouncement } from "@/types/announcement.types";
import { ANNOUNCEMENT_TYPE_META } from "./announcementOptions";

// The design's announcements list: the kind as a chip with its icon, the
// title over its Bangla, who sees it, when, and whether it is live. Built
// per plan list, since the audience shows plan names for ids.
export const buildAnnouncementsColumns = (planNames: Map<string, string>): ColumnDef<IAnnouncement>[] => [
  {
    id: "type",
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const { label, icon: Icon, chip } = ANNOUNCEMENT_TYPE_META[row.original.type];
      return (
        <span className={cn("inline-flex items-center gap-2 rounded-full px-2 py-0.75 text-caption font-semibold", chip)}>
          <Icon className="size-3.5" aria-hidden="true" />
          {label}
        </span>
      );
    },
    meta: { exportValue: (row) => ANNOUNCEMENT_TYPE_META[row.type].label },
  },
  {
    id: "title",
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-semibold text-ink">{row.original.title}</span>
        <span className={cn("truncate text-small", row.original.titleBn ? "font-bn text-ink-2" : "text-warning")}>{row.original.titleBn || "No Bangla text yet"}</span>
      </span>
    ),
    meta: { exportValue: (row) => row.title, cellClassName: "max-w-96" },
  },
  {
    id: "audience",
    accessorFn: (row) => audienceText(row.targetPlan, planNames),
    header: "Shown to",
    cell: ({ getValue }) => <span className="text-ink-2">{String(getValue())}</span>,
  },
  {
    id: "startAt",
    accessorKey: "startAt",
    header: "When",
    cell: ({ row }) => <span className="text-small whitespace-nowrap text-ink-2">{scheduleText(row.original)}</span>,
    meta: { exportValue: (row) => scheduleText(row) },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} label={ANNOUNCEMENT_STATUS_LABEL[row.original.status]} dot />,
    meta: { exportValue: (row) => ANNOUNCEMENT_STATUS_LABEL[row.status] },
  },
];
