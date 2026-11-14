"use client";

import { ArrowRight, CalendarCheck, Check, CircleCheckBig, Info, Utensils } from "lucide-react";
import Link from "next/link";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import ProgressBar from "@/components/smartly/ProgressBar";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowButton, ListTotalRow } from "@/components/smartly/list";
import type { GroupMember } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { BUDGET_TONE_BAR, BUDGET_TONE_PROGRESS, BUDGET_TONE_TEXT, budgetFor, budgetStatus, categorySplits, countLabel, dayLabel, mealRateText, monthRangeOf, paidIn, shortName, splitTotals, startDayOf, type Transfer } from "@/lib/customer/groupDisplay";
import { mealText, mealValue, unitsOf } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { redigit } from "@/lib/i18n/formatPrefs";
import { givesMoney } from "@/lib/customer/groupFamily";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BalanceCell, CategoryTile, categoryBarClass, MemberAvatar } from "./GroupBits";
import type { GroupPageData, GroupView } from "./groupTypes";

interface MessDashboardProps {
  data: GroupPageData;
  view: GroupView;
  onRecordPayment: (transfer: Transfer) => void;
  onStatement: (member: GroupMember) => void;
  // The Admin's alone; absent for anyone else.
  onSetBudget?: () => void;
  canPay: (fromId: string) => boolean;
}

// A way of sharing as the dashboard's rows write it, in lower case.
export const SPLIT_WORDS = { EQUAL: "equally", SHARES: "by shares", MEALS: "by meals", EXACT: "exact amounts", MIXED: "mixed" } as const;

// Member, (meals,) paid in, cost, balance with its chip beside it.
// Figures with paisa get wider columns.
const MESS_COLUMNS = "md:grid-cols-[minmax(0,1fr)_56px_100px_96px_146px]";
const FAMILY_COLUMNS = "md:grid-cols-[minmax(0,1fr)_132px_88px_146px]";
const MESS_COLUMNS_WIDE = "md:grid-cols-[minmax(0,1fr)_56px_108px_104px_178px]";
const FAMILY_COLUMNS_WIDE = "md:grid-cols-[minmax(0,1fr)_132px_104px_178px]";
const hasPaisa = (value: number | string) => Math.round(Number(value) * 100) % 100 !== 0;

const dayBefore = (day: string) => new Date(Date.parse(`${day}T00:00:00.000Z`) - 86_400_000).toISOString().slice(0, 10);

// A group's month at a glance, as the Mess and Family boards draw it: a
// month that has ended asks to be closed, then the four figures and every
// member's balance. A mess adds where the money went with its budget and
// the latest entries; a family who pays whom, where the money went and the
// last six months against the budget.
export function MessDashboard({ data, view, onRecordPayment, onStatement, onSetBudget, canPay }: MessDashboardProps) {
  const { t, fmt } = useLocale();
  const { currency, range, settlement } = data;
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const month = monthName(range.key, fmt);
  const spent = Number(settlement.totalExpense);
  // Money handed in: no settle-ups, no balance carried in.
  const deposits = data.contributions.filter((c) => givesMoney(c) && Number(c.amount) > 0);
  const contributed = deposits.reduce((sum, c) => sum + Number(c.amount), 0);
  const returned = data.contributions.filter((c) => Number(c.amount) < 0).reduce((sum, c) => sum - Number(c.amount), 0);
  const top = view.byCategory.slice(0, 2);
  const rows = settlement.members.map((row) => ({ row, member: view.memberById[row.groupMemberId] }));
  const totalPaid = rows.reduce((sum, r) => sum + paidIn(r.row), 0);
  const totalCost = rows.reduce((sum, r) => sum + Number(r.row.share), 0);
  const maxMonth = Math.max(...view.byMonth.map((m) => m.amount), 1);
  const lastMonth = view.byMonth[view.byMonth.length - 1];
  const lastStatus = view.budget && lastMonth ? budgetStatus(view.budget.budget, lastMonth.amount) : null;
  const mess = data.settings.kind === "MESS";
  const meals = mess || data.settings.mealsOn;
  const wide = rows.some(({ row }) => hasPaisa(row.balance) || hasPaisa(row.share) || hasPaisa(paidIn(row)));
  const columns = mess ? (wide ? MESS_COLUMNS_WIDE : MESS_COLUMNS) : wide ? FAMILY_COLUMNS_WIDE : FAMILY_COLUMNS;
  const holder = data.settings.cashHolderMemberId ? view.memberById[data.settings.cashHolderMemberId] : undefined;
  const pocket = rows.reduce((sum, r) => sum + Number(r.row.pocketPaid), 0);
  const mealSpend = Number(settlement.mealExpense);
  const splits = categorySplits(data.expenses, view.mealsPooled);
  const startDay = startDayOf(range);
  // Each member's part of the costs shared by shares (a family's bazar).
  const byShares = splitTotals(data.expenses, "SHARES", data.members, range, view.mealsPooled);
  const ended = range.to < data.today;
  const settlementLink = { pathname: `/group-expenses/${data.businessId}`, query: { tab: "settlement", month: range.key } };

  const stats = [
    { label: t("Total expense"), value: money(spent), sub: meals && mealSpend > 0 ? t("Bazar {bazar} · other costs {other}", { bazar: money(mealSpend), other: money(spent - mealSpend) }) : top.length > 0 ? top.map((c) => `${c.name} ${money(c.amount)}`).join(" · ") : t("Nothing spent yet") },
    meals
      ? { label: t("Meal rate"), value: mealRateText(settlement.mealRate, currency, fmt), sub: Number(settlement.mealUnits) > 0 ? t("{bazar} bazar ÷ {meals} meals", { bazar: money(mealSpend), meals: mealText(Number(settlement.mealUnits), fmt) }) : t("No meals marked yet") }
      : view.budget
        ? {
            label: t("{month} budget", { month }),
            value: money(view.budget.budget),
            sub: view.budget.left < 0 ? t("{percent}% used · {amount} over", { percent: formatCount(view.budget.percent, fmt), amount: money(-view.budget.left) }) : t("{percent}% used · {amount} left", { percent: formatCount(view.budget.percent, fmt), amount: money(view.budget.left) }),
            subTone: view.budget.tone === "ok" ? undefined : BUDGET_TONE_TEXT[view.budget.tone],
            subBold: view.budget.tone !== "ok",
          }
        : { label: t("{month} budget", { month }), value: "—", sub: t("No budget set"), action: onSetBudget },
    { label: t("Cash in hand"), value: money(view.cash), sub: holder ? t("With {name} · matches all balances", { name: shortName(holder.name) }) : t("matches all balances"), check: true, tone: view.cash < 0 ? "text-expense" : undefined },
    { label: t("Contributions"), value: money(contributed), sub: pocket > 0 ? t("+ {amount} paid from own pockets", { amount: money(pocket) }) : returned > 0 ? t("{amount} returned", { amount: money(returned) }) : countLabel(t, fmt, deposits.length, "{count} deposit", "{count} deposits") },
  ];

  const balances = (
    <ListCard
      label={t("Member balances")}
      className="min-w-0"
      header={
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 md:px-5">
          <h2 className="text-title font-semibold text-ink">{t("Member balances")}</h2>
          <Link href={settlementLink} className="text-small font-semibold text-emerald hover:text-emerald-hover">
            {t("Open settlement")}
          </Link>
        </div>
      }
      footer={
        rows.length > 0 && (
          <ListFooter className="flex-row items-center gap-2 py-2.5 text-[12.5px] text-ink-soft md:px-5">
            <CircleCheckBig className="size-3.5 shrink-0 text-emerald" strokeWidth={2.5} aria-hidden="true" />
            <span>{holder ? t("Balances add up to {cash}, the cash {name} is holding. The account checks out.", { cash: money(view.cash), name: shortName(holder.name) }) : t("Balances add up to {cash}, the cash in hand. The account checks out.", { cash: money(view.cash) })}</span>
          </ListFooter>
        )
      }
    >
      <ListHead columns={columns} className="h-8.5 gap-x-3.5 border-t md:px-5">
        <ListHeadCell>{t("Member")}</ListHeadCell>
        {mess && <ListHeadCell align="end">{t("Meals")}</ListHeadCell>}
        <ListHeadCell align="end">{t("Paid in")}</ListHeadCell>
        <ListHeadCell align="end">{t("Cost")}</ListHeadCell>
        <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
      </ListHead>
      {rows.length === 0 && <ListEmpty title={t("Add members to see their balances.")} />}
      {rows.map(({ row, member }) => {
        const own = Number(row.pocketPaid);
        const shareCost = byShares[row.groupMemberId] ?? 0;
        // How the cost is made up: meals and the shared rest (a mess), by
        // shares and the shared rest (a family), or what came from a pocket.
        const sub = mess
          ? own > 0
            ? t("{amount} bazar from own pocket", { amount: money(own) })
            : t("{meals} meals + {shared} shared", { meals: money(row.mealCost), shared: money(row.otherShare) })
          : shareCost > 0
            ? t("{amount} by shares + {shared} shared", { amount: money(shareCost), shared: money(Number(row.share) - shareCost) })
            : t("{amount} shared", { amount: money(row.share) });
        return (
          <ListRow key={row.groupMemberId} columns={columns} density={mess ? "regular" : "relaxed"} className="gap-x-3.5 text-body tabular-nums md:px-5 md:py-1.5">
            <ListCell className="flex items-center gap-2.5">
              <MemberAvatar member={member ?? { id: row.groupMemberId, name: row.name, photoUrl: null }} members={data.members} size={mess ? 32 : 34} />
              <span className={cn("flex min-w-0 flex-col", mess ? "gap-px" : "gap-0.5")}>
                <span className="flex min-w-0 items-center gap-1.5">
                  {member ? (
                    <ListRowButton onClick={() => onStatement(member)} aria-label={t("{name}'s statement", { name: row.name })} className={cn("truncate text-ink", mess ? "font-medium" : "font-semibold")}>
                      {shortName(row.name)}
                    </ListRowButton>
                  ) : (
                    <span className="truncate font-medium text-ink">{shortName(row.name)}</span>
                  )}
                  {mess
                    ? member &&
                      member.id === holder?.id && (
                        <Chip tone="neutral" size="sm" className="text-ink-soft">
                          {t("Manager")}
                        </Chip>
                      )
                    : member && (
                        <Chip tone="neutral" size="sm" className="text-ink-soft">
                          {countLabel(t, fmt, Number(member.shareUnits), "{count} share", "{count} shares")}
                        </Chip>
                      )}
                </span>
                {/* Paid in counts own-pocket money, as the balance does. */}
                <span className="truncate text-caption font-normal text-ink-muted md:hidden">{t("{paid} paid in · {cost} cost", { paid: money(paidIn(row)), cost: money(row.share) })}</span>
                <span className="hidden truncate text-caption font-normal text-ink-muted md:block">{sub}</span>
              </span>
            </ListCell>
            {mess && (
              <ListCell align="end" className="hidden text-ink-2 md:block">
                {mealText(Number(row.mealUnits), fmt)}
              </ListCell>
            )}
            <ListCell align="end" className="hidden md:block">
              {mess ? (
                money(paidIn(row))
              ) : (
                <span className="flex flex-col items-end gap-px">
                  <span>{money(paidIn(row))}</span>
                  <span className="text-[11.5px] whitespace-nowrap text-ink-muted">{own > 0 ? t("incl. {amount} own pocket", { amount: money(own) }) : t("contributions")}</span>
                </span>
              )}
            </ListCell>
            <ListCell align="end" className="hidden md:block">
              {money(row.share)}
            </ListCell>
            <ListCell>
              <BalanceCell value={Number(row.balance)} currency={currency} className="max-md:flex-col max-md:items-end max-md:gap-1" />
            </ListCell>
          </ListRow>
        );
      })}
      {rows.length > 0 && (
        <ListTotalRow columns={columns} className="min-h-12.5 gap-x-3.5 tabular-nums md:px-5">
          <span role="cell">{t("Total")}</span>
          {mess && (
            <span role="cell" className="hidden text-right md:block">
              {mealText(Number(settlement.mealUnits), fmt)}
            </span>
          )}
          <span role="cell" className="hidden text-right md:block">
            {money(totalPaid)}
          </span>
          <span role="cell" className="hidden text-right md:block">
            {money(totalCost)}
          </span>
          <span role="cell" className={cn("text-right", view.cash < 0 ? "text-expense" : "text-income")}>
            {formatSignedCurrency(view.cash, currency, fmt)}
          </span>
        </ListTotalRow>
      )}
    </ListCard>
  );

  const whereItWent = (
    <Card padding="none" className={cn("flex min-w-0 flex-col px-5 py-4", mess ? "gap-3.5" : "gap-3")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">{t("Where the money went")}</h2>
        <span className="text-caption font-normal text-ink-muted">{mess ? month : t("{month} · how each is shared", { month })}</span>
      </div>
      {view.byCategory.length === 0 && <p className="py-4 text-center text-small text-ink-muted">{t("No expense yet this month.")}</p>}
      {view.byCategory.map((cat) => {
        // How this month's costs in it were really shared.
        const how = splits[cat.name] ?? "MIXED";
        return (
          <div key={cat.name} className={cn("flex flex-col", mess ? "gap-1.5" : "gap-1.25")}>
            <div className="flex items-center gap-2 text-small">
              <CategoryTile name={cat.name} categories={data.categories} size={24} />
              <span className="truncate font-medium text-ink">{cat.name}</span>
              {mess ? (
                <span className="shrink-0 text-caption text-ink-faint">{t(SPLIT_WORDS[how])}</span>
              ) : (
                <Chip tone={how === "SHARES" ? "mint" : "neutral"} size="sm" className={how === "SHARES" ? undefined : "text-ink-soft"}>
                  {t(SPLIT_WORDS[how])}
                </Chip>
              )}
              <span className="flex-1" />
              <span className="font-semibold text-ink tabular-nums">{money(cat.amount)}</span>
              <span className="w-11 text-right text-ink-muted tabular-nums">{toLocaleDigits(`${cat.share}%`, fmt)}</span>
            </div>
            <span className={cn("block h-1.5 overflow-hidden rounded-full bg-surface-sunken", categoryBarClass(cat.name, data.categories))}>
              <span className="block h-full rounded-full bg-current" style={{ width: `${cat.share}%` }} />
            </span>
          </div>
        );
      })}
      {/* A mess keeps its budget under the spend. */}
      {mess && (
        <div className="mt-1 flex flex-col gap-2 border-t border-divider pt-3.5">
          {view.budget ? (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-small">
                <span className="font-semibold text-ink">{t("Budget {amount}", { amount: money(view.budget.budget) })}</span>
                <span className={cn("font-semibold tabular-nums", view.budget.tone === "ok" ? "text-ink-2" : BUDGET_TONE_TEXT[view.budget.tone])}>
                  {view.budget.left < 0 ? t("{percent}% used · {amount} over", { percent: formatCount(view.budget.percent, fmt), amount: money(-view.budget.left) }) : t("{percent}% used · {amount} left", { percent: formatCount(view.budget.percent, fmt), amount: money(view.budget.left) })}
                </span>
              </div>
              <ProgressBar value={view.budget.percent} tone={BUDGET_TONE_PROGRESS[view.budget.tone]} label={t("Budget used")} valueText={t("{percent}% used", { percent: formatCount(view.budget.percent, fmt) })} />
              <span className="text-caption text-ink-muted">
                {view.budget.tone === "over"
                  ? t("Over the budget by {amount}.", { amount: money(-view.budget.left) })
                  : view.budget.tone === "warning"
                    ? t(ended ? "Past 90% of the budget with the month already over." : "Past 90% of the budget with the month still running.")
                    : t(ended ? "The month ended inside the budget." : "Inside the budget so far.")}
              </span>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3 text-small">
              <span className="text-ink-muted">{t("No budget set for this month")}</span>
              {onSetBudget && (
                <button type="button" onClick={onSetBudget} className="relative font-semibold text-emerald after:absolute after:-inset-2 hover:underline">
                  {t("Set one")}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* A month that is over and still open asks to be closed. */}
      {ended && !view.closed && !view.empty && (
        <div role="status" className="flex flex-col gap-3 rounded-field border border-emerald/25 bg-mint-50/60 px-4 py-3 sm:flex-row sm:items-center">
          <span className="flex min-w-0 flex-1 items-start gap-3 text-body text-ink sm:items-center">
            <CalendarCheck className="mt-px size-4.5 shrink-0 text-emerald sm:mt-0" aria-hidden="true" />
            <span>
              <b className="font-semibold">{range.to === dayBefore(data.today) ? t("{month} ended yesterday.", { month }) : t("{month} has ended.", { month })}</b> {t("Check the balances, record any payments, then close the month to lock it.")}
            </span>
          </span>
          <Button asChild size="sm" className="h-8.5 gap-1.5 self-end rounded-sm px-3.5 sm:self-auto">
            <Link href={settlementLink}>
              {t("Review and close")}
              <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}

      {/* A running group's empty month keeps its dashboard, with one line saying so. */}
      {view.empty && (
        <Banner tone="neutral" inline icon={<Info />}>
          {t("Nothing recorded for {month} yet.", { month: monthName(range.key, fmt, "long", true) })}
        </Banner>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} padding="none" className="flex min-w-0 flex-col gap-1.5 px-5 py-4">
            <span className="text-small font-medium text-ink-muted">{stat.label}</span>
            <span className={cn("text-[26px] leading-normal font-bold tracking-[-0.02em] wrap-break-word text-ink tabular-nums", stat.tone)}>{stat.value}</span>
            {stat.action ? (
              // A small link with a finger-sized reach around it.
              <button type="button" onClick={stat.action} className="relative self-start text-caption font-semibold text-emerald after:absolute after:-inset-2 hover:underline pointer-coarse:after:-inset-3">
                {stat.sub} · {t("Set one")}
              </button>
            ) : (
              <span className={cn("flex items-center gap-1.25 text-caption", stat.subBold ? "font-semibold" : "font-normal", stat.subTone ?? "text-ink-muted")}>
                {stat.check && <Check className="size-3.25 shrink-0 text-emerald" strokeWidth={3} aria-hidden="true" />}
                {stat.sub}
              </span>
            )}
          </Card>
        ))}
      </div>

      {mess ? (
        <>
          {/* Side by side only where the balances table keeps room for names. */}
          <div className="grid items-start gap-5 min-[1380px]:grid-cols-[minmax(0,1fr)_380px]">
            {balances}
            {whereItWent}
          </div>
          <LatestEntries data={data} />
        </>
      ) : (
        <>
          <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
            {balances}
            <Card padding="none" className="flex min-w-0 flex-col overflow-hidden">
              <div className="flex flex-col gap-0.5 border-b border-divider px-5 py-3.5">
                <h2 className="text-title font-semibold text-ink">{t("Who pays whom")}</h2>
                <span className="text-[12.5px] text-ink-muted">{t("The fewest payments that make {month} even", { month })}</span>
              </div>
              {view.transfers.map((transfer) => {
                const from = view.memberById[transfer.fromId];
                const to = view.memberById[transfer.toId];
                return (
                  <div key={`${transfer.fromId}-${transfer.toId}`} className="flex flex-col gap-2.5 border-b border-divider px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar member={from} members={data.members} size={34} />
                      <ArrowRight className="size-5.5 shrink-0 text-ink-faint" role="img" aria-label={t("pays")} />
                      <MemberAvatar member={to} members={data.members} size={34} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        {/* Short names keep the line short, past a leading "Md.". */}
                        <span className="truncate text-body font-semibold text-ink" title={`${from?.name ?? ""} → ${to?.name ?? ""}`}>
                          {t("{from} pays {to}", { from: shortName(from?.name), to: shortName(to?.name) })}
                        </span>
                        <span className="truncate text-caption font-normal text-ink-muted">{t("Clears {name}'s {amount}", { name: shortName(from?.name), amount: formatSignedCurrency(view.balances[transfer.fromId] ?? 0, currency, fmt) })}</span>
                      </span>
                      <span className="text-h3 font-bold text-ink tabular-nums">{money(transfer.amount)}</span>
                    </div>
                    {/* A closed month takes no new payment, as on Settlement. */}
                    {!view.closed && canPay(transfer.fromId) && (
                      <Button variant="secondary" size="sm" onClick={() => onRecordPayment(transfer)} className="h-8.5 self-end pointer-coarse:h-11">
                        {t("Record payment")}
                      </Button>
                    )}
                  </div>
                );
              })}
              <div className="flex flex-1 items-start gap-2 bg-strip px-5 py-3.5 text-small leading-normal text-ink-soft">
                <Info className="mt-0.5 size-3.75 shrink-0 text-ink-muted" aria-hidden="true" />
                <span>
                  {view.transfers.length === 0
                    ? spent > 0
                      ? t("Everyone is even. Nothing to settle.")
                      : t("Record contributions and expenses, and the payments that settle the month show up here.")
                    : holder && view.cash > 0.004
                      ? view.transfers.length === 1
                        ? t("{name} already holds the {cash} cash in hand, so after this payment everyone is even.", { name: shortName(holder.name), cash: money(view.cash) })
                        : t("{name} already holds the {cash} cash in hand, so after these {count} payments everyone is even.", { name: shortName(holder.name), cash: money(view.cash), count: formatCount(view.transfers.length, fmt) })
                      : view.transfers.length === 1
                        ? t("After this payment everyone is even. Or carry the balances into next month when you close.")
                        : t("After these {count} payments everyone is even. Or carry the balances into next month when you close.", { count: formatCount(view.transfers.length, fmt) })}
                </span>
              </div>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {whereItWent}

            <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-title font-semibold text-ink">{redigit(t("Last 6 months against the budget"), fmt)}</h2>
                {view.budget && (
                  <span className="flex shrink-0 items-center gap-1.5 text-caption font-normal text-ink-muted">
                    <span className="h-3 w-0.5 bg-ink" aria-hidden="true" />
                    {t("Budget {amount}", { amount: money(view.budget.budget) })}
                  </span>
                )}
              </div>
              {view.byMonth.map((point) => {
                const monthBudget = budgetFor(data.budgets, monthRangeOf(point.month, startDay));
                const status = monthBudget ? budgetStatus(Number(monthBudget.budgetAmount), point.amount) : null;
                const scale = status ? status.budget * 1.1 : maxMonth;
                const last = point.month === range.key;
                return (
                  <div key={point.month} className="grid h-7.5 grid-cols-[40px_minmax(0,1fr)_76px_52px] items-center gap-2.5 text-small tabular-nums">
                    <span className={cn("text-ink-soft", last ? "font-bold" : "font-medium")}>{monthName(point.month, fmt, "short")}</span>
                    <span className="relative h-3.5 rounded-xs bg-surface-sunken">
                      <span className={cn("absolute inset-y-0 left-0 rounded-xs", status ? BUDGET_TONE_BAR[status.tone] : "bg-emerald")} style={{ width: `${Math.min(100, (point.amount / scale) * 100)}%` }} />
                      {status && <span className="absolute -inset-y-1 w-0.5 bg-ink" style={{ left: "90.9%" }} aria-hidden="true" />}
                    </span>
                    <span className={cn("text-right text-ink", last ? "font-bold" : "font-medium")}>{money(point.amount)}</span>
                    <span className={cn("text-right font-semibold", status?.tone === "over" ? "text-expense" : "text-ink-muted")}>{status ? `${formatCount(status.percent, fmt)}%` : "—"}</span>
                  </div>
                );
              })}
              {lastStatus && (
                <span className="text-caption font-normal text-ink-muted">
                  {lastStatus.left < 0
                    ? top[0]
                      ? t("{month} went {amount} over, mostly {category} ({spent}).", { month, amount: money(-lastStatus.left), category: top[0].name, spent: money(top[0].amount) })
                      : t("{month} went {amount} over the budget.", { month, amount: money(-lastStatus.left) })
                    : top[0]
                      ? t("{month} is {amount} under the budget so far, mostly {category} ({spent}).", { month, amount: money(lastStatus.left), category: top[0].name, spent: money(top[0].amount) })
                      : t("{month} is {amount} under the budget so far.", { month, amount: money(lastStatus.left) })}
                </span>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// A mess's newest entries: the expenses and the days' meal marks, newest
// first, four of them.
function LatestEntries({ data }: { data: GroupPageData }) {
  const { t, fmt } = useLocale();
  const money = (value: number | string) => formatCurrency(value, data.currency, fmt);
  const units = unitsOf(data.settings);
  const active = data.members.filter((member) => member.status === "ACTIVE").length;
  const days = new Map<string, { total: number; people: number }>();
  for (const meal of data.meals) {
    const value = mealValue(meal, units);
    if (value <= 0) continue;
    const day = days.get(meal.date.slice(0, 10)) ?? { total: 0, people: 0 };
    days.set(meal.date.slice(0, 10), { total: day.total + value, people: day.people + 1 });
  }
  const entries = [
    ...data.expenses.map((expense) => {
      const who = expense.paidFrom === "MEMBER" && expense.paidByMember ? t("{name}'s pocket", { name: shortName(expense.paidByMember.name) }) : t("from fund");
      const how = expense.split === "EQUAL" ? t("split equally") : t(SPLIT_WORDS[expense.split]);
      return {
        key: expense.id,
        day: expense.date.slice(0, 10),
        order: expense.createdAt,
        title: expense.category,
        amount: money(expense.amount),
        sub: [dayLabel(expense.date, fmt), expense.description || who, how].join(" · "),
        tile: <CategoryTile name={expense.category} categories={data.categories} size={32} />,
      };
    }),
    ...[...days].map(([day, marked]) => ({
      key: `meals-${day}`,
      day,
      order: "",
      title: t("Meals marked"),
      amount: t("{count} meals", { count: mealText(marked.total, fmt) }),
      sub: `${dayLabel(day, fmt)} · ${marked.people >= active ? t("all {count} members", { count: formatCount(active, fmt) }) : countLabel(t, fmt, marked.people, "{count} member", "{count} members")}`,
      tile: (
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-warning-soft text-warning">
          <Utensils className="size-4" />
        </span>
      ),
    })),
  ]
    .sort((a, b) => b.day.localeCompare(a.day) || b.order.localeCompare(a.order))
    .slice(0, 4);
  if (entries.length === 0) return null;

  return (
    <Card padding="none" className="flex flex-col gap-3 px-5 pt-3.5 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">{t("Latest entries")}</h2>
        <Link href={{ pathname: `/group-expenses/${data.businessId}`, query: { tab: "expenses", month: data.range.key } }} className="text-small font-semibold text-emerald hover:text-emerald-hover">
          {t("See all expenses")}
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {entries.map((entry) => (
          <li key={entry.key} className="flex min-w-0 gap-2.5 rounded-[14px] border border-divider bg-strip p-3">
            {entry.tile}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex justify-between gap-2 text-small">
                <span className="truncate font-semibold text-ink">{entry.title}</span>
                <span className="font-semibold whitespace-nowrap text-ink tabular-nums">{entry.amount}</span>
              </span>
              <span className="truncate text-caption text-ink-muted">{entry.sub}</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
