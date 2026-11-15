"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Translate } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import { notificationLogStatsQuery } from "@/queries/notification.queries";
import type { INotificationLogStats } from "@/types/notification.types";
import { CHANNEL_META } from "../notificationOptions";
import T from "@/components/shared/T";

// The latest failure as one sentence, in either language: the error and
// the person are in it when they are known.
const failureText = (failure: NonNullable<INotificationLogStats["lastFailure"]>, t: Translate) => {
  const values = { channel: t(CHANNEL_META[failure.channel].label), error: failure.errorMessage ?? "", template: failure.templateKey, name: failure.userName ?? "" };
  if (failure.errorMessage) {
    return t(failure.userName ? "{channel} failed: {error} ({template} to {name})." : "{channel} failed: {error} ({template}).", values);
  }
  return t(failure.userName ? "{channel} failed ({template} to {name})." : "{channel} failed ({template}).", values);
};

// Beside the campaigns: the last day of sending, the latest failure, and a
// word about what SMS costs.
const SendSummaryCard = () => {
  const query = useQuery(notificationLogStatsQuery());
  const stats = query.data?.data;
  const { locale, translate } = useLocale();
  const rows = stats
    ? [
        { label: "Sent", value: stats.sent, dot: "bg-emerald" },
        { label: "Waiting to send", value: stats.queued, dot: "bg-warning-fill" },
        { label: "Failed", value: stats.failed, dot: "bg-expense-fill" },
      ]
    : [];

  return (
    <aside className="flex flex-col gap-4">
      <Card padding="none" className="flex flex-col gap-2.5 px-4.5 py-4">
        <h2 className="text-body font-semibold text-ink"><T>Last 24 hours</T></h2>
        {/* Figures that failed to load say so, not an empty card. */}
        {!stats && query.isError && (
          <div className="flex flex-col items-start gap-2">
            <span className="text-small text-ink-muted">{translate("Couldn't load the last day's figures.")}</span>
            <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
              {translate("Try again")}
            </Button>
          </div>
        )}
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2.5 text-[13.5px] leading-[normal]">
            <span className={cn("size-2 rounded-full", row.dot)} aria-hidden="true" />
            <span className="grow text-ink">
              <T>{row.label}</T>
            </span>
            <b className="font-semibold tabular-nums">{formatCount(row.value, locale)}</b>
          </div>
        ))}
        {stats?.lastFailure && <div className="rounded-md bg-expense-soft px-3 py-3 text-small text-expense">{failureText(stats.lastFailure, translate)}</div>}
        <Link href="/admin/notifications/history" className="text-small font-semibold text-emerald hover:underline">
          <T>Full send history</T>
        </Link>
      </Card>
      <Card padding="none" className="flex flex-col gap-1.5 px-4.5 py-4">
        <h2 className="text-body font-semibold text-ink"><T>SMS costs money</T></h2>
        <span className="text-small leading-relaxed text-ink-2"><T>Each SMS is paid for. Use email or in-app for offers, and keep SMS for payments and security.</T></span>
      </Card>
    </aside>
  );
};

export default SendSummaryCard;
