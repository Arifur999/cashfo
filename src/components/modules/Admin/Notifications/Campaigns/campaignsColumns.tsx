import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { formatDate, formatRelativeDateTime } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import type { ICampaign } from "@/types/notification.types";
import { CAMPAIGN_STATUS_LABEL, CHANNEL_META } from "../notificationOptions";
import { describeAudience } from "./campaignOptions";

// "5 of 8 sent", "1,251 sent · 0 failed", or nothing before it starts.
const progressText = (campaign: ICampaign) => {
  const done = campaign.sentCount + campaign.failedCount;
  if (campaign.status === "SENDING") return `${formatNumber(done)} of ${formatNumber(campaign.audienceCount)} sent`;
  if (campaign.status === "SENT") return `${formatNumber(campaign.sentCount)} sent · ${formatNumber(campaign.failedCount)} failed`;
  return null;
};

// "10 Oct, 10:00 am" for a schedule, "Not scheduled" for a draft.
const whenText = (campaign: ICampaign) => {
  if (campaign.scheduledFor) return formatRelativeDateTime(campaign.scheduledFor);
  return campaign.status === "DRAFT" ? "Not scheduled" : formatDate(campaign.createdAt, "d MMM");
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
    cell: ({ getValue }) => <span className="text-small leading-snug text-ink-2">{String(getValue())}</span>,
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
    cell: ({ row }) => <span className={cn("inline-flex rounded-full px-2 py-0.5 text-caption font-semibold", CHANNEL_META[row.original.channel].chip)}>{CHANNEL_META[row.original.channel].label}</span>,
    meta: { exportValue: (row) => CHANNEL_META[row.channel].label },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span className="flex flex-col items-start gap-0.75">
        <StatusBadgeCell status={row.original.status} label={CAMPAIGN_STATUS_LABEL[row.original.status]} />
        <span className="text-caption text-ink-muted">{whenText(row.original)}</span>
        {progressText(row.original) && <span className="text-caption text-ink-muted">{progressText(row.original)}</span>}
      </span>
    ),
    meta: { exportValue: (row) => `${CAMPAIGN_STATUS_LABEL[row.status]} · ${whenText(row)}` },
  },
];
