import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { ANNOUNCEMENT_STATUS_LABEL, audienceText, scheduleText } from "@/lib/announcements";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { IAnnouncement } from "@/types/announcement.types";
import { ANNOUNCEMENT_TYPE_META } from "./announcementOptions";

// Who sees it and when, in the reader's language.
const AudienceCell = ({ targetPlan, planNames }: { targetPlan: string | null; planNames: Map<string, string> }) => {
  const { translate } = useLocale();
  return <span className="text-ink-2">{audienceText(targetPlan, planNames, translate)}</span>;
};

const ScheduleCell = ({ announcement }: { announcement: IAnnouncement }) => {
  const { translate } = useLocale();
  return <span className="text-small whitespace-nowrap text-ink-2">{scheduleText(announcement, translate)}</span>;
};

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
          <T>{label}</T>
        </span>
      );
    },
    meta: { width: 130, exportValue: (row) => ANNOUNCEMENT_TYPE_META[row.type].label },
  },
  {
    id: "title",
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-semibold text-ink">{row.original.title}</span>
        <span className={cn("truncate text-small", row.original.titleBn ? "font-bn text-ink-2" : "text-warning")}>{row.original.titleBn || <T>No Bangla text yet</T>}</span>
      </span>
    ),
    meta: { exportValue: (row) => row.title },
  },
  {
    id: "audience",
    accessorFn: (row) => audienceText(row.targetPlan, planNames),
    header: "Shown to",
    cell: ({ row }) => <AudienceCell targetPlan={row.original.targetPlan} planNames={planNames} />,
    meta: { width: 150 },
  },
  {
    id: "startAt",
    accessorKey: "startAt",
    header: "When",
    cell: ({ row }) => <ScheduleCell announcement={row.original} />,
    meta: { width: 190, exportValue: (row) => scheduleText(row) },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} label={ANNOUNCEMENT_STATUS_LABEL[row.original.status]} dot />,
    meta: { width: 100, exportValue: (row) => ANNOUNCEMENT_STATUS_LABEL[row.status] },
  },
];
