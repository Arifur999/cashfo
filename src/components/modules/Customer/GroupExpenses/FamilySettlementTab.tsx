"use client";

import { ArrowRight, CircleHelp, Info, Lock, Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { ListCard, ListCell, ListEmpty, ListHead, ListHeadCell, ListRow, ListTotalRow } from "@/components/smartly/list";
import ProgressBar from "@/components/smartly/ProgressBar";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { formatCurrency } from "@/lib/customer/currency";
import { countLabel, groupMonthOf, groupTabHref, recordDiffers, shiftMonth, shortName } from "@/lib/customer/groupDisplay";
import { settleUpAction, undoSettleUpAction } from "@/lib/customer/groupExpensesActions";
import { canManage, canRecord, canTouchEntry, mayEnterFor } from "@/lib/customer/groupAccess";
import { isAccountant, mainAccountantId, type SettleCard, type SettlePair, settlementCards, settleProgress, settleSums } from "@/lib/customer/groupFamily";
import { monthName } from "@/lib/customer/insights";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { dayInMonth } from "./ContributionDrawer";
import { FamilyCloseDialog } from "./FamilyCloseDialog";
import { ReopenMonthButton } from "./ReopenMonthButton";
import { Figure, MemberAvatar, SETTLE_UP_ID } from "./GroupBits";
import type { GroupPageData, GroupView } from "./groupTypes";

// Member, paid this month, share of spending, balance, status.
const BALANCE_COLUMNS = "md:grid-cols-[minmax(0,1fr)_164px_150px_130px_104px]";

interface FamilySettlementTabProps {
  data: GroupPageData;
  view: GroupView;
  // A payment between any two members, recorded by hand; absent for
  // someone who may not record payments.
  onRecordPayment?: () => void;
}

// A family's month settled (the v7 FamilySettlement board): the month in
// four figures, a card for each member saying what they pay the accountant
// or get back, marked paid in one tap (and undone), then the month closed
// with every balance carried forward. Closed months stay below, by year.
// The month is the header's (GroupHeader's month picker).
export function FamilySettlementTab({ data, view, onRecordPayment }: FamilySettlementTabProps) {
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
  const cards = settlementCards(settlement.members, data.contributions, holderId);
  const progress = settleProgress(cards);
  const spent = Number(settlement.totalExpense);
  const sums = settleSums(data.contributions);
  const deposits = settlement.members.reduce((sum, row) => sum + Number(row.contributed) - (sums[row.groupMemberId] ?? 0), 0);
  const pocket = settlement.members.reduce((sum, row) => sum + Number(row.pocketPaid), 0);
  const cashRows = settlement.accountantCash ?? [];
  const othersCash = cashRows.filter((row) => row.groupMemberId !== holderId).reduce((sum, row) => sum + Number(row.cash), 0);
  const ended = range.to < data.today;
  const drift = data.closedRecord && recordDiffers(data.closedRecord, settlement);
  // Who may do what here: the Admin all of it; an Editor records the
  // payments they make and undoes their own; closing is the Admin's.
  const paused = Boolean(data.settings.pausedAt);
  const manage = canManage(data.access);
  const mayPay = (fromId: string | undefined) => !!fromId && canRecord(data.access, paused) && mayEnterFor(data.access, fromId);
  const mayUndo = (pair: SettlePair) => canTouchEntry(data.access, pair, paused, closed);

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

  // The strip: settled so far (the settle-up payments made) and what is still open.
  const settledRows = data.contributions.filter((row) => row.kind === "SETTLE" && Number(row.amount) > 0);
  const settledSoFar = settledRows.reduce((sum, row) => sum + Number(row.amount), 0);
  const openCards = cards.filter((card) => card.state.kind === "pays" || card.state.kind === "gets");
  const stillToSettle = openCards.reduce((sum, card) => sum + Math.abs(card.after), 0);
  const totals = cards.reduce((sum, card) => ({ gave: sum.gave + card.gave, share: sum.share + card.share, balance: sum.balance + card.after }), { gave: 0, share: 0, balance: 0 });
  const signed = (value: number) => (Math.abs(value) < 0.005 ? formatCurrency(0, currency, fmt) : `${value < 0 ? "− " : "+ "}${money(value)}`);
  const expenseCount = data.expenses.length;

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[19px] font-semibold text-ink">{t("Settlement · {month}", { month: monthName(range.key, fmt, "long", true) })}</h2>
          <p className="text-small text-ink-muted">{t("Who owes whom for the month, and the payments that even it out.")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {onRecordPayment && (
            <Button variant="secondary" onClick={onRecordPayment} disabled={closed}>
              <Plus aria-hidden="true" />
              {t("Record payment")}
            </Button>
          )}
        </div>
      </div>

      {!closed && !ended && (
        <Banner tone="info" icon={<Info />}>
          {t("{month} is still running. Balances change as entries come in; the month can be closed after it ends.", { month: monthName(range.key, fmt, "long", true) })}
        </Banner>
      )}
      {drift && data.closedRecord && (
        <Banner tone="warning" icon={<TriangleAlert />}>
          {t("Changed since {month} was closed: the locked record says {spent} spent, {cash} cash.", { month: monthLong, spent: money(data.closedRecord.totalExpense), cash: money(data.closedRecord.cashInHand) })}
        </Banner>
      )}

      <Card padding="none" aria-label={t("{month} summary", { month: monthLong })} className="grid grid-cols-2 gap-x-5 gap-y-4 px-5 py-4 lg:grid-cols-4 lg:gap-y-0 max-lg:[&>*:nth-child(2)]:border-r-0">
        <Figure label={t("Spent in {month}", { month: monthLong })} value={money(spent)} tone="text-expense" sub={countLabel(t, fmt, expenseCount, "{count} expense", "{count} expenses")} />
        <Figure label={t("Members gave")} value={money(deposits + pocket)} tone="text-income" sub={t("{fund} fund + {pocket} pocket", { fund: money(deposits), pocket: money(pocket) })} />
        <Figure label={t("Settled so far")} value={money(settledSoFar)} sub={countLabel(t, fmt, settledRows.length, "{count} payment recorded", "{count} payments recorded")} />
        <Figure
          label={t("Still to settle")}
          value={money(stillToSettle)}
          tone={stillToSettle > 0.004 ? "text-expense" : "text-income"}
          sub={openCards.length > 0 ? countLabel(t, fmt, openCards.length, "{count} payment would clear it", "{count} payments would clear it") : t("✓ Everyone is settled")}
          divided={false}
        />
      </Card>

      <ListCard
        label={t("Each member’s balance")}
        className="min-w-0"
        header={
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3.5 md:px-5">
            <h3 className="text-[16px] font-semibold text-ink">{t("Each member’s balance")}</h3>
            <span className="flex flex-wrap gap-x-3.5 gap-y-1 text-caption text-ink-muted">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-full bg-emerald" />
                {t("above 0: gets money back")}
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-full bg-expense-fill" />
                {t("below 0: owes")}
              </span>
            </span>
          </div>
        }
      >
        <ListHead columns={BALANCE_COLUMNS} className="h-8.5 gap-x-3.5 border-t md:px-5">
          <ListHeadCell>{t("Member")}</ListHeadCell>
          <ListHeadCell align="end">{t("Paid this month")}</ListHeadCell>
          <ListHeadCell align="end">{t("Share of spending")}</ListHeadCell>
          <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
          <ListHeadCell align="end">{t("Status")}</ListHeadCell>
        </ListHead>
        {cards.length === 0 && <ListEmpty title={t("Add members to see their balances.")} />}
        {cards.map((card) => {
          const member = view.memberById[card.memberId];
          const units = Number(member?.shareUnits ?? 0);
          const even = Math.abs(card.after) < 0.005;
          return (
            <ListRow key={card.memberId} columns={BALANCE_COLUMNS} density="relaxed" className="gap-x-3.5 text-body tabular-nums md:min-h-15.5 md:px-5 md:py-2">
              <ListCell className="flex items-center gap-2.5">
                <MemberAvatar member={member ?? { id: card.memberId, name: card.name, photoUrl: null }} members={data.members} size={34} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-semibold text-ink">{card.name}</span>
                  <span className="truncate text-caption text-ink-muted">{[member && isAccountant(member) ? t("Accountant") : null, t(units === 1 ? "{count} share" : "{count} shares", { count: formatCount(units, fmt) })].filter(Boolean).join(" · ")}</span>
                </span>
              </ListCell>
              <ListCell align="end" className="hidden md:block">
                <span className="flex flex-col items-end gap-px">
                  <span className="font-semibold text-ink">{money(card.gave)}</span>
                  <span className="text-[11.5px] text-ink-muted">{card.gave > 0 ? t("gave {amount}", { amount: money(card.gave) }) : t("nothing yet")}</span>
                </span>
              </ListCell>
              <ListCell align="end" className="hidden md:block">
                <span className="flex flex-col items-end gap-px">
                  <span className="text-ink">{money(card.share)}</span>
                  <span className="text-[11.5px] text-ink-muted">{t("{percent}% of spending", { percent: formatCount(spent > 0 ? Math.round((card.share / spent) * 100) : 0, fmt) })}</span>
                </span>
              </ListCell>
              <ListCell align="end" className={cn("font-bold", even ? "text-ink" : card.after > 0 ? "text-income" : "text-expense")}>
                {signed(card.after)}
              </ListCell>
              <ListCell align="end" className="hidden md:block">
                <Chip tone={even ? "neutral" : card.after > 0 ? "income" : "expense"} size="sm">
                  {even ? t("Settled") : card.after > 0 ? t("Gets back") : t("Owes@@group")}
                </Chip>
              </ListCell>
            </ListRow>
          );
        })}
        {cards.length > 0 && (
          <ListTotalRow columns={BALANCE_COLUMNS} className="min-h-11 gap-x-3.5 tabular-nums md:px-5">
            <span role="cell">{t("Total")}</span>
            <span role="cell" className="hidden text-right md:block">
              {money(totals.gave)}
            </span>
            <span role="cell" className="hidden text-right md:block">
              {money(totals.share)}
            </span>
            <span role="cell" className="text-right">
              {signed(totals.balance)}
            </span>
            <span role="cell" className="hidden md:block" />
          </ListTotalRow>
        )}
      </ListCard>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card padding="none" className="flex min-w-0 flex-col gap-3 px-5 py-4" asChild>
          <section id={SETTLE_UP_ID} tabIndex={-1} aria-labelledby="fs-who" className="scroll-mt-4">
            <div className="flex flex-col gap-0.5">
              <h3 id="fs-who" className="text-[16px] font-semibold text-ink">
                {t("Who pays whom")}
              </h3>
              <p className="text-small text-ink-muted">{holder ? t("Everyone settles with {name}, who keeps the group cash.", { name: holderName }) : t("Make someone an accountant in Members to settle through them.")}</p>
            </div>
            {holder &&
              cards
                .filter((card) => card.state.kind === "pays" || card.state.kind === "gets" || card.state.kind === "paid" || card.state.kind === "received")
                .map((card) => {
                  const pays = card.state.kind === "pays" || card.state.kind === "paid";
                  const done = card.state.kind === "paid" || card.state.kind === "received";
                  const member = view.memberById[card.memberId];
                  const from = pays ? member : holder;
                  const to = pays ? holder : member;
                  const fromName = pays ? shortName(card.name) : holderName;
                  const toName = pays ? holderName : shortName(card.name);
                  const amount = done ? card.before : card.after;
                  const busyCard = isPending && working === card.memberId;
                  return (
                    <div key={card.memberId} className={cn("flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3", done ? "border-success-line bg-income-soft/40" : "border-line")}>
                      <span className="flex items-center gap-1.5" aria-hidden="true">
                        <MemberAvatar member={from ?? { id: card.memberId, name: fromName, photoUrl: null }} members={data.members} size={32} />
                        <ArrowRight className="size-4 text-ink-muted" />
                        <MemberAvatar member={to ?? { id: card.memberId, name: toName, photoUrl: null }} members={data.members} size={32} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-body font-semibold text-ink">{t("{from} pays {to} {amount}", { from: fromName, to: toName, amount: money(amount) })}</span>
                        <span className="text-caption text-ink-muted">{done ? t("✓ Paid · recorded for {month}", { month: monthName(range.key, fmt, "long", true) }) : t("Clears {name}’s balance for {month}", { name: shortName(card.name), month: monthName(range.key, fmt, "long", true) })}</span>
                      </span>
                      {!closed &&
                        (done ? (
                          (card.state.kind === "paid" || card.state.kind === "received") &&
                          mayUndo(card.state.pair) && (
                          <Button variant="ghost" size="sm" onClick={() => undo(card)} disabled={isPending}>
                            {busyCard && <Loader />}
                            {t("Undo")}
                          </Button>
                          )
                        ) : (
                          mayPay(from?.id) && (
                          <Button size="sm" onClick={() => pay(card)} disabled={isPending}>
                            {busyCard && <Loader />}
                            {t("Record payment")}
                          </Button>
                          )
                        ))}
                    </div>
                  );
                })}
            {holder && openCards.length === 0 && cards.length > 0 && <p className="rounded-xl bg-strip px-3.5 py-3 text-small text-ink-2">{t("Everyone is settled. Nothing to carry.")}</p>}
          </section>
        </Card>

        <Card padding="none" className="flex min-w-0 flex-col gap-3 border-success-line bg-income-soft/30 px-5 py-4" asChild>
          <section aria-labelledby="fs-how">
            <h3 id="fs-how" className="flex items-center gap-2 text-[16px] font-semibold text-ink">
              <CircleHelp className="size-4.5 text-emerald" aria-hidden="true" />
              {t("How the balance is worked out")}
            </h3>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 text-small">
              <dt className="font-semibold text-ink">{t("Paid")}</dt>
              <dd className="text-ink-2">{t("Money given to the group, plus spending paid from their own pocket, plus settlement paid to others, minus settlement received.")}</dd>
              <dt className="font-semibold text-ink">{t("Share")}</dt>
              <dd className="text-ink-2">{t("Their part of each expense, shared the way its category says.")}</dd>
              <dt className="font-semibold text-ink">{t("Balance")}</dt>
              <dd className="text-ink-2">{t("Paid − share. Above 0: the group owes them. Below 0: they owe.")}</dd>
              <dt className="font-semibold text-ink">{t("Carry on")}</dt>
              <dd className="text-ink-2">{t("Closing a month locks it, and any balance still open moves into the next month.")}</dd>
            </dl>
          </section>
        </Card>
      </div>

      <Card padding="none" aria-label={t("Close the month")} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center" asChild>
        <section>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="font-semibold text-ink">{closed ? t("{month} is closed", { month: monthLong }) : t("{done} of {total} payments done", { done: formatCount(progress.done, fmt), total: formatCount(progress.total, fmt) })}</span>
            {!closed && <ProgressBar value={progress.total > 0 ? (progress.done / progress.total) * 100 : 100} label={t("Payments done")} size="sm" />}
            <span className="text-small text-ink-muted">{note}</span>
          </div>
          {closed ? (
            <span className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-small font-semibold text-ink-2">
                <Lock className="size-4" aria-hidden="true" />
                {t("{month} is closed", { month: monthLong })}
              </span>
              {manage && <ReopenMonthButton data={data} />}
            </span>
          ) : (
            manage && (
              <Button onClick={() => setCloseOpen(true)} disabled={cards.length === 0} variant={ended ? "primary" : "secondary"}>
                {t("Close {month}", { month: monthLong })}
              </Button>
            )
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
