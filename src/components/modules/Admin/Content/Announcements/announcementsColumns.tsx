import type { ColumnDef } from "@tanstack/react-table";
import { ANNOUNCEMENT_STATUS_LABEL, audienceText, scheduleText } from "@/lib/announcements";
import T from "@/components/shared/T";
import { formatDate } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { AnnouncementStatus, IAnnouncement } from "@/types/announcement.types";
import { ANNOUNCEMENT_TYPE_META } from "./announcementOptions";

// The status chip's wash, words and dot: live mint, scheduled blue, the
// rest grey.
const STATUS_LOOK: Record<AnnouncementStatus, { chip: string; dot: string }> = {
  ACTIVE: { chip: "bg-mint-50 text-brand-ink", dot: "bg-mint-300" },
  SCHEDULED: { chip: "bg-info-soft text-info", dot: "bg-info" },
  EXPIRED: { chip: "bg-surface-sunken text-ink-soft", dot: "bg-ink-faint" },
  DISABLED: { chip: "bg-surface-sunken text-ink-soft", dot: "bg-ink-faint" },
};

const StatusChip = ({ status }: { status: AnnouncementStatus }) => {
  const { translate } = useLocale();
  return (
    <span className={cn("inline-flex items-center gap-1.25 rounded-full px-2 py-0.5 text-caption font-semibold whitespace-nowrap", STATUS_LOOK[status].chip)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", STATUS_LOOK[status].dot)} />
      {translate(ANNOUNCEMENT_STATUS_LABEL[status])}
    </span>
  );
};

// Who sees it and when, in the reader's language. A range wraps onto two
// lines rather than running into the status beside it.
const AudienceCell = ({ targetPlan, planNames }: { targetPlan: string | null; planNames: Map<string, string> }) => {
  const { translate } = useLocale();
  // "Everyone", or "Free plan" as the board says it.
  const plan = targetPlan ? planNames.get(targetPlan) : undefined;
  return <span className="text-[13.5px] leading-[normal] whitespace-normal text-ink-2">{plan ? translate("{name} plan", { name: plan }) : audienceText(targetPlan, planNames, translate)}</span>;
};

// When it went (or goes) to the bells, as the board says it ("31 Oct, 10:30 am"),
// and when its banner leaves the app, if it does.
const ScheduleCell = ({ announcement }: { announcement: IAnnouncement }) => {
  const { translate, locale } = useLocale();
  return (
    <span className="flex flex-col text-[13px] whitespace-nowrap text-ink-2">
      {formatDate(announcement.startAt, "d MMM, h:mm aaa", "—", locale)}
      {announcement.endAt && <span className="text-caption text-ink-muted">{translate("Until {date}", { date: formatDate(announcement.endAt, "d MMM, h:mm aaa", "—", locale) })}</span>}
    </span>
  );
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
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.25 py-0.75 text-caption font-semibold whitespace-nowrap", chip)}>
          <Icon className="size-3.25" strokeWidth={2.25} aria-hidden="true" />
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
        {row.original.titleBn ? (
          <span lang="bn" className="truncate font-bn text-small text-ink-soft">
            {row.original.titleBn}
          </span>
        ) : (
          <span className="truncate text-small text-warning">
            <T>No Bangla text yet, users see English</T>
          </span>
        )}
      </span>
    ),
    meta: { exportValue: (row) => row.title },
  },
  {
    id: "audience",
    accessorFn: (row) => audienceText(row.targetPlan, planNames),
    header: "Sent to",
    cell: ({ row }) => <AudienceCell targetPlan={row.original.targetPlan} planNames={planNames} />,
    meta: { width: 120 },
  },
  {
    id: "startAt",
    accessorKey: "startAt",
    header: "When",
    cell: ({ row }) => <ScheduleCell announcement={row.original} />,
    meta: { width: 170, exportValue: (row) => scheduleText(row) },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusChip status={row.original.status} />,
    meta: { width: 110, exportValue: (row) => ANNOUNCEMENT_STATUS_LABEL[row.status] },
  },
];
