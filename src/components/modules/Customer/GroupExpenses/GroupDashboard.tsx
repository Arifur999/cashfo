"use client";

import { ArrowRight, Check, Info } from "lucide-react";
import Link from "next/link";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowButton, ListTotalRow } from "@/components/smartly/list";
import type { GroupMember } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { BUDGET_TONE_BAR, BUDGET_TONE_TEXT, budgetFor, budgetStatus, categorySplits, countLabel, monthRangeOf, paidIn, shortName, SPLIT_LABELS, startDayOf, type Transfer } from "@/lib/customer/groupDisplay";
import { mealText } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BalanceCell, CategoryTile, categoryBarClass } from "./GroupBits";
import type { GroupPageData, GroupView } from "./groupTypes";

interface GroupDashboardProps {
  data: GroupPageData;
  view: GroupView;
  onRecordPayment: (transfer: Transfer) => void;
  onStatement: (member: GroupMember) => void;
  onSetBudget: () => void;
}

// Member, paid in, cost, balance (its chip under the figure, so the column
// stays narrow); a group counting meals adds each member's meals.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_104px_104px_112px]";
const MEALS_COLUMNS = "md:grid-cols-[minmax(0,1fr)_56px_104px_104px_112px]";

// A group's month at a glance: the four figures, every member's balance,
// who pays whom, where the money went, and the last six months against
// the budget.
export function GroupDashboard({ data, view, onRecordPayment, onStatement, onSetBudget }: GroupDashboardProps) {
  const { t, locale } = useLocale();
  const { currency, range, settlement } = data;
  const money = (value: number | string) => formatCurrency(value, currency);
  const month = monthName(range.key, locale);
  const spent = Number(settlement.totalExpense);
  const deposits = data.contributions.filter((c) => Number(c.amount) > 0);
  const contributed = deposits.reduce((sum, c) => sum + Number(c.amount), 0);
  const returned = data.contributions.filter((c) => Number(c.amount) < 0).reduce((sum, c) => sum - Number(c.amount), 0);
  const top = view.byCategory.slice(0, 2);
  const rows = settlement.members.map((row) => ({ row, member: view.memberById[row.groupMemberId] }));
  const totalPaid = rows.reduce((sum, r) => sum + paidIn(r.row), 0);
  const totalCost = rows.reduce((sum, r) => sum + Number(r.row.share), 0);
  const maxMonth = Math.max(...view.byMonth.map((m) => m.amount), 1);
  const lastMonth = view.byMonth[view.byMonth.length - 1];
  const lastStatus = view.budget && lastMonth ? budgetStatus(view.budget.budget, lastMonth.amount) : null;
  const meals = data.settings.kind === "MESS" || data.settings.mealsOn;
  const columns = meals ? MEALS_COLUMNS : COLUMNS;
  const holder = data.settings.cashHolderMemberId ? view.memberById[data.settings.cashHolderMemberId] : undefined;
  const pocket = rows.reduce((sum, r) => sum + Number(r.row.pocketPaid), 0);
  const mealSpend = Number(settlement.mealExpense);
  const splits = categorySplits(data.expenses, view.mealsPooled);
  const startDay = startDayOf(range);

  const stats = [
    { label: t("Total expense"), value: money(spent), sub: meals && mealSpend > 0 ? t("Bazar {bazar} · other costs {other}", { bazar: money(mealSpend), other: money(spent - mealSpend) }) : top.length > 0 ? top.map((c) => `${c.name} ${money(c.amount)}`).join(" · ") : t("Nothing spent yet") },
    meals
      ? { label: t("Meal rate"), value: money(settlement.mealRate), sub: Number(settlement.mealUnits) > 0 ? t("{bazar} bazar ÷ {meals} meals", { bazar: money(mealSpend), meals: mealText(Number(settlement.mealUnits), locale) }) : t("No meals marked yet") }
      : view.budget
        ? {
            label: t("{month} budget", { month }),
            value: money(view.budget.budget),
            sub: view.budget.left < 0 ? t("{percent}% used · {amount} over", { percent: view.budget.percent, amount: money(-view.budget.left) }) : t("{percent}% used · {amount} left", { percent: view.budget.percent, amount: money(view.budget.left) }),
            subTone: BUDGET_TONE_TEXT[view.budget.tone],
            subBold: view.budget.tone !== "ok",
          }
        : { label: t("{month} budget", { month }), value: "—", sub: t("No budget set"), action: onSetBudget },
    { label: t("Cash in hand"), value: money(view.cash), sub: holder ? t("With {name} · matches all balances", { name: holder.name }) : t("matches all balances"), check: true, tone: view.cash < 0 ? "text-expense" : undefined },
    { label: t("Contributions"), value: money(contributed), sub: pocket > 0 ? t("+ {amount} paid from own pockets", { amount: money(pocket) }) : returned > 0 ? t("{amount} returned", { amount: money(returned) }) : countLabel(t, locale, deposits.length, "{count} deposit", "{count} deposits") },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* A running group's empty month keeps its dashboard, with one line saying so. */}
      {view.empty && (
        <Banner tone="neutral" inline icon={<Info />}>
          {t("Nothing recorded for {month} yet.", { month: monthName(range.key, locale, "long", true) })}
        </Banner>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} padding="none" className="flex min-w-0 flex-col gap-2 px-5 py-4">
            <span className="text-small font-medium text-ink-muted">{stat.label}</span>
            <span className={cn("text-h1 wrap-break-word tabular-nums", stat.tone)}>{stat.value}</span>
            {stat.action ? (
              // A small link with a finger-sized reach around it.
              <button type="button" onClick={stat.action} className="relative self-start text-caption font-semibold text-emerald after:absolute after:-inset-2 hover:underline pointer-coarse:after:-inset-3">
                {stat.sub} · {t("Set one")}
              </button>
            ) : (
              <span className={cn("flex items-center gap-1 text-caption", stat.subBold ? "font-semibold" : "font-normal", stat.subTone ?? "text-ink-muted")}>
                {stat.check && <Check className="size-3.5 shrink-0 text-income" aria-hidden="true" />}
                {stat.sub}
              </span>
            )}
          </Card>
        ))}
      </div>

      {/* Side by side only where the balances table keeps room for names. */}
      <div className={cn("grid items-start gap-5", meals ? "2xl:grid-cols-[minmax(0,1fr)_340px]" : "xl:grid-cols-[minmax(0,1fr)_340px]")}>
        <ListCard
          label={t("Members' balances")}
          header={
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4 md:px-6">
              <h2 className="text-title font-semibold text-ink">{t("Members' balances")}</h2>
              <Link href={{ pathname: `/group-expenses/${data.businessId}`, query: { tab: "settlement", month: range.key } }} className="text-small font-semibold text-emerald hover:text-emerald-hover">
                {t("Open settlement")}
              </Link>
            </div>
          }
          footer={
            rows.length > 0 && (
              <ListFooter className="flex-row items-center gap-2 text-ink-2">
                <Check className="size-4 shrink-0 text-income" aria-hidden="true" />
                <span>{t("Balances add up to {cash}, the cash in hand. The account checks out.", { cash: money(view.cash) })}</span>
              </ListFooter>
            )
          }
        >
          <ListHead columns={columns}>
            <ListHeadCell>{t("Member")}</ListHeadCell>
            {meals && <ListHeadCell align="end">{t("Meals")}</ListHeadCell>}
            <ListHeadCell align="end">{t("Paid in")}</ListHeadCell>
            <ListHeadCell align="end">{t("Cost")}</ListHeadCell>
            <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
          </ListHead>
          {rows.length === 0 && <ListEmpty title={t("Add members to see their balances.")} />}
          {rows.map(({ row, member }) => (
            <ListRow key={row.groupMemberId} columns={columns} density="relaxed" className="tabular-nums">
              <ListCell className="flex items-center gap-3">
                <PersonAvatar name={row.name} src={member?.photoUrl} size={34} coloured />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex min-w-0 items-center gap-2">
                    {member ? (
                      <ListRowButton onClick={() => onStatement(member)} aria-label={t("{name}'s statement", { name: row.name })} className="truncate font-semibold text-ink">
                        {row.name}
                      </ListRowButton>
                    ) : (
                      <span className="truncate font-semibold text-ink">{row.name}</span>
                    )}
                    {member && member.id === holder?.id && (
                      <Chip tone="neutral" size="sm" className="font-semibold">
                        {t("Manager")}
                      </Chip>
                    )}
                  </span>
                  {/* Paid in counts own-pocket money, as the balance does. */}
                  <span className="truncate text-caption font-normal text-ink-muted md:hidden">{t("{paid} paid in · {cost} cost", { paid: money(paidIn(row)), cost: money(row.share) })}</span>
                  <span className="hidden truncate text-caption font-normal text-ink-muted md:block">
                    {Number(row.pocketPaid) > 0 ? t("{amount} from own pocket", { amount: money(row.pocketPaid) }) : meals ? t("{meals} meals + {shared} shared", { meals: money(row.mealCost), shared: money(row.otherShare) }) : (member?.phone ?? t("Active member"))}
                  </span>
                </span>
              </ListCell>
              {meals && (
                <ListCell align="end" className="hidden text-ink-2 md:block">
                  {mealText(Number(row.mealUnits), locale)}
                </ListCell>
              )}
              <ListCell align="end" className="hidden md:block">
                {money(paidIn(row))}
              </ListCell>
              <ListCell align="end" className="hidden md:block">
                {money(row.share)}
              </ListCell>
              <ListCell>
                <BalanceCell stacked value={Number(row.balance)} currency={currency} />
              </ListCell>
            </ListRow>
          ))}
          {rows.length > 0 && (
            <ListTotalRow columns={columns} className="tabular-nums">
              <span role="cell">{t("Total")}</span>
              {meals && (
                <span role="cell" className="hidden text-right md:block">
                  {mealText(Number(settlement.mealUnits), locale)}
                </span>
              )}
              <span role="cell" className="hidden text-right md:block">
                {money(totalPaid)}
              </span>
              <span role="cell" className="hidden text-right md:block">
                {money(totalCost)}
              </span>
              <span role="cell" className={cn("text-right", view.cash < 0 ? "text-expense" : "text-income")}>
                {formatSignedCurrency(view.cash, currency)}
              </span>
            </ListTotalRow>
          )}
        </ListCard>

        <Card padding="none" className="flex flex-col overflow-hidden">
          <div className="flex flex-col gap-0.5 border-b border-divider px-5 py-4">
            <h2 className="text-title font-semibold text-ink">{t("Who pays whom")}</h2>
            <span className="text-small text-ink-muted">{t("The fewest payments that make {month} even", { month })}</span>
          </div>
          {view.transfers.map((transfer) => {
            const from = view.memberById[transfer.fromId];
            const to = view.memberById[transfer.toId];
            return (
              <div key={`${transfer.fromId}-${transfer.toId}`} className="flex flex-col gap-3 border-b border-divider px-5 py-4">
                <div className="flex items-center gap-3">
                  <PersonAvatar name={from?.name ?? "?"} src={from?.photoUrl} size={34} coloured />
                  <ArrowRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <PersonAvatar name={to?.name ?? "?"} src={to?.photoUrl} size={34} coloured />
                  <span className="flex min-w-0 flex-1 flex-col">
                    {/* Short names keep the line short, past a leading "Md.". */}
                    <span className="truncate text-body font-semibold text-ink" title={`${from?.name ?? ""} → ${to?.name ?? ""}`}>
                      {t("{from} pays {to}", { from: shortName(from?.name), to: shortName(to?.name) })}
                    </span>
                    <span className="truncate text-caption font-normal text-ink-muted">{t("Clears {name}'s {amount}", { name: shortName(from?.name), amount: formatSignedCurrency(view.balances[transfer.fromId] ?? 0, currency) })}</span>
                  </span>
                  <span className="text-title font-bold text-ink tabular-nums">{money(transfer.amount)}</span>
                </div>
                {/* A closed month takes no new payment, as on Settlement. */}
                {!view.closed && (
                  <Button variant="secondary" size="sm" onClick={() => onRecordPayment(transfer)} className="self-end pointer-coarse:h-11">
                    {t("Record payment")}
                  </Button>
                )}
              </div>
            );
          })}
          <div className="flex flex-1 items-start gap-2 bg-strip px-5 py-4 text-small leading-relaxed text-ink-2">
            <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span>
              {view.transfers.length === 0
                ? spent > 0
                  ? t("Everyone is even. Nothing to settle.")
                  : t("Record contributions and expenses, and the payments that settle the month show up here.")
                : view.transfers.length === 1
                  ? t("After this payment everyone is even. Or carry the balances into next month when you close.")
                  : t("After these {count} payments everyone is even. Or carry the balances into next month when you close.", { count: formatCount(view.transfers.length, locale) })}
            </span>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-title font-semibold text-ink">{t("Where the money went")}</h2>
            <span className="text-caption font-normal text-ink-muted">{month}</span>
          </div>
          {view.byCategory.length === 0 && <p className="py-4 text-center text-small text-ink-muted">{t("No expense yet this month.")}</p>}
          {view.byCategory.map((cat) => {
            // How this month's costs in it were really shared.
            const how = splits[cat.name];
            return (
              <div key={cat.name} className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-small">
                  <CategoryTile name={cat.name} categories={data.categories} size={24} />
                  <span className="truncate font-medium text-ink">{cat.name}</span>
                  <Chip tone={how === "EQUAL" ? "neutral" : "mint"} size="sm" className="font-semibold">
                    {t(!how || how === "MIXED" ? "Mixed" : SPLIT_LABELS[how])}
                  </Chip>
                  <span className="flex-1" />
                  <span className="font-semibold text-ink tabular-nums">{money(cat.amount)}</span>
                  <span className="w-11 text-right text-ink-muted tabular-nums">{cat.share}%</span>
                </div>
                <span className={cn("block h-1.5 overflow-hidden rounded-full bg-surface-sunken", categoryBarClass(cat.name, data.categories))}>
                  <span className="block h-full rounded-full bg-current" style={{ width: `${cat.share}%` }} />
                </span>
              </div>
            );
          })}
        </Card>

        <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-title font-semibold text-ink">{t("Last 6 months against the budget")}</h2>
            {view.budget && (
              <span className="flex shrink-0 items-center gap-2 text-caption font-normal text-ink-muted">
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
              <div key={point.month} className="grid h-7.5 grid-cols-[40px_minmax(0,1fr)_76px_52px] items-center gap-3 text-small tabular-nums">
                <span className={cn("text-ink-2", last ? "font-bold" : "font-medium")}>{monthName(point.month, locale, "short")}</span>
                <span className="relative h-3.5 rounded-sm bg-surface-sunken">
                  <span className={cn("absolute inset-y-0 left-0 rounded-sm", status ? BUDGET_TONE_BAR[status.tone] : "bg-emerald")} style={{ width: `${Math.min(100, (point.amount / scale) * 100)}%` }} />
                  {status && <span className="absolute -inset-y-1 w-0.5 bg-ink" style={{ left: "90.9%" }} aria-hidden="true" />}
                </span>
                <span className={cn("text-right text-ink", last ? "font-bold" : "font-medium")}>{money(point.amount)}</span>
                <span className={cn("text-right font-semibold", status ? BUDGET_TONE_TEXT[status.tone] : "text-ink-muted")}>{status ? `${status.percent}%` : "—"}</span>
              </div>
            );
          })}
          {lastStatus && (
            <span className="text-caption font-normal text-ink-muted">
              {lastStatus.left < 0
                ? top[0]
                  ? t("{month} went {amount} over the budget, mostly {category} ({spent}).", { month, amount: money(-lastStatus.left), category: top[0].name, spent: money(top[0].amount) })
                  : t("{month} went {amount} over the budget.", { month, amount: money(-lastStatus.left) })
                : top[0]
                  ? t("{month} is {amount} under the budget so far, mostly {category} ({spent}).", { month, amount: money(lastStatus.left), category: top[0].name, spent: money(top[0].amount) })
                  : t("{month} is {amount} under the budget so far.", { month, amount: money(lastStatus.left) })}
            </span>
          )}
        </Card>
      </div>
    </div>
  );
}
