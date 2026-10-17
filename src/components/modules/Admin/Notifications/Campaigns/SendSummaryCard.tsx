"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import { formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import { notificationLogStatsQuery } from "@/queries/notification.queries";
import { CHANNEL_META } from "../notificationOptions";

// Beside the campaigns: the last day of sending, the latest failure, and a
// word about what SMS costs.
const SendSummaryCard = () => {
  const stats = useQuery(notificationLogStatsQuery()).data?.data;
  const rows = stats
    ? [
        { label: "Sent", value: stats.sent, dot: "bg-emerald" },
        { label: "Waiting to send", value: stats.queued, dot: "bg-warning-fill" },
        { label: "Failed", value: stats.failed, dot: "bg-expense-fill" },
      ]
    : [];

  return (
    <aside className="flex flex-col gap-4">
      <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
        <h2 className="text-body font-semibold text-ink">Last 24 hours</h2>
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 text-body">
            <span className={cn("size-2 rounded-full", row.dot)} aria-hidden="true" />
            <span className="grow text-ink">{row.label}</span>
            <b className="font-semibold tabular-nums">{formatNumber(row.value)}</b>
          </div>
        ))}
        {stats?.lastFailure && (
          <div className="rounded-md bg-expense-soft px-3 py-3 text-small leading-snug text-expense">
            {CHANNEL_META[stats.lastFailure.channel].label} failed
            {stats.lastFailure.errorMessage && `: ${stats.lastFailure.errorMessage}`} ({stats.lastFailure.templateKey}
            {stats.lastFailure.userName && ` to ${stats.lastFailure.userName}`}).
          </div>
        )}
        <Link href="/admin/notifications/history" className="text-small font-semibold text-emerald hover:underline">
          Full send history
        </Link>
      </Card>
      <Card padding="none" className="flex flex-col gap-2 px-5 py-4">
        <h2 className="text-body font-semibold text-ink">SMS costs money</h2>
        <span className="text-small leading-relaxed text-ink-2">Each SMS is paid for. Use email or in-app for offers, and keep SMS for payments and security.</span>
      </Card>
    </aside>
  );
};

export default SendSummaryCard;
