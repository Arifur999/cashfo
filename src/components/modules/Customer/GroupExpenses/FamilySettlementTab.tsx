"use client";

import { CircleCheckBig, Lock, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import ProgressBar from "@/components/smartly/ProgressBar";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { formatCurrency } from "@/lib/customer/currency";
import { countLabel, groupMonthOf, groupTabHref, recordDiffers, shiftMonth, shortName } from "@/lib/customer/groupDisplay";
import { settleUpAction, undoSettleUpAction } from "@/lib/customer/groupExpensesActions";
import { accountantsOf, isAccountant, mainAccountantId, type SettleCard, settlementCards, settleProgress, settleSums } from "@/lib/customer/groupFamily";
import { monthName } from "@/lib/customer/insights";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { dayInMonth } from "./ContributionDrawer";
import { FamilyCloseDialog } from "./FamilyCloseDialog";
import { MemberAvatar } from "./GroupBits";
import type { GroupPageData, GroupView } from "./groupTypes";

interface FamilySettlementTabProps {
  data: GroupPageData;
  view: GroupView;
  onMonth: (key: string) => void;
  // A payment between any two members, recorded by hand.
  onRecordPayment: () => void;
  busy: boolean;
}

// A family's month settled (the v7 FamilySettlement board): the month in
// four figures, a card for each member saying what they pay the accountant
// or get back, marked paid in one tap (and undone), then the month closed
// with every balance carried forward. Closed months stay below, by year.
export function FamilySettlementTab({ data, view, onMonth, onRecordPayment, busy }: FamilySettlementTabProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const { currency, settlement, range } = data;
  const [closeOpen, setCloseOpen] = useState(false);
  const [years, setYears] = useState(1);
  const [working, setWorking] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const money = (value: number | string) => formatCurrency(Math.abs(Number(value)), currency, fmt);
  const monthLong = monthName(range.key, fmt, "long");
  const nextShort = monthName(shiftMonth(range.key, 1), fmt, "long");
  const closed = view.closed;
  const holderId = mainAccountantId(data.settings, data.members);
  const holder = holderId ? view.memberById[holderId] : undefined;
  const holderName = holder ? shortName(holder.name) : "";
  const accountants = accountantsOf(data.members);
  const cards = settlementCards(settlement.members, data.contributions, holderId);
  const progress = settleProgress(cards);
  // The accountant counts as settled once everyone else is.
  const openOthers = cards.filter((card) => card.state.kind === "pays" || card.state.kind === "gets").length;
  const openCount = openOthers + (openOthers > 0 && cards.some((card) => card.state.kind === "holder") ? 1 : 0);
  const settledCount = cards.length - openCount;
  const spent = Number(settlement.totalExpense);
  const sums = settleSums(data.contributions);
  const deposits = settlement.members.reduce((sum, row) => sum + Number(row.contributed) - (sums[row.groupMemberId] ?? 0), 0);
  const pocket = settlement.members.reduce((sum, row) => sum + Number(row.pocketPaid), 0);
  const cashRows = settlement.accountantCash ?? [];
  const holderCash = Number(cashRows.find((row) => row.groupMemberId === holderId)?.cash ?? view.cash);
  const othersCash = cashRows.filter((row) => row.groupMemberId !== holderId).reduce((sum, row) => sum + Number(row.cash), 0);
  // The cash the accountants hold (the Cash book), and whether this month's
  // balances add up to it: a month before left open keeps the difference.
  const cashHeld = cashRows.length ? cashRows.reduce((sum, row) => sum + Number(row.cash), 0) : view.cash;
  const checksOut = Math.abs(cashHeld - view.cash) < 0.005;
  const shownCash = accountants.length > 1 ? cashHeld : holderCash;
  const ended = range.to < data.today;
  const drift = data.closedRecord && recordDiffers(data.closedRecord, settlement);

  function pay(card: SettleCard) {
    if (!holder || (card.state.kind !== "pays" && card.state.kind !== "gets")) return;
    const owes = card.state.kind === "pays";
    const memberName = shortName(card.name);
    setWorking(card.memberId);
    startTransition(async () => {
      const result = await attempt(
        () =>
          settleUpAction(data.businessId, {
            fromMemberId: owes ? card.memberId : holder.id,
            toMemberId: owes ? holder.id : card.memberId,
            amount: (Math.round(Math.abs(card.after) * 100) / 100).toFixed(2),
            date: dayInMonth(range, data.today),
            payerNote: owes ? t("Paid to {name}", { name: holderName }) : t("Paid to {name}", { name: memberName }),
            receiverNote: owes ? t("Received from {name}", { name: memberName }) : t("Received from {name}", { name: holderName }),
          }),
        t(OFFLINE_MESSAGE),
        t(STALE_MESSAGE),
      );
      setWorking(null);
      if (!result.success) {
        toast.error(result.message ?? t("Failed to record the payment"));
        return;
      }
      toast.success(t("Payment recorded"));
      router.refresh();
    });
  }

  function undo(card: SettleCard) {
    if (card.state.kind !== "paid" && card.state.kind !== "received") return;
    const id = card.state.pair.settleGroupId;
    setWorking(card.memberId);
    startTransition(async () => {
      const result = await attempt(() => undoSettleUpAction(data.businessId, id), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      setWorking(null);
      if (!result.success) {
        toast.error(result.message ?? t("Failed to undo the payment"));
        return;
      }
      toast.success(t("Payment undone"));
      router.refresh();
    });
  }

  // "Arif gives ৳ 4,550 to Khaled, then Khaled gives ৳ 2,650 to Rakib."
  const plan = (() => {
    if (!holder) return "";
    const ins = cards.filter((card) => card.state.kind === "pays").map((card) => t("{from} gives {amount} to {to}", { from: shortName(card.name), amount: money(card.after), to: holderName }));
    const outs = cards.filter((card) => card.state.kind === "gets").map((card) => t("{from} gives {amount} to {to}", { from: holderName, amount: money(card.after), to: shortName(card.name) }));
    const all = [...ins, ...outs];
    if (all.length === 0) return "";
    return `${all.join(t(", then "))}.`;
  })();
  const holderCard = cards.find((card) => card.state.kind === "holder");
  const note = closed
    ? data.closedRecord?.carriedForward
      ? t("Balances moved to {month}.", { month: nextShort })
      : t("{month} is closed.", { month: monthLong })
    : progress.total > progress.done
      ? `${plan} ${t("Open balances move to {month} if you close early.", { month: nextShort })}`.trim()
      : holderCard && Math.abs(othersCash) < 0.005
        ? t("All settled. {name} keeps {amount}, which is exactly their own balance. You can close the month.", { name: holderName, amount: money(holderCard.before) })
        : t("All settled. You can close the month.");

  // Closed months by year, newest first.
  const byYear = [...data.history]
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
    .reduce<{ year: string; months: typeof data.history }[]>((list, record) => {
      const year = record.periodStart.slice(0, 4);
      const last = list[list.length - 1];
      if (last?.year === year) last.months.push(record);
      else list.push({ year, months: [record] });
      return list;
    }, []);
  const shownYears = byYear.slice(0, years);

  const chip = (card: SettleCard): { text: string; tone: "income" | "expense" | "neutral" | "mint" } => {
    switch (card.state.kind) {
      case "holder":
        return { text: t("Own balance"), tone: "mint" };
      case "pays":
        return { text: holder ? t("Has to pay {name}", { name: holderName }) : t("Has to pay"), tone: "expense" };
      case "gets":
        return { text: holder ? t("Gets back from {name}", { name: holderName }) : t("Gets back"), tone: "income" };
      case "paid":
        return { text: t("Paid up"), tone: "income" };
      case "received":
        return { text: t("Received from {name}", { name: holderName }), tone: "income" };
      default:
        return { text: t("Settled"), tone: "neutral" };
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <NativeSelect size="sm" aria-label={t("Month")} value={range.key} onChange={(event) => onMonth(event.target.value)} className={cn("font-semibold", busy && "opacity-60")}>
          {data.months.map((key) => (
            <option key={key} value={key}>
              {monthName(key, fmt, "long", true)}
            </option>
          ))}
        </NativeSelect>
        <Button variant="secondary" size="sm" onClick={onRecordPayment} disabled={closed}>
          {t("Record a payment")}
        </Button>
      </div>

      {drift && data.closedRecord && (
        <Banner tone="warning" icon={<TriangleAlert />}>
          {t("Changed since {month} was closed: the locked record says {spent} spent, {cash} cash.", { month: monthLong, spent: money(data.closedRecord.totalExpense), cash: money(data.closedRecord.cashInHand) })}
        </Banner>
      )}

      <section aria-label={t("{month} summary", { month: monthLong })} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card padding="none" className="flex flex-col gap-1 px-5 py-4">
          <span className="text-small text-ink-muted">{t("Members")}</span>
          <span className="flex items-baseline gap-2">
            <span className="text-[24px] font-bold text-ink tabular-nums">{formatCount(cards.length, fmt)}</span>
            <span className={cn("text-small font-semibold", openCount > 0 ? "text-expense" : "text-income")}>{openCount > 0 ? t("{count} not settled", { count: formatCount(openCount, fmt) }) : t("✓ All settled")}</span>
          </span>
          <span className="flex flex-wrap gap-3 text-caption text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-emerald" />
              {t("{count} settled", { count: formatCount(settledCount, fmt) })}
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-expense-fill" />
              {t("{count} not settled", { count: formatCount(openCount, fmt) })}
            </span>
          </span>
        </Card>
        <Card padding="none" className="flex flex-col gap-1 px-5 py-4">
          <span className="text-small text-ink-muted">{t("Spent in {month}", { month: monthLong })}</span>
          <span className="text-[24px] font-bold text-ink tabular-nums">{money(spent)}</span>
          <span className="text-caption text-ink-muted">
            {view.sharedEqually && settlement.memberCount > 0
              ? t("Split equally · {amount} for each of {count} members", { amount: money(settlement.perMemberShare), count: formatCount(settlement.memberCount, fmt) })
              : t("Each cost is shared the way its expense says.")}
          </span>
        </Card>
        <Card padding="none" className="flex flex-col gap-1 px-5 py-4">
          <span className="text-small text-ink-muted">{t("Members gave")}</span>
          <span className="text-[24px] font-bold text-ink tabular-nums">{money(deposits + pocket)}</span>
          <span className="text-caption text-ink-muted">{pocket > 0 ? t("{deposits} deposits + {pocket} own pocket", { deposits: money(deposits), pocket: money(pocket) }) : t("{deposits} deposits", { deposits: money(deposits) })}</span>
        </Card>
        <Card padding="none" className="flex flex-col gap-1 px-5 py-4">
          <span className="text-small text-ink-muted">{accountants.length > 1 ? t("Cash left with the accountants") : holder ? t("Cash left with {name}", { name: holderName }) : t("Cash in hand")}</span>
          <span className={cn("text-[24px] font-bold tabular-nums", shownCash < 0 ? "text-warning" : "text-ink")}>
            {shownCash < 0 ? "− " : ""}
            {money(shownCash)}
          </span>
          {checksOut ? (
            <span className="flex items-center gap-1 text-caption font-semibold text-income">
              <CircleCheckBig className="size-3.5" aria-hidden="true" />
              {t("The account checks out")}
            </span>
          ) : (
            <span className="text-caption text-warning">{t("Balances add up to {amount}. Months left open keep the difference until they are closed.", { amount: `${view.cash < 0 ? "− " : ""}${money(view.cash)}` })}</span>
          )}
        </Card>
      </section>

      <section aria-label={t("Each member")} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const member = view.memberById[card.memberId];
          const tag = chip(card);
          const busyCard = isPending && working === card.memberId;
          const amount = card.state.kind === "holder" || card.state.kind === "paid" || card.state.kind === "received" ? card.before : card.after;
          const extraCash = member && isAccountant(member) && card.memberId !== holderId ? Number(cashRows.find((row) => row.groupMemberId === card.memberId)?.cash ?? 0) : 0;
          return (
            <Card key={card.memberId} padding="none" className="flex flex-col gap-3 px-5 py-4" asChild>
              <article>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <MemberAvatar member={member ?? { id: card.memberId, name: card.name, photoUrl: null }} members={data.members} size={40} />
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="font-semibold break-words text-ink">{card.name}</span>
                    <span className="text-caption text-ink-muted">{member && isAccountant(member) ? t("Accountant") : t("Member")}</span>
                  </span>
                  <Chip tone={tag.tone}>{tag.text}</Chip>
                </div>
                <span className={cn("text-[28px] leading-none font-bold tabular-nums", Math.abs(amount) < 0.005 ? "text-ink" : amount > 0 ? "text-income" : "text-expense")}>{money(amount)}</span>
                <div className="flex flex-col gap-1 text-small">
                  <span className="flex justify-between gap-2">
                    <span className="text-ink-muted">{t("Their part of the cost")}</span>
                    <b className="font-semibold text-ink tabular-nums">{money(card.share)}</b>
                  </span>
                  <span className="flex justify-between gap-2">
                    <span className="text-ink-muted">{t("They gave")}</span>
                    <b className="font-semibold text-ink tabular-nums">{money(card.gave)}</b>
                  </span>
                </div>
                {Math.abs(extraCash) >= 0.005 && <span className="rounded-lg bg-info-soft px-3 py-2 text-caption text-info">{extraCash > 0 ? t("Also holds {amount} of the group cash (see Cash book).", { amount: money(extraCash) }) : t("Paid {amount} extra from their own pocket (see Cash book).", { amount: money(extraCash) })}</span>}
                {card.state.kind === "holder" ? (
                  <span className="rounded-lg bg-strip px-3 py-2 text-caption text-ink-muted">{t("Holds the group cash · settles with everyone")}</span>
                ) : (card.state.kind === "pays" || card.state.kind === "gets") && !closed && holder ? (
                  <Button variant={card.state.kind === "pays" ? "primary" : "secondary"} size="sm" onClick={() => pay(card)} disabled={isPending}>
                    {busyCard && <Loader />}
                    {card.state.kind === "pays" ? t("Mark {amount} as paid to {name}", { amount: money(card.after), name: holderName }) : t("Mark {amount} as received", { amount: money(card.after) })}
                  </Button>
                ) : card.state.kind === "paid" || card.state.kind === "received" ? (
                  <span className="flex items-center justify-between gap-2 rounded-lg bg-income-soft px-3 py-1.5 text-small font-semibold text-income">
                    <span>{card.state.kind === "paid" ? t("✓ Paid to {name}", { name: holderName }) : t("✓ Received from {name}", { name: holderName })}</span>
                    {!closed && (
                      <Button variant="ghost" size="xs" onClick={() => undo(card)} disabled={isPending}>
                        {busyCard && <Loader />}
                        {t("Undo")}
                      </Button>
                    )}
                  </span>
                ) : null}
              </article>
            </Card>
          );
        })}
        {cards.length === 0 && <p className="text-small text-ink-muted">{t("Add members to see their balances.")}</p>}
      </section>
      {!holder && cards.length > 0 && <p className="text-small text-ink-muted">{t("Make someone an accountant in Members to settle through them.")}</p>}

      <Card padding="none" aria-label={t("Close the month")} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center" asChild>
        <section>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="font-semibold text-ink">{closed ? t("{month} is closed", { month: monthLong }) : t("{done} of {total} payments done", { done: formatCount(progress.done, fmt), total: formatCount(progress.total, fmt) })}</span>
            {!closed && <ProgressBar value={progress.total > 0 ? (progress.done / progress.total) * 100 : 100} label={t("Payments done")} size="sm" />}
            <span className="text-small text-ink-muted">{note}</span>
          </div>
          {closed ? (
            <span className="flex items-center gap-1.5 text-small font-semibold text-ink-2">
              <Lock className="size-4" aria-hidden="true" />
              {t("{month} is closed", { month: monthLong })}
            </span>
          ) : (
            <Button onClick={() => setCloseOpen(true)} disabled={cards.length === 0} variant={ended ? "primary" : "secondary"}>
              {t("Close {month}", { month: monthLong })}
            </Button>
          )}
        </section>
      </Card>

      <section aria-labelledby="hm-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="flex items-baseline gap-2">
            <h2 id="hm-title" className="text-title font-semibold text-ink">
              {t("Closed months")}
            </h2>
            <span className="text-small text-ink-muted">{t("Locked, they never change")}</span>
          </span>
          {byYear.length > years && (
            <Button variant="ghost" size="sm" onClick={() => setYears(years + 1)}>
              {t("See more · {year}", { year: toLocaleDigits(byYear[years].year, fmt) })}
            </Button>
          )}
        </div>
        {byYear.length === 0 && <p className="text-small text-ink-muted">{t("No month is closed yet.")}</p>}
        {shownYears.map((group) => {
          const total = group.months.reduce((sum, record) => sum + Number(record.totalExpense), 0);
          return (
            <div key={group.year} className="flex flex-col gap-2">
              <span className="text-small font-semibold text-ink-2">{t("{year} · {total} spent in {months}", { year: toLocaleDigits(group.year, fmt), total: money(total), months: countLabel(t, fmt, group.months.length, "{count} month", "{count} months") })}</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {group.months.map((record) => {
                  const key = groupMonthOf(record.periodStart.slice(0, 10), data.startDay);
                  const on = key === range.key;
                  return (
                    <Link key={record.id} href={groupTabHref(data.businessId, "settlement", { month: key })} aria-current={on ? "page" : undefined} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors", on ? "border-emerald bg-emerald-soft" : "border-line bg-surface hover:border-input")}>
                      <Lock className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-small font-semibold text-ink">{monthName(key, fmt, "short", true)}</span>
                        <span className="text-caption text-ink-muted tabular-nums">{money(record.totalExpense)}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <FamilyCloseDialog open={closeOpen} onClose={() => setCloseOpen(false)} businessId={data.businessId} currency={currency} range={range} members={data.members} settlement={settlement} cards={cards} holderId={holderId} budgets={data.budgets} />
    </div>
  );
}
