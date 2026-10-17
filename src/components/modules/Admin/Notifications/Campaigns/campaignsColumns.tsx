import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import T from "@/components/shared/T";
import { formatDate, formatRelativeDateTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Translate } from "@/lib/i18n/message";
import { formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import type { ICampaign } from "@/types/notification.types";
import { CAMPAIGN_STATUS_LABEL, CHANNEL_META } from "../notificationOptions";
import { describeAudience } from "./campaignOptions";
import { inEnglish } from "@/lib/i18n/message";

// "5 of 8 sent", "1,251 sent · 0 failed", or nothing before it starts.
const progressText = (campaign: ICampaign, t: Translate) => {
  const done = campaign.sentCount + campaign.failedCount;
  if (campaign.status === "SENDING") return t("{done} of {total} sent", { done: formatNumber(done), total: formatNumber(campaign.audienceCount) });
  if (campaign.status === "SENT") return t("{sent} sent · {failed} failed", { sent: formatNumber(campaign.sentCount), failed: formatNumber(campaign.failedCount) });
  return null;
};

// "10 Oct, 10:00 am" for a schedule, "Not scheduled" for a draft.
const whenText = (campaign: ICampaign, t: Translate) => {
  if (campaign.scheduledFor) return formatRelativeDateTime(campaign.scheduledFor, { t });
  return campaign.status === "DRAFT" ? t("Not scheduled") : formatDate(campaign.createdAt, "d MMM");
};

const AudienceCell = ({ campaign, planNames }: { campaign: ICampaign; planNames: Map<string, string> }) => {
  const { translate } = useLocale();
  return <span className="text-small leading-snug text-ink-2">{describeAudience(campaign.targetFilter, planNames, translate)}</span>;
};

// The status, then when and how far it got.
const StatusCell = ({ campaign }: { campaign: ICampaign }) => {
  const { translate } = useLocale();
  const progress = progressText(campaign, translate);
  return (
    <span className="flex flex-col items-start gap-0.75">
      <StatusBadgeCell status={campaign.status} label={CAMPAIGN_STATUS_LABEL[campaign.status]} />
      <span className="text-caption text-ink-muted">{whenText(campaign, translate)}</span>
      {progress && <span className="text-caption text-ink-muted">{progress}</span>}
    </span>
  );
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
        <span className="truncate font-semibold text-ink">{row.original.title}</span>
        <code className="font-mono text-caption text-ink-muted">{row.original.templateKey}</code>
      </span>
    ),
    meta: { cellClassName: "max-w-80" },
  },
  {
    id: "audience",
    accessorFn: (row) => describeAudience(row.targetFilter, planNames),
    header: "Who gets it",
    cell: ({ row }) => <AudienceCell campaign={row.original} planNames={planNames} />,
  },
  {
    id: "audienceCount",
    accessorKey: "audienceCount",
    header: "People",
    cell: ({ row }) => <span className="font-semibold tabular-nums">{formatNumber(row.original.audienceCount)}</span>,
    meta: { align: "right" },
  },
  {
    id: "channel",
    accessorKey: "channel",
    header: "Channel",
    cell: ({ row }) => (
      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-caption font-semibold", CHANNEL_META[row.original.channel].chip)}>
        <T>{CHANNEL_META[row.original.channel].label}</T>
      </span>
    ),
    meta: { exportValue: (row) => CHANNEL_META[row.channel].label },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusCell campaign={row.original} />,
    meta: { exportValue: (row) => `${CAMPAIGN_STATUS_LABEL[row.status]} · ${whenText(row, inEnglish)}` },
  },
];
