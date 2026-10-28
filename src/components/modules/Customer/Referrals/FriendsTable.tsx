"use client";

import { MessageCircle, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { ListCard, ListEmpty, ListFooter } from "@/components/smartly/list";
import Pagination from "@/components/smartly/Pagination";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { usePageParam } from "@/hooks/usePageParam";
import { formatCurrency } from "@/lib/customer/currency";
import { remindFriendsAction } from "@/lib/customer/referralActions";
import { dayOf, filterFriends, FRIEND_STATUS, FRIEND_TABS, friendDay, friendNote, friendTabCounts, notBought, notBoughtLine, type FriendTab } from "@/lib/customer/referralDisplay";
import type { ReferralFriend, ReferralProgramInfo } from "@/lib/customer/referralTypes";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { paginate } from "@/lib/table/paginate";
import { cn } from "@/lib/utils";
import { StatusChip } from "./ReferralBits";

interface FriendsTableProps {
  info: ReferralProgramInfo;
  friends: ReferralFriend[];
  currency: string;
  // The app's "YYYY-MM-DD", so a date from another year says its year.
  today: string;
  // Reminders go only while the program runs.
  canRemind: boolean;
}

// Friend | Plan bought | They paid | You earn | Status (ReferralDashboard).
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_150px_86px_96px_168px]";
const PAGE_SIZE = 25;
const LIST_ID = "referral-friends";
// The phone list shows this many before "See all".
const PHONE_FIRST = 5;

// Everyone who joined with the link: what they bought, what they paid, what
// it earns and where that stands, filtered All / Bought / Not yet /
// Refunded, 25 to a page, with a nudge for the ones who haven't bought.
// Phones get the board's short list (ReferralMobile): five rows, then
// "See all".
export function FriendsTable({ info, friends, currency, today, canRemind }: FriendsTableProps) {
  const { t, fmt } = useLocale();
  const [tab, setTab] = useState<FriendTab>("ALL");
  const [showAll, setShowAll] = useState(false);
  const [reminded, setReminded] = useState(false);
  const [isReminding, startRemind] = useTransition();
  const { page, setPage } = usePageParam();
  const counts = friendTabCounts(info, friends);
  const list = paginate(filterFriends(friends, tab), page, PAGE_SIZE);
  const count = (value: number) => formatCount(value, fmt);
  const money = (value: string | number) => formatCurrency(value, currency, fmt);
  const waiting = notBought(friends);
  const line = notBoughtLine(waiting);
  const bought = friends.filter((friend) => friend.filter === "BOUGHT").length;
  const phoneRows = showAll ? friends : friends.slice(0, PHONE_FIRST);

  function choose(next: FriendTab) {
    setTab(next);
    setPage(1);
  }

  function remind() {
    if (isReminding) return;
    startRemind(async () => {
      try {
        const result = await remindFriendsAction(waiting.map((friend) => friend.id));
        if (!result.success || !result.data) {
          toast.error(t(result.message ?? "Couldn't send the reminder."));
          return;
        }
        setReminded(true);
        const { sent } = result.data;
        toast.success(sent > 0 ? t(sent === 1 ? "Reminder sent to {count} friend." : "Reminder sent to {count} friends.", { count: count(sent) }) : t("They were already reminded this week."));
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  // The line under the chip, in the reader's words.
  const noteOf = (friend: ReferralFriend) => {
    const note = friendNote(friend);
    return t(note.note, { ...(note.day && { date: friendDay(note.day, today, fmt) }), ...(note.plan && { plan: note.plan }) });
  };

  // The phone row's second line: "Joined 30 Sep · Free plan", "Yearly Pro ·
  // ready on 5 Oct".
  const phoneSub = (friend: ReferralFriend) => {
    const plan = friend.planName ?? (friend.kind === "SIGNUP_BONUS" ? t("Sign-up bonus") : null);
    const at = (value: string | null) => friendDay(dayOf(value), today, fmt);
    switch (friend.status) {
      case "JOINED":
        return friend.currentPlanName ? t("Joined {date} · {plan} plan", { date: at(friend.joinedAt), plan: friend.currentPlanName }) : t("Joined {date}", { date: at(friend.joinedAt) });
      case "PENDING":
        return friend.availableAt ? t("{plan} · ready on {date}", { plan: plan ?? "", date: at(friend.availableAt) }) : (plan ?? "");
      case "AVAILABLE":
        return friend.boughtAt ? t("{plan} · bought {date}", { plan: plan ?? "", date: at(friend.boughtAt) }) : (plan ?? "");
      case "PAID_OUT":
        return friend.paidOutAt ? t("{plan} · withdrawn {date}", { plan: plan ?? "", date: at(friend.paidOutAt) }) : (plan ?? "");
      case "CANCELLED":
        return `${plan ? `${plan} · ` : ""}${noteOf(friend)}`;
    }
  };

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3.5 pb-2.5 md:px-5 md:py-3.5">
      <h2 className="text-[15px] leading-normal font-semibold text-ink md:text-title">
        <span className="md:hidden">{t("Friends · {joined} joined, {bought} bought", { joined: count(friends.length), bought: count(bought) })}</span>
        <span className="hidden md:inline">{t("Friends who joined with your link")}</span>
      </h2>
      {friends.length > 0 && (
        <SegmentedControl
          className="max-md:hidden"
          label="Filter friends"
          size="coarse"
          value={tab}
          onChange={choose}
          options={FRIEND_TABS.map((option) => ({
            value: option.value,
            // One span, so the segment's flex gap doesn't widen the space.
            label: (
              <span>
                {t(option.label)} <span className="font-normal text-ink-faint tabular-nums">{count(counts[option.value])}</span>
              </span>
            ),
          }))}
        />
      )}
    </div>
  );

  const footer = (
    <>
      {list.totalPages > 1 && (
        <ListFooter className="max-md:hidden md:px-5">
          <Pagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={setPage} focusTargetId={LIST_ID} />
        </ListFooter>
      )}
      {friends.length > PHONE_FIRST && (
        <button type="button" onClick={() => setShowAll((all) => !all)} aria-expanded={showAll} className="flex h-11.5 w-full items-center justify-center border-t border-divider text-body font-semibold text-emerald md:hidden">
          {showAll ? t("Show fewer") : t("See all {count} friends", { count: count(friends.length) })}
        </button>
      )}
      {line && canRemind && (
        <div className="hidden items-center gap-2.5 bg-strip px-5 py-3 text-[13px] leading-normal text-ink-soft md:flex">
          <MessageCircle className="size-3.75 shrink-0 text-emerald" aria-hidden="true" />
          <span className="min-w-0 flex-1">{t(line.key, { ...line.values, ...(typeof line.values.count === "number" && { count: count(line.values.count) }) })}</span>
          <Button variant="secondary" size="xs" onClick={remind} disabled={isReminding || reminded} className="h-8 px-3 text-[12.5px]">
            {isReminding && <Loader size={14} label={t("Loading...")} />}
            {reminded ? t("Reminder sent") : t("Send a reminder")}
          </Button>
        </div>
      )}
    </>
  );

  return (
    <ListCard id={LIST_ID} label={t("Friends who joined with your link")} header={header} footer={footer}>
      {friends.length === 0 ? (
        <ListEmpty icon={<UserPlus />} tone="money" title={t("No friends yet")} description={t("No one has joined with your link yet. Share it and they show up here.")} />
      ) : (
        <>
          {/* Phones */}
          <div role="rowgroup" className="md:hidden">
            {phoneRows.map((friend) => {
              const status = FRIEND_STATUS[friend.status];
              const earn = friend.commissionAmount !== null && friend.status !== "JOINED" ? money(friend.commissionAmount) : "—";
              return (
                <div key={friend.id} role="row" className="flex min-h-14.5 items-center gap-2.5 border-t border-divider px-4 py-2">
                  <span role="cell" className="flex min-w-0 flex-1 items-center gap-2.5">
                    <PersonAvatar name={friend.name} size={34} coloured className="text-caption" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-body leading-normal font-semibold text-ink">{friend.name}</span>
                      <span className="truncate text-caption leading-normal text-ink-muted">{phoneSub(friend)}</span>
                    </span>
                  </span>
                  <span role="cell" className="flex shrink-0 flex-col items-end gap-0.75">
                    <span className={cn("text-body leading-normal font-bold tabular-nums", earn === "—" ? "text-ink-faint" : friend.status === "CANCELLED" ? "text-ink-faint line-through" : "text-ink")}>{earn}</span>
                    <StatusChip tone={status.tone} dot={false} className="px-1.75 py-px text-[11px]">
                      {t(status.short)}
                    </StatusChip>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Wider screens */}
          <div role="row" className={cn("hidden items-center gap-x-3.5 border-y border-line bg-table-head px-5 py-2.25 text-caption leading-normal font-medium text-ink-muted md:grid", COLUMNS)}>
            <span role="columnheader">{t("Friend")}</span>
            <span role="columnheader">{t("Plan bought")}</span>
            <span role="columnheader" className="text-right">
              {t("They paid")}
            </span>
            <span role="columnheader" className="text-right">
              {t("You earn")}
            </span>
            <span role="columnheader">{t("Status")}</span>
          </div>
          {list.rows.length === 0 && <ListEmpty title={t("No friends here yet.")} className="py-6 max-md:hidden" rowClassName="max-md:hidden" />}
          {list.rows.map((friend) => {
            const status = FRIEND_STATUS[friend.status];
            const plan = friend.planName ?? (friend.kind === "SIGNUP_BONUS" ? t("Sign-up bonus") : null);
            const cancelled = friend.status === "CANCELLED";
            const earned = friend.commissionAmount !== null && friend.status !== "JOINED";
            return (
              <div key={friend.id} role="row" className={cn("hidden h-control-lg items-center gap-x-3.5 border-b border-divider px-5 text-body tabular-nums md:grid", COLUMNS)}>
                <span role="cell" className="flex min-w-0 items-center gap-2.5">
                  <PersonAvatar name={friend.name} size={32} coloured className="text-[11.5px]" />
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="truncate leading-normal font-medium text-ink">{friend.name}</span>
                    <span className="truncate text-caption leading-normal text-ink-muted">{t("Joined {date}", { date: friendDay(dayOf(friend.joinedAt), today, fmt) })}</span>
                  </span>
                </span>
                <span role="cell" className="flex min-w-0 flex-col gap-px">
                  <span className={cn("truncate leading-normal", plan ? "font-medium text-ink" : "text-ink-faint")}>{plan ?? t("Not yet@@friend")}</span>
                  {friend.boughtAt && <span className="truncate text-caption leading-normal text-ink-muted">{t("Bought {date}", { date: friendDay(dayOf(friend.boughtAt), today, fmt) })}</span>}
                </span>
                <span role="cell" className={cn("text-right", friend.paidAmount ? "text-ink-2" : "text-input")}>
                  {friend.paidAmount ? money(friend.paidAmount) : "—"}
                </span>
                <span role="cell" className={cn("text-right font-bold", !earned ? "text-input" : cancelled ? "text-ink-faint line-through" : "text-ink")}>
                  {earned ? money(friend.commissionAmount as string) : "—"}
                </span>
                <span role="cell" className="flex min-w-0 flex-col items-start gap-0.5">
                  <StatusChip tone={status.tone}>{t(status.label)}</StatusChip>
                  <span className="max-w-full truncate text-[11.5px] leading-normal text-ink-muted">{noteOf(friend)}</span>
                </span>
              </div>
            );
          })}
        </>
      )}
    </ListCard>
  );
}
