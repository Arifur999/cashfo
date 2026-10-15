"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import type { ReferralEntry } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { filterCounts, filterReferrals, readyOn, REFERRAL_FILTERS, sortReferrals, STATUS_META, type ReferralFilter } from "@/lib/customer/referralDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface FriendsTableProps {
  entries: ReferralEntry[];
  currency: string;
}

const ROW = "md:grid md:grid-cols-[minmax(0,1fr)_120px_190px] md:items-center md:gap-x-4";

// Everyone who joined with the link, with what each one earns and where
// that reward stands.
export function FriendsTable({ entries, currency }: FriendsTableProps) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<ReferralFilter>("ALL");
  const counts = filterCounts(entries);
  const rows = sortReferrals(filterReferrals(entries, filter));
  const pending = counts.PENDING;

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-title font-semibold text-ink">{t("Friends who joined with your link")}</h2>
        {entries.length > 0 && (
          <SegmentedControl
            label={t("Filter friends")}
            variant="soft"
            value={filter}
            onChange={setFilter}
            options={REFERRAL_FILTERS.map((option) => ({
              value: option.value,
              label: (
                <>
                  {t(option.label)} <span className="text-ink-muted">{counts[option.value]}</span>
                </>
              ),
            }))}
          />
        )}
      </div>
      {entries.length === 0 ? (
        <div className="border-t border-surface-sunken px-5 py-10 text-center text-small text-ink-muted">{t("No one has joined with your link yet. Share it and they show up here.")}</div>
      ) : (
        <>
          <div className={cn("hidden border-y border-line bg-cream px-5 py-2 text-caption font-medium text-ink-muted", ROW)}>
            <span>{t("Friend")}</span>
            <span className="text-right">{t("You earn")}</span>
            <span>{t("Status")}</span>
          </div>
          {rows.length === 0 && <div className="px-5 py-6 text-small text-ink-muted">{t("No friends in this group.")}</div>}
          {rows.map((entry) => {
            const meta = STATUS_META[entry.status];
            return (
              <div key={entry.id} className={cn("flex flex-col gap-2 border-b border-surface-sunken px-5 py-3 text-body last:border-b-0 md:min-h-13 md:py-0", ROW)}>
                <span className="flex min-w-0 items-center gap-3">
                  <PersonAvatar name={entry.name} size={32} coloured />
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="truncate font-medium text-ink">{entry.name}</span>
                    <span className="text-caption text-ink-muted">
                      {t("Joined")} {formatDate(entry.createdAt, "d MMM")}
                    </span>
                  </span>
                </span>
                <span className={cn("font-bold tabular-nums md:text-right", entry.status === "PENDING" ? "text-ink-muted" : "text-ink")}>{formatCurrency(entry.rewardAmount, currency)}</span>
                <span className="flex flex-col items-start gap-0.5">
                  <Chip tone={meta.tone} size="sm" className="gap-1">
                    <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                    {t(meta.label)}
                  </Chip>
                  <span className="text-caption whitespace-nowrap text-ink-muted">{entry.status === "PENDING" ? `${t(meta.note)} ${formatDate(readyOn(entry), "d MMM")}` : t(meta.note)}</span>
                </span>
              </div>
            );
          })}
          {pending > 0 && (
            <div className="flex items-center gap-3 bg-cream px-5 py-3 text-small text-ink-2">
              <Info className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <span>
                {pending} {t(pending === 1 ? "reward is still pending. It becomes available 30 days after your friend joined." : "rewards are still pending. They become available 30 days after each friend joined.")}
              </span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
