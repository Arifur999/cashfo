import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import T from "@/components/shared/T";
import Chip from "@/components/smartly/Chip";
import { formatDate, formatRelativeDateTime } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import type { BadgeTone } from "@/lib/statusBadge";
import type { CampaignStatus, ICampaign } from "@/types/notification.types";
import { CAMPAIGN_STATUS_LABEL, CHANNEL_META, templateName } from "../notificationOptions";
import { describeAudience, isPastDue } from "./campaignOptions";
import { inEnglish } from "@/lib/i18n/message";

// "5 of 8 sent", "1,251 sent · 0 failed", or nothing before it starts.
const progressText = (campaign: ICampaign, t: Translate, locale: Locale) => {
  const count = (value: number) => formatCount(value, locale);
  const done = campaign.sentCount + campaign.failedCount;
  if (campaign.status === "SENDING") return t("{done} of {total} sent", { done: count(done), total: count(campaign.reachableCount ?? campaign.audienceCount) });
  if (campaign.status === "SENT") return t("{sent} sent · {failed} failed", { sent: count(campaign.sentCount), failed: count(campaign.failedCount) });
  return null;
};

// "10 Oct, 10:00 am" for a schedule, "Not scheduled" for a draft; with the
// locale, in the reader's months and digits (the export leaves it out).
const whenText = (campaign: ICampaign, t: Translate, locale: Locale = "en") => {
  // Sent: when it finished; sending: when the last round went.
  if (campaign.status === "SENT" && campaign.sentAt) return formatRelativeDateTime(campaign.sentAt, { t, locale });
  if (campaign.status === "SENDING" && campaign.sentAt) return t("Started {time}", { time: formatDate(campaign.sentAt, "h:mm aaa", "—", locale) });
  if (campaign.scheduledFor) return formatRelativeDateTime(campaign.scheduledFor, { t, locale });
  return campaign.status === "DRAFT" ? t("Not scheduled") : formatDate(campaign.createdAt, "d MMM", "—", locale);
};

// Who gets it, wrapping onto two lines rather than into the next column.
// It can be Bangla, so it keeps the face's own line height.
const AudienceCell = ({ campaign, planNames }: { campaign: ICampaign; planNames: Map<string, string> }) => {
  const { translate } = useLocale();
  return <span className="text-small leading-[1.4] whitespace-normal text-ink-2">{describeAudience(campaign.targetFilter, planNames, translate)}</span>;
};

// The board's status chips: scheduled blue, sending amber, sent mint, a
// draft grey and a cancelled one paler still.
const STATUS_TONE: Record<CampaignStatus, BadgeTone> = { DRAFT: "neutral", SCHEDULED: "info", SENDING: "warning", SENT: "success", CANCELLED: "neutral" };

// The status, then when and how far it got. A scheduled campaign whose time
// has passed hasn't gone (nothing sends them yet), and says so.
const StatusCell = ({ campaign }: { campaign: ICampaign }) => {
  const { locale, translate } = useLocale();
  const progress = progressText(campaign, translate, locale);
  const pastDue = isPastDue(campaign);
  return (
    <span className="flex flex-col items-start gap-0.75">
      <StatusBadgeCell status={campaign.status} label={CAMPAIGN_STATUS_LABEL[campaign.status]} tone={STATUS_TONE[campaign.status]} className={campaign.status === "CANCELLED" ? "text-ink-faint" : undefined} />
      {pastDue ? (
        <span className="text-[11.5px] leading-[normal] font-semibold whitespace-normal text-warning">{translate("Due {time} · not sent", { time: whenText(campaign, translate, locale) })}</span>
      ) : (
        <span className="text-[11.5px] leading-[normal] text-ink-muted">{whenText(campaign, translate, locale)}</span>
      )}
      {progress && <span className="text-[11.5px] leading-[normal] text-ink-muted">{progress}</span>}
    </span>
  );
};

const PeopleCell = ({ count }: { count: number }) => {
  const { locale } = useLocale();
  return <span className="text-[13.5px] leading-[normal] font-semibold tabular-nums">{formatCount(count, locale)}</span>;
};

// The design's campaigns list: the campaign over its template, who gets
// it, how many that is, the channel, and the status with when and how far.
export const buildCampaignsColumns = (planNames: Map<string, string>): ColumnDef<ICampaign>[] => [
  {
    id: "title",
    accessorKey: "title",
    header: "Campaign",
    cell: ({ row }) => (
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[13.5px] leading-[normal] font-semibold text-ink">{row.original.title}</span>
        <span className="truncate text-caption text-ink-muted">
          <T>{templateName(row.original.templateKey)}</T>
        </span>
      </span>
    ),
  },
  {
    id: "audience",
    accessorFn: (row) => describeAudience(row.targetFilter, planNames),
    header: "Who gets it",
    cell: ({ row }) => <AudienceCell campaign={row.original} planNames={planNames} />,
    meta: { width: 170 },
  },
  {
    id: "audienceCount",
    accessorKey: "audienceCount",
    header: "People",
    cell: ({ row }) => <PeopleCell count={row.original.audienceCount} />,
    meta: { width: 60, align: "right" },
  },
  {
    id: "channel",
    accessorKey: "channel",
    header: "Channel",
    cell: ({ row }) => (
      <Chip tone={CHANNEL_META[row.original.channel].tone} size="sm" className="h-auto px-2 py-0.5 text-[11.5px] font-semibold">
        <T>{CHANNEL_META[row.original.channel].label}</T>
      </Chip>
    ),
    meta: { width: 76, exportValue: (row) => CHANNEL_META[row.channel].label },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusCell campaign={row.original} />,
    meta: { width: 150, exportValue: (row) => `${CAMPAIGN_STATUS_LABEL[row.status]} · ${whenText(row, inEnglish)}` },
  },
];
