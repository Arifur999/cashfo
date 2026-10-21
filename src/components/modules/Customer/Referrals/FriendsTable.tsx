"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Chip from "@/components/smartly/Chip";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow } from "@/components/smartly/list";
import Pagination from "@/components/smartly/Pagination";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { usePageParam } from "@/hooks/usePageParam";
import type { ReferralInfo } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { filterCounts, filterReferrals, friendDay, joinedOn, listsEveryFriend, pendingFriends, readyOn, REFERRAL_FILTERS, sortReferrals, STATUS_META, type ReferralFilter } from "@/lib/customer/referralDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { paginate } from "@/lib/table/paginate";
import { cn } from "@/lib/utils";

interface FriendsTableProps {
  info: ReferralInfo;
  currency: string;
  // The app's "YYYY-MM-DD", so a date from another year says its year.
  today: string;
}

// Friend | You earn | Status from md up. The fixed columns stay near 260px,
// so a name keeps its room beside How it works at xl. Phones put the
// reward over its chip on the right of the name.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_100px_160px]";
const PAGE_SIZE = 25;
const LIST_ID = "referral-friends";

// Everyone who joined with the link, with what each one earns and where
// that reward stands, 25 to a page. Phones get the board's one-line rows
// and no filter.
export function FriendsTable({ info, currency, today }: FriendsTableProps) {
  const { t, locale } = useLocale();
  const [filter, setFilter] = useState<ReferralFilter>("ALL");
  const { page, setPage } = usePageParam();
  const entries = info.recentReferrals;
  const counts = filterCounts(entries);
  const list = paginate(sortReferrals(filterReferrals(entries, filter)), page, PAGE_SIZE);
  const count = (value: number) => formatCount(value, locale);
  // The API may send only the newest friends; the footer says so, so the
  // list never reads as everyone while the hero counts more.
  const cut = !listsEveryFriend(info) && entries.length > 0;
  const pending = pendingFriends(info);
  const showPending = pending === null ? counts.PENDING > 0 : pending > 0;

  function choose(next: ReferralFilter) {
    setFilter(next);
    setPage(1);
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 md:px-6">
      <h2 className="text-title text-ink">
        <span className="md:hidden">{t("Friends · {count} joined", { count: count(info.referralCount) })}</span>
        <span className="hidden md:inline">{t("Friends who joined with your link")}</span>
      </h2>
      {entries.length > 0 && (
        <SegmentedControl
          className="max-md:hidden"
          label="Filter friends"
          variant="soft"
          // 44px segments under a finger (a tablet), the board's size for a mouse.
          size="coarse"
          value={filter}
          onChange={choose}
          options={REFERRAL_FILTERS.map((option) => ({
            value: option.value,
            // One span, so the segment's flex gap doesn't widen the space.
            label: (
              <span>
                {t(option.label)} <span className="text-ink-muted tabular-nums">{count(counts[option.value])}</span>
              </span>
            ),
          }))}
        />
      )}
    </div>
  );

  const footer = (
    <>
      {(list.totalPages > 1 || cut) && (
        <ListFooter>
          {list.totalPages > 1 && <Pagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={setPage} focusTargetId={LIST_ID} />}
          {cut && <p>{t("Showing the newest {shown} of {total} friends", { shown: count(entries.length), total: count(info.referralCount) })}</p>}
        </ListFooter>
      )}
      {showPending && (
        <ListFooter className="flex-row items-center gap-3 bg-strip text-ink-2">
          <Info className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <span>
            {pending === null
              ? t("Rewards are still pending. Each becomes available 30 days after the friend joined.")
              : t(pending === 1 ? "{count} reward is still pending. It becomes available 30 days after your friend joined." : "{count} rewards are still pending. They become available 30 days after each friend joined.", { count: count(pending) })}
          </span>
        </ListFooter>
      )}
    </>
  );

  return (
    <ListCard id={LIST_ID} label={t("Friends who joined with your link")} header={header} footer={footer}>
      {entries.length === 0 ? (
        <ListEmpty title={t("No one has joined with your link yet. Share it and they show up here.")} />
      ) : (
        <>
          <ListHead columns={COLUMNS}>
            <ListHeadCell>{t("Friend")}</ListHeadCell>
            <ListHeadCell align="end">{t("You earn")}</ListHeadCell>
            <ListHeadCell>{t("Status")}</ListHeadCell>
          </ListHead>
          {list.rows.length === 0 && <ListEmpty title={t("No friends with this status.")} className="py-6" />}
          {list.rows.map((entry) => {
            const meta = STATUS_META[entry.status];
            const waiting = entry.status === "PENDING";
            const reward = formatCurrency(entry.rewardAmount, currency);
            return (
              <ListRow key={entry.id} columns={COLUMNS}>
                <ListCell className="flex min-w-0 items-center gap-3">
                  <PersonAvatar name={entry.name} size={32} coloured />
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="truncate font-medium text-ink">{entry.name}</span>
                    <span className="truncate text-caption text-ink-muted">{t("Joined {date}", { date: friendDay(joinedOn(entry), today, locale) })}</span>
                  </span>
                </ListCell>
                {/* Phones: the reward over its status, on the right. */}
                <ListCell align="end" className="flex flex-col items-end gap-0.75 md:block">
                  <span className={cn("font-bold tabular-nums", waiting ? "text-ink-muted" : "text-ink")}>{reward}</span>
                  <Chip tone={meta.tone} size="sm" className="md:hidden">
                    {t(meta.label)}
                  </Chip>
                </ListCell>
                <ListCell className="hidden flex-col items-start gap-0.5 md:flex">
                  <Chip tone={meta.tone} size="sm" className="gap-1">
                    <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                    {t(meta.label)}
                  </Chip>
                  <span className="text-caption whitespace-nowrap text-ink-muted">{waiting ? t(meta.note, { date: friendDay(readyOn(entry), today, locale) }) : t(meta.note)}</span>
                </ListCell>
              </ListRow>
            );
          })}
        </>
      )}
    </ListCard>
  );
}
