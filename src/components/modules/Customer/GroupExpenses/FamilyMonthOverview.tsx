"use client";

import { ArrowDown, ArrowLeftRight, ChevronRight, CircleCheckBig, Clock, Lock, Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import { ListCard, ListCell, ListFooter, ListHead, ListHeadCell, ListRow, ListRowButton, ListTotalRow } from "@/components/smartly/list";
import type { GroupContribution, GroupExpense, GroupMember } from "@/lib/customer/api";
import { canManage } from "@/lib/customer/groupAccess";
import { formatCurrency } from "@/lib/customer/currency";
import { groupMonthOf, groupTabHref, paidIn, shortName, type Transfer, unclosedPreviousMonth } from "@/lib/customer/groupDisplay";
import { carriedBy, categoryRows, givesMoney, mainAccountantId, totalGiven, type SettleCard, settlementCards } from "@/lib/customer/groupFamily";
import { monthName } from "@/lib/customer/insights";
import { formatDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BalanceCell, CategoryTile, categoryBarClass, MemberAvatar } from "./GroupBits";
import { ROLE_CHIP, roleKey } from "./GroupSetup";
import type { GroupPageData, GroupView } from "./groupTypes";

// The top of a family's dashboard (the v16 FamilyDashboard board): the
// month's state with its quick actions, four tiles (spent against the
// budget, contributions, the cash each holder keeps, my balance), the
// members' balances for the month, where the money went and the newest
// entries. Everything is the month on show (data.range).

const TILE = "flex min-w-0 flex-col gap-1.5 rounded-[18px] px-4.5 py-4";
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_60px_164px_124px_120px_176px]";

interface FamilyMonthOverviewProps {
  data: GroupPageData;
  view: GroupView;
  // The signed-in customer's own member row (the group's owner), if any.
  me: GroupMember | undefined;
  canAdd: boolean;
  onAddExpense: () => void;
  onAddContribution: () => void;
  onRecordPayment: (preset: Transfer | null) => void;
  // Whether the one looking may record a payment made by this member (the
  // Admin any; an Editor only one they made).
  canPay: (fromId: string) => boolean;
  onStatement: (member: GroupMember) => void;
}

export function FamilyMonthOverview({ data, view, me, canAdd, canPay, onAddExpense, onAddContribution, onRecordPayment, onStatement }: FamilyMonthOverviewProps) {
  const { t, fmt } = useLocale();
  const { currency, settlement } = data;
  // A figure below 0 (a member who received more than they paid in) reads "− Tk 500.25", as the boards write it.
  const money = (value: number | string) => (Number(value) < -0.004 ? `− ${formatCurrency(-Number(value), currency, fmt)}` : formatCurrency(value, currency, fmt));
  const signed = (value: number) => (Math.abs(value) < 0.005 ? money(0) : `${value < 0 ? "− " : "+ "}${money(Math.abs(value))}`);
  const month = monthName(data.range.key, fmt, "long", true);
  const current = data.range.key === groupMonthOf(data.today, data.startDay);
  const closed = view.closed;
  const isAdmin = canManage(data.access);
  const actions = canAdd && !closed;

  // Tile 1: spent against the month's budget.
  const spent = Number(settlement.totalExpense);
  const budget = view.budget;
  const barTone = budget?.tone === "over" ? "bg-expense-fill" : budget?.tone === "warning" ? "bg-warning-fill" : "bg-emerald";
  const leftTone = budget?.tone === "over" ? "text-expense" : budget?.tone === "warning" ? "text-warning" : "text-income";

  // Tile 2: contributions (a settle-up pair is a payment, not a contribution).
  // Money handed in: deposits less returns; no settle-ups, no carried balance.
  const deposits = data.contributions.filter((row) => givesMoney(row) && Number(row.amount) > 0);
  const given = totalGiven(data.contributions);
  const givers = new Set(deposits.map((row) => row.groupMemberId)).size;
  const pocket = settlement.members.reduce((sum, row) => sum + Number(row.pocketPaid), 0);

  // Tile 3: the cash each holder keeps.
  const holders = [...(settlement.accountantCash ?? [])].sort((a, b) => Number(b.cash) - Number(a.cash));

  // Everyone settles with the cash holder, as on Settlement: each open
  // card is a payment to or from them.
  const holderId = mainAccountantId(data.settings, data.members);
  const cards = settlementCards(settlement.members, data.contributions, holderId);
  const transferOf = (card: SettleCard | undefined): Transfer | null =>
    card && holderId && (card.state.kind === "pays" || card.state.kind === "gets") ? { fromId: card.state.kind === "pays" ? card.memberId : holderId, toId: card.state.kind === "pays" ? holderId : card.memberId, amount: Math.round(Math.abs(card.after) * 100) / 100 } : null;
  const firstOpen = transferOf(cards.find((card) => card.state.kind === "pays" || card.state.kind === "gets"));

  // Tile 4: my balance, and the payment that settles it.
  const mine = me ? (view.balances[me.id] ?? 0) : 0;
  const myCard = me ? cards.find((card) => card.memberId === me.id) : undefined;
  // The cash holder has no card of their own: as on the board, they see the
  // first member who pays them (when they will get money) or whom they pay.
  const isHolder = !!me && me.id === holderId;
  const myTransfer = isHolder
    ? transferOf(cards.find((card) => (mine > 0.5 && card.state.kind === "pays") || (mine < -0.5 && card.state.kind === "gets")))
    : transferOf(myCard);
  const firstName = (id: string | undefined) => shortName(id ? view.memberById[id]?.name : undefined);

  // The members' balances: everyone active, and anyone who left but still has money in the month.
  // A balance carried in when last month was closed is its own column, not money paid in.
  const carried = carriedBy(data.contributions);
  const carriedOf = (id: string) => carried[id] ?? 0;
  const rows = settlement.members.map((row) => ({ row, member: view.memberById[row.groupMemberId], carry: carriedOf(row.groupMemberId) }));
  const totals = rows.reduce((sum, { row, member, carry }) => ({ shares: sum.shares + Number(member?.shareUnits ?? 0), paid: sum.paid + paidIn(row) - carry, share: sum.share + Number(row.share), carry: sum.carry + carry, balance: sum.balance + Number(row.balance) }), { shares: 0, paid: 0, share: 0, carry: 0, balance: 0 });
  const cashSum = holders.length > 0 ? holders.reduce((sum, row) => sum + Number(row.cash), 0) : view.cash;
  const booksMatch = Math.abs(totals.balance - cashSum) < 0.005;

  // The month before this one, finished but never closed (it is asked for
  // first); money dated into it keeps it open even if every member came later.
  const previous = current && isAdmin && !data.settings.pausedAt ? unclosedPreviousMonth(data.history, data.members, data.range, !booksMatch) : null;
  const unclosed = previous && previous.to < data.today ? previous : null;

  // Where the money went: the month's spending by category, biggest first.
  const cats = categoryRows(data.expenses, data.categories).filter((row) => row.amount > 0);

  // The newest entries: expenses, contributions and payments (a settle-up pair as one row).
  const entries = recentEntries(data.expenses, data.contributions);

  const roleChip = (member: GroupMember | undefined) => {
    if (!member) return null;
    const key = roleKey(member);
    return key === "MEMBER" ? null : <span className={cn("shrink-0 rounded-full px-2 py-px text-[11px] font-semibold", ROLE_CHIP[key].cls)}>{t(ROLE_CHIP[key].label)}</span>;
  };

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-col gap-3 md:min-h-11 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5 text-[13.5px] text-ink-2">
          {closed ? (
            <Chip tone="neutral" className="h-6.5 gap-1.5 px-2.5 text-[12.5px] font-semibold">
              <Lock className="size-3.25" strokeWidth={2.25} aria-hidden="true" />
              {t("Closed")}
            </Chip>
          ) : current ? (
            <Chip tone="mint" className="h-6.5 gap-1.5 px-2.5 text-[12.5px] font-semibold">
              <span aria-hidden="true" className="size-1.5 rounded-full border-[1.5px] border-current" />
              {t("Current month")}
            </Chip>
          ) : (
            <Chip tone="warning" className="h-6.5 gap-1.5 px-2.5 text-[12.5px] font-semibold">
              <Clock className="size-3.25" strokeWidth={2.25} aria-hidden="true" />
              {t("Open@@month")}
            </Chip>
          )}
          <span className="min-w-0 truncate">
            {closed
              ? t("Closed on {date} · locked", { date: data.closedRecord ? formatDay(data.closedRecord.closedAt.slice(0, 10), "d MMM", fmt) : "" })
              : current
                ? t("Open · entries go into {month}", { month })
                : `${t("Not closed yet")}${isAdmin ? t(" · close it from Settlement when everyone has paid") : ""}`}
          </span>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:flex-nowrap">
            {unclosed && (
              <Button asChild variant="secondary" className="border-warn2-line bg-warn2-wash text-[13.5px] text-warn2-ink hover:bg-warn2-wash/70">
                <Link href={groupTabHref(data.businessId, "settlement", { month: unclosed.key })}>
                  <Lock aria-hidden="true" />
                  {t("Close {month}", { month: formatDay(`${unclosed.key}-01`, "MMMM", fmt) })}
                </Link>
              </Button>
            )}
            {(isAdmin || (firstOpen && canPay(firstOpen.fromId))) && (
              <Button variant="secondary" className="text-[13.5px]" onClick={() => onRecordPayment(firstOpen)}>
                <ArrowLeftRight className="text-ink-2" aria-hidden="true" />
                {t("Record payment")}
              </Button>
            )}
            <Button variant="secondary" className="text-[13.5px]" onClick={onAddContribution}>
              <Plus className="text-income" strokeWidth={2.25} aria-hidden="true" />
              {t("Add contribution")}
            </Button>
            <Button className="text-[13.5px]" onClick={onAddExpense}>
              <Plus strokeWidth={2.5} aria-hidden="true" />
              {t("Add expense")}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card padding="none" className={TILE}>
          <span className="text-[13px] text-ink-muted">{current ? t("Spent this month") : t("Spent in {month}", { month })}</span>
          <span className="text-[24px] leading-tight font-bold tracking-[-0.01em] text-ink tabular-nums">{money(spent)}</span>
          {budget ? (
            <>
              <span role="img" aria-label={t("Budget used {percent}%", { percent: formatCount(budget.percent, fmt) })} className="mt-0.5 h-2 overflow-hidden rounded-full bg-surface-sunken">
                <span className={cn("block h-full rounded-full", barTone)} style={{ width: `${Math.min(100, budget.percent)}%` }} />
              </span>
              <span className="flex justify-between gap-2 text-caption text-ink-muted tabular-nums">
                <span className="whitespace-nowrap">{t("{percent}% of {amount}", { percent: formatCount(budget.percent, fmt), amount: money(budget.budget) })}</span>
                <span className={cn("font-semibold whitespace-nowrap", leftTone)}>{budget.left >= 0 ? t("{amount} left", { amount: money(budget.left) }) : t("{amount} over", { amount: money(-budget.left) })}</span>
              </span>
            </>
          ) : (
            <span className="text-caption text-ink-muted">
              {t("No budget set for {month}.", { month })}{" "}
              {isAdmin && (
                <Link href={groupTabHref(data.businessId, "budget")} className="font-semibold text-emerald hover:text-emerald-hover">
                  {t("Set budget")}
                </Link>
              )}
            </span>
          )}
        </Card>

        <Card padding="none" className={TILE}>
          <span className="text-[13px] text-ink-muted">{current ? t("Contributions this month") : t("Contributions in {month}", { month })}</span>
          <span className="text-[24px] leading-tight font-bold tracking-[-0.01em] text-income tabular-nums">{money(given)}</span>
          <span className="text-caption leading-[1.45] text-ink-muted">{givers > 0 ? t(givers === 1 ? "From {count} member" : "From {count} members", { count: formatCount(givers, fmt) }) : t("Nobody has given yet")}</span>
          {pocket > 0 && <span className="text-caption leading-[1.45] text-ink-muted">{t("+ {amount} paid from own pockets", { amount: money(pocket) })}</span>}
        </Card>

        <Card padding="none" className={TILE}>
          <span className="text-[13px] text-ink-muted">{current ? t("Cash in group now") : t("Cash at end of {month}", { month })}</span>
          <span className={cn("text-[24px] leading-tight font-bold tracking-[-0.01em] tabular-nums", cashSum < -0.004 ? "text-expense" : "text-ink")}>{cashSum < -0.004 ? `− ${money(-cashSum)}` : money(cashSum)}</span>
          {holders.length > 0 && (
            <span className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-caption leading-[1.45] text-ink-muted">
              {holders.map((row) => (
                <span key={row.groupMemberId} className="whitespace-nowrap">
                  {t("with {name}", { name: shortName(row.name) })} <b className={cn("font-semibold tabular-nums", Number(row.cash) < 0 ? "text-expense" : "text-ink-2")}>{Number(row.cash) < 0 ? `− ${money(-Number(row.cash))}` : money(row.cash)}</b>
                </span>
              ))}
            </span>
          )}
        </Card>

        <Card padding="none" className={cn(TILE, mine < -0.5 ? "border-expense-line bg-expense-soft/40" : mine > 0.5 ? "border-success-line bg-income-soft/40" : "")}>
          <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink-muted">
            {t("My balance")}
            {me && <span className="truncate">· {shortName(me.name)}</span>}
          </span>
          {!me ? (
            <span className="text-caption leading-[1.45] text-ink-muted">{t("You are not a member of this group's costs.")}</span>
          ) : (
            <>
              <span className="flex flex-wrap items-baseline gap-2">
                <span className={cn("text-[15px] font-semibold", mine < -0.5 ? "text-expense" : mine > 0.5 ? "text-income" : "text-ink-2")}>{mine < -0.5 ? t("You owe") : mine > 0.5 ? t("You will get") : t("All square")}</span>
                <span className={cn("text-[24px] leading-tight font-bold tracking-[-0.01em] tabular-nums", mine < -0.5 ? "text-expense" : mine > 0.5 ? "text-income" : "text-ink-2")}>{money(Math.abs(mine) < 0.5 ? 0 : Math.abs(mine))}</span>
              </span>
              <span className="text-caption leading-[1.45] text-ink-muted">
                {myTransfer && myTransfer.fromId === me.id
                    ? t("Pay {name} {amount} to settle", { name: firstName(myTransfer.toId), amount: money(myTransfer.amount) })
                    : myTransfer
                      ? t("{name} pays you {amount}", { name: firstName(myTransfer.fromId), amount: money(myTransfer.amount) })
                      : mine > 0.5
                        ? t("The group owes you this")
                        : mine < -0.5
                          ? t("Settled for this month through the cash holder.")
                          : t("You don’t owe anything and nobody owes you.")}
              </span>
              {actions && myTransfer && canPay(myTransfer.fromId) && (
                <Button size="sm" variant={myTransfer.fromId === me.id ? "danger" : "primary"} className="mt-0.5 self-start text-[13px]" onClick={() => onRecordPayment(myTransfer)}>
                  {myTransfer.fromId === me.id ? t("Pay now") : t("Record payment")}
                </Button>
              )}
            </>
          )}
        </Card>
      </div>

      {view.empty ? (
        <Card className="flex flex-col items-center gap-2.5 px-6 py-10 text-center">
          <IconTile tone="money" size={56} className="rounded-2xl">
            <Plus />
          </IconTile>
          <h2 className="text-[18px] font-semibold text-ink">{t("Nothing recorded for {month} yet", { month })}</h2>
          <p className="max-w-115 text-[13.5px] leading-[1.55] text-ink-2">{actions ? t("Add the first contribution or expense and this page fills in by itself: totals, each member’s balance and where the money went.") : t("When money is recorded for this month, it shows up here.")}</p>
          {actions && (
            <div className="mt-2 flex gap-2.5">
              <Button variant="secondary" size="lg" onClick={onAddContribution}>
                {t("Add contribution")}
              </Button>
              <Button size="lg" onClick={onAddExpense}>
                {t("Add expense")}
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <>
          <ListCard
            label={t("Members this month")}
            className="min-w-0"
            header={
              <div className="flex flex-col gap-0.5 px-4 pt-4 pb-3 md:px-5">
                <h2 className="text-[16px] font-semibold text-ink">{t("Members this month")}</h2>
                <p className="text-caption text-ink-muted">{t("Balance = carried from last month + paid − share of spending. Tap a member to see what they gave.")}</p>
              </div>
            }
            footer={
              rows.length > 0 && (
                <ListFooter className="flex-row items-center gap-2 py-2.5 text-[12.5px] text-ink-2 md:px-5">
                  {booksMatch ? <CircleCheckBig className="size-3.5 shrink-0 text-income" strokeWidth={2.5} aria-hidden="true" /> : <TriangleAlert className="size-3.5 shrink-0 text-warning" strokeWidth={2.5} aria-hidden="true" />}
                  <span>
                    {booksMatch
                      ? t("Balances add up to {amount}, the same as the cash the group holds. The books match.", { amount: signed(totals.balance) })
                      : t("Balances add up to {amount}. Months left open keep the difference until they are closed.", { amount: signed(totals.balance) })}
                  </span>
                </ListFooter>
              )
            }
          >
            <ListHead columns={COLUMNS} className="h-8.5 gap-x-3.5 border-t md:px-5">
              <ListHeadCell>{t("Member")}</ListHeadCell>
              <ListHeadCell align="end">{t("Shares")}</ListHeadCell>
              <ListHeadCell align="end">{t("Paid this month")}</ListHeadCell>
              <ListHeadCell align="end">{t("Share of spending")}</ListHeadCell>
              <ListHeadCell align="end">{t("From last month")}</ListHeadCell>
              <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
            </ListHead>
            {rows.map(({ row, member, carry }) => {
              const own = Number(row.pocketPaid);
              return (
                <ListRow key={row.groupMemberId} columns={COLUMNS} density="relaxed" className="gap-x-3.5 text-body tabular-nums md:min-h-15.5 md:px-5 md:py-2">
                  <ListCell className="flex items-center gap-2.5">
                    <MemberAvatar member={member ?? { id: row.groupMemberId, name: row.name, photoUrl: null }} members={data.members} size={34} />
                    <span className="flex min-w-0 flex-col gap-0.75">
                      <span className="flex min-w-0 items-center gap-2">
                        {member ? (
                          <ListRowButton onClick={() => onStatement(member)} aria-label={t("{name}'s statement", { name: row.name })} className="truncate font-semibold text-ink">
                            {row.name}
                          </ListRowButton>
                        ) : (
                          <span className="truncate font-semibold text-ink">{row.name}</span>
                        )}
                        {roleChip(member)}
                        {member && me?.id === member.id && <span className="shrink-0 text-[11.5px] text-ink-muted">{t("(you)")}</span>}
                        {member && member.status !== "ACTIVE" && <span className="shrink-0 text-[11.5px] text-ink-muted">{t(" · left")}</span>}
                      </span>
                      {member?.household && <span className="truncate text-caption text-ink-muted">{member.household}</span>}
                    </span>
                  </ListCell>
                  <ListCell align="end" className="hidden md:block">
                    {formatCount(Number(member?.shareUnits ?? 0), fmt)}
                  </ListCell>
                  <ListCell align="end" className="hidden md:block">
                    <span className="flex flex-col items-end gap-px">
                      <span className="font-semibold">{money(paidIn(row) - carry)}</span>
                      {own > 0 && <span className="text-[11.5px] leading-[1.35] text-ink-muted">{t("incl. {amount} own pocket", { amount: money(own) })}</span>}
                    </span>
                  </ListCell>
                  <ListCell align="end" className="hidden md:block">
                    {money(row.share)}
                  </ListCell>
                  <ListCell align="end" className={cn("hidden md:block", carry < -0.5 ? "text-expense" : "text-ink-soft")}>
                    {signed(carry)}
                  </ListCell>
                  <ListCell>
                    <BalanceCell value={Number(row.balance)} currency={currency} className="max-md:flex-col max-md:items-end max-md:gap-1" />
                  </ListCell>
                </ListRow>
              );
            })}
            {rows.length > 0 && (
              <ListTotalRow columns={COLUMNS} className="min-h-12 gap-x-3.5 tabular-nums md:px-5">
                <span role="cell">{t("Total")}</span>
                <span role="cell" className="hidden text-right md:block">
                  {formatCount(totals.shares, fmt)}
                </span>
                <span role="cell" className="hidden text-right md:block">
                  {money(totals.paid)}
                </span>
                <span role="cell" className="hidden text-right md:block">
                  {money(totals.share)}
                </span>
                <span role="cell" className="hidden text-right text-ink-soft md:block">
                  {signed(totals.carry)}
                </span>
                <span role="cell" className={cn("text-right", totals.balance < -0.004 ? "text-expense" : "text-ink")}>
                  {signed(totals.balance)}
                </span>
              </ListTotalRow>
            )}
          </ListCard>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <Card padding="none" className="flex min-w-0 flex-col gap-1.5 px-5 py-4">
              <div className="mb-1 flex items-end justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-[16px] font-semibold text-ink">{t("Where the money went")}</h2>
                  <p className="text-caption text-ink-muted">{t("Spending by category · tap one to see its expenses")}</p>
                </div>
                <span className="text-[13px] font-semibold text-ink tabular-nums">{money(spent)}</span>
              </div>
              {cats.length === 0 && <p className="py-4 text-center text-small text-ink-muted">{t("No spending in {month} yet.", { month })}</p>}
              {cats.map((row) => {
                const percent = spent > 0 ? (row.amount / spent) * 100 : 0;
                return (
                  <Link
                    key={row.name}
                    href={groupTabHref(data.businessId, "expenses", { category: row.name, month: data.range.key })}
                    aria-label={t("{name}: {amount}, {percent}% of {month}", { name: row.name, amount: money(row.amount), percent: formatCount(Math.round(percent), fmt), month })}
                    className="-mx-1.5 grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-xl px-1.5 py-2 hover:bg-surface-sunken/60"
                  >
                    <CategoryTile name={row.name} categories={data.categories} size={32} />
                    <span className="flex min-w-0 flex-col gap-1.5">
                      <span className="truncate text-[13.5px] font-semibold text-ink">{row.name}</span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                        <span className={cn("block h-full rounded-full bg-current", categoryBarClass(row.name, data.categories))} style={{ width: `${Math.max(2, percent)}%` }} />
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-0.5 tabular-nums">
                      <span className="text-[13.5px] font-semibold text-ink">{money(row.amount)}</span>
                      <span className="text-[11.5px] text-ink-muted">{t("{percent}% of {month}", { percent: formatCount(Math.round(percent), fmt), month: formatDay(`${data.range.key}-01`, "MMMM", fmt) })}</span>
                    </span>
                  </Link>
                );
              })}
            </Card>

            <Card padding="none" className="flex min-w-0 flex-col px-5 py-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-[16px] font-semibold text-ink">{t("Recent entries")}</h2>
                  <p className="text-caption text-ink-muted">
                    {t(entries.length === 1 ? "{count} entry dated in {month}" : "{count} entries dated in {month}", { count: formatCount(entries.length, fmt), month: formatDay(`${data.range.key}-01`, "MMMM", fmt) })}
                    {entries.length > 6 && t(" · newest 6")}
                  </p>
                </div>
                <Button asChild variant="soft" size="sm" className="text-[13px]">
                  <Link href={groupTabHref(data.businessId, "expenses", { month: data.range.key })}>
                    {t("See all")}
                    <ChevronRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>
              {entries.length === 0 && <p className="py-4 text-center text-small text-ink-muted">{t("No entries in {month} yet.", { month })}</p>}
              <ul className="flex flex-col">
                {entries.slice(0, 6).map((entry, index) => (
                  <li key={entry.id} className={cn("flex items-center gap-3 py-2.5", index > 0 && "border-t border-divider")}>
                    {entry.kind === "expense" ? (
                      <CategoryTile name={entry.category} categories={data.categories} size={32} />
                    ) : (
                      <IconTile tone={entry.kind === "deposit" ? "income" : "info"} size={32} className="rounded-[9px] [&_svg]:size-4">
                        {entry.kind === "deposit" ? <ArrowDown /> : <ArrowLeftRight />}
                      </IconTile>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[13.5px] text-ink">
                        <span className="font-semibold">
                          {entry.kind === "expense"
                            ? entry.category
                            : entry.kind === "deposit"
                              ? `${t("Contribution")} · ${firstName(entry.memberId)}`
                              : `${t("Payment")} · ${firstName(entry.memberId)} → ${firstName(entry.toId)}`}
                        </span>
                        {(entry.note || entry.pocket) && <span className="text-ink-2"> {[entry.note, entry.pocket ? t("{name}’s own pocket", { name: firstName(entry.memberId) }) : null].filter(Boolean).join(" · ")}</span>}
                      </span>
                      <span className="truncate text-caption text-ink-muted">{entry.by ? t("{date} · by {name}", { date: formatDay(entry.date, "d MMM", fmt), name: shortName(entry.by) }) : formatDay(entry.date, "d MMM", fmt)}</span>
                    </span>
                    <span className={cn("text-[13.5px] font-semibold whitespace-nowrap tabular-nums", entry.kind === "expense" ? "text-ink" : entry.kind === "deposit" ? "text-income" : "text-info")}>
                      {entry.kind === "expense" ? `− ${money(entry.amount)}` : entry.kind === "deposit" ? `+ ${money(entry.amount)}` : money(entry.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

interface RecentEntry {
  id: string;
  kind: "expense" | "deposit" | "payment";
  date: string;
  createdAt: string;
  amount: number;
  category: string;
  note: string | null;
  memberId: string | undefined;
  toId?: string;
  // Who recorded it (null on older entries), and an expense paid from a pocket.
  by: string | null;
  pocket?: boolean;
}

// The month's entries, newest first. A settle-up is two contribution rows
// sharing a settleGroupId (the payer's in, the receiver's out): one payment.
// A plain return (a negative contribution) is money handed back.
export function recentEntries(expenses: GroupExpense[], contributions: GroupContribution[]): RecentEntry[] {
  const out: RecentEntry[] = expenses.map((row) => ({ id: `e-${row.id}`, kind: "expense", date: row.date.slice(0, 10), createdAt: row.createdAt, amount: Number(row.amount), category: row.category, note: row.description, memberId: row.paidByMemberId ?? undefined, by: row.recordedByName ?? null, pocket: row.paidFrom === "MEMBER" }));
  const pairs = new Map<string, GroupContribution[]>();
  for (const row of contributions) {
    if (row.settleGroupId) pairs.set(row.settleGroupId, [...(pairs.get(row.settleGroupId) ?? []), row]);
    else if (Number(row.amount) > 0) out.push({ id: `c-${row.id}`, kind: "deposit", date: row.date.slice(0, 10), createdAt: row.createdAt, amount: Number(row.amount), category: "", note: row.note, memberId: row.groupMemberId, by: row.recordedByName ?? null });
  }
  for (const [key, pair] of pairs) {
    const from = pair.find((row) => Number(row.amount) > 0);
    const to = pair.find((row) => Number(row.amount) < 0);
    const first = from ?? to;
    if (!first) continue;
    out.push({ id: `p-${key}`, kind: "payment", date: first.date.slice(0, 10), createdAt: first.createdAt, amount: Math.abs(Number(first.amount)), category: "", note: first.note, memberId: from?.groupMemberId, toId: to?.groupMemberId, by: first.recordedByName ?? null });
  }
  return out.sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
}
