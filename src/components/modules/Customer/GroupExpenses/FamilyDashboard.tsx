"use client";

import { CalendarCheck, CircleCheckBig } from "lucide-react";
import Link from "next/link";
import Banner from "@/components/smartly/Banner";
import Card from "@/components/smartly/Card";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowButton, ListTotalRow } from "@/components/smartly/list";
import type { GroupExpenseCategoryOption, GroupMember } from "@/lib/customer/api";
import { currencySymbol, formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { groupMonthOf, groupTabHref, paidIn, shortName, unclosedPreviousMonth } from "@/lib/customer/groupDisplay";
import { accountantsOf, budgetMonths, budgetTotals, categoryRows, costShares, isAccountant, mainAccountantId, spendByMonthKey, yearMonths } from "@/lib/customer/groupFamily";
import { type GroupPeriod, monthsIn, periodLabel } from "@/lib/customer/groupPeriod";
import { monthName } from "@/lib/customer/insights";
import { formatDay } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BalanceCell, CategoryTile, categoryBarClass, MemberAvatar } from "./GroupBits";
import { GroupPeriodPicker } from "./GroupPeriodPicker";
import type { GroupPageData, GroupView } from "./groupTypes";

const PERIODS = ["month", "year", "custom"] as const;

// A category's rule as the chart's tag writes it.
export function ruleWord(option: GroupExpenseCategoryOption | undefined): string {
  if (!option) return "equally";
  if (option.defaultSplit === "SHARES") return "by cost split";
  if (option.defaultSplit === "MEALS") return "by meals";
  if (option.defaultSplit === "EXACT") return "exact amounts";
  return option.defaultMemberIds?.length ? "only selected" : "equally";
}

const COLUMNS = "md:grid-cols-[minmax(0,1fr)_132px_104px_178px]";

interface FamilyDashboardProps {
  data: GroupPageData;
  view: GroupView;
  onPeriod: (period: GroupPeriod) => void;
  onStatement: (member: GroupMember) => void;
  busy: boolean;
}

// A family's dashboard (the v7 FamilyDashboard board): spending by category
// for the period with its budget, the year against the budget month by
// month, and this month's balances. A finished month that was never closed
// asks to be closed first.
export function FamilyDashboard({ data, view, onPeriod, onStatement, busy }: FamilyDashboardProps) {
  const { t, fmt } = useLocale();
  const { currency, settlement, startDay } = data;
  const period = data.period ?? { kind: "month" };
  const span = data.periodRange ?? data.range;
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const currentKey = groupMonthOf(data.today, startDay);
  const expenses = data.periodExpenses ?? data.expenses;
  const label = periodLabel(period, data.today, startDay, t, fmt);

  // Category-wise spending, against the budgets of the period's months.
  const rows = categoryRows(expenses, data.categories);
  const spent = rows.reduce((sum, row) => sum + row.amount, 0);
  const biggest = Math.max(...rows.map((row) => row.amount), 0);
  const periodMonths = budgetMonths(monthsIn(span, startDay), data.budgets, spendByMonthKey(expenses, startDay), currentKey);
  const periodBudget = budgetTotals(periodMonths);

  // The year against the budget.
  const yearKey = span.to.slice(0, 4) > currentKey.slice(0, 4) ? currentKey.slice(0, 4) : groupMonthOf(span.to, startDay).slice(0, 4);
  const year = budgetMonths(yearMonths(yearKey), data.budgets, spendByMonthKey(data.yearExpenses ?? [], startDay), currentKey);
  const yearTotals = budgetTotals(year);

  // This month's balances.
  const holderId = mainAccountantId(data.settings, data.members);
  const accountants = accountantsOf(data.members);
  const shares = costShares(data.members, data.settings);
  const balanceRows = settlement.members.map((row) => ({ row, member: view.memberById[row.groupMemberId] }));
  const totalPaid = balanceRows.reduce((sum, r) => sum + paidIn(r.row), 0);
  const totalCost = balanceRows.reduce((sum, r) => sum + Number(r.row.share), 0);
  const holder = holderId ? view.memberById[holderId] : undefined;
  const unclosed = unclosedPreviousMonth(data.history, data.members, data.range);
  // A month before left open keeps part of the cash out of this month's balances.
  const cashRows = settlement.accountantCash ?? [];
  const checksOut = cashRows.length === 0 || Math.abs(cashRows.reduce((sum, row) => sum + Number(row.cash), 0) - view.cash) < 0.005;
  const thisMonth = monthName(data.range.key, fmt, "long", true);

  const usedTone = (used: number | null) => (used === null ? "text-ink" : used > 100 ? "text-expense" : "text-income");
  const usedText = (used: number | null) => (used === null ? "—" : `${formatCount(Math.round(used), fmt)}%`);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <GroupPeriodPicker value={period} options={PERIODS} today={data.today} startDay={startDay} onChange={onPeriod} busy={busy} />
      </div>

      {unclosed && unclosed.to < data.today && (
        <Banner tone="warning" icon={<CalendarCheck />}>
          <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span>{t("{month} has ended. Check the balances and close it to lock the numbers.", { month: monthName(unclosed.key, fmt, "long", true) })}</span>
            <Link href={groupTabHref(data.businessId, "settlement", { month: unclosed.key })} className="font-semibold text-warning-ink underline underline-offset-2">
              {t("Review and close")}
            </Link>
          </span>
        </Banner>
      )}

      <Card padding="none" className="flex min-w-0 flex-col gap-5 px-5 py-4.5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 id="fc-title" className="text-title font-semibold text-ink">
              {t("Category-wise spending")}
            </h2>
            <p className="text-small text-ink-muted">{t("{period} · highest first", { period: label })}</p>
          </div>
          <dl className="flex gap-5">
            <Stat label={t("Total budget")} value={periodBudget.withBudget > 0 ? money(periodBudget.budget) : t("Not set")} />
            <Stat label={t("Spent")} value={money(spent)} />
            <Stat label={t("Budget used")} value={usedText(periodBudget.used)} tone={usedTone(periodBudget.used)} />
          </dl>
        </div>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-small text-ink-muted">{t("No categories yet.")}</p>
        ) : (
          <div role="list" aria-labelledby="fc-title" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {rows.map((row) => {
              const rule = ruleWord(row.option);
              const height = biggest > 0 ? Math.max(row.amount > 0 ? 4 : 0, (row.amount / biggest) * 100) : 0;
              return (
                <div key={row.name} role="listitem" className="flex min-w-24 flex-1 flex-col items-center gap-2">
                  <span className="text-[13px] font-bold whitespace-nowrap text-ink tabular-nums">{money(row.amount)}</span>
                  <span className="flex h-36 w-full max-w-18 items-end overflow-hidden rounded-lg bg-surface-sunken">
                    <span className={cn("w-full rounded-lg bg-current", categoryBarClass(row.name, data.categories))} style={{ height: `${height}%` }} />
                  </span>
                  <span className="flex flex-col items-center gap-1 text-center">
                    <CategoryTile name={row.name} categories={data.categories} size={28} />
                    <span className="line-clamp-2 text-caption font-semibold text-ink">{row.name}</span>
                    <span className="flex flex-wrap items-center justify-center gap-1 text-[11px] text-ink-muted">
                      <span className={cn("rounded-full px-1.5 py-px font-medium", rule === "by cost split" ? "bg-pillar-insights-soft text-pillar-insights" : "bg-surface-sunken text-ink-2")}>{t(rule)}</span>
                      <span className="tabular-nums">{formatCount(Math.round(row.share), fmt)}%</span>
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card padding="none" className="flex min-w-0 flex-col gap-4 px-5 py-4.5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-title font-semibold text-ink">{t("{year} against the budget", { year: toLocaleDigits(yearKey, fmt) })}</h2>
            <p className="text-small text-ink-muted">{t("Monthly spending, January to December")}</p>
          </div>
          <dl className="flex gap-5">
            <Stat label={t("Total budget")} value={yearTotals.withBudget > 0 ? money(yearTotals.budget) : t("Not set")} />
            <Stat label={t("Spent")} value={money(year.reduce((sum, m) => sum + m.spent, 0))} />
            <Stat label={t("Budget used")} value={usedText(yearTotals.used)} tone={usedTone(yearTotals.used)} />
          </dl>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-caption text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-emerald" />
            {t("Spent")}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-warning-fill" />
            {t("Budget")}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.25 rounded-full bg-expense-fill" />
            {t("Over budget")}
          </span>
        </div>
        {yearChart(year, currency, yearKey)}
        <div className="-mx-5 overflow-x-auto px-5">
          <div role="table" aria-label={t("Budget and spending by month")} className="min-w-190 text-caption tabular-nums">
            <div role="row" className="grid grid-cols-[64px_repeat(12,minmax(0,1fr))] border-b border-line pb-1.5 font-semibold text-ink-muted">
              <span role="columnheader" />
              {year.map((m) => (
                <span key={m.key} role="columnheader" className={cn("text-right", m.current && "text-emerald")}>
                  {formatDay(`${m.key}-01`, "MMM", fmt)}
                </span>
              ))}
            </div>
            {(["budget", "spent", "result"] as const).map((line) => (
              <div key={line} role="row" className="grid grid-cols-[64px_repeat(12,minmax(0,1fr))] items-center border-b border-line py-1.5 last:border-b-0">
                <span role="rowheader" className="font-semibold text-ink-2">
                  {t(line === "budget" ? "Budget" : line === "spent" ? "Spent" : "Result")}
                </span>
                {year.map((m) => (
                  <span key={m.key} role="cell" className="text-right">
                    {line === "budget" ? (
                      m.budget !== null ? money(m.budget) : m.future ? "—" : <span className="text-ink-faint">{t("Not set")}</span>
                    ) : line === "spent" ? (
                      m.future ? "—" : money(m.spent)
                    ) : m.future ? (
                      "—"
                    ) : m.result.kind === "over" ? (
                      <span className="rounded-full bg-expense-soft px-1.5 py-px font-semibold whitespace-nowrap text-expense">{t("{amount} over", { amount: money(m.result.amount) })}</span>
                    ) : m.result.kind === "left" ? (
                      m.current ? (
                        <span className="text-ink-muted">{t("Running")}</span>
                      ) : (
                        <span className="rounded-full bg-income-soft px-1.5 py-px font-semibold whitespace-nowrap text-income">{t("{amount} left", { amount: money(m.result.amount) })}</span>
                      )
                    ) : m.result.kind === "running" ? (
                      <span className="text-ink-muted">{t("Running")}</span>
                    ) : (
                      "—"
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="text-small text-ink-muted">{yearNote(year, yearTotals, t, fmt, money)}</p>
      </Card>

      <ListCard
        label={t("Balances · {month}", { month: thisMonth })}
        className="min-w-0"
        header={
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 md:px-5">
            <h2 className="text-title font-semibold text-ink">{t("Balances · {month}", { month: thisMonth })}</h2>
            <Link href={groupTabHref(data.businessId, "settlement")} className="text-small font-semibold text-emerald hover:text-emerald-hover">
              {t("Open settlement")}
            </Link>
          </div>
        }
        footer={
          balanceRows.length > 0 && (
            <ListFooter className="flex-row items-center gap-2 py-2.5 text-[12.5px] text-ink-soft md:px-5">
              <CircleCheckBig className="size-3.5 shrink-0 text-emerald" strokeWidth={2.5} aria-hidden="true" />
              <span>
                {!checksOut
                  ? t("Balances add up to {amount}. Months left open keep the difference until they are closed.", { amount: formatSignedCurrency(view.cash, currency, fmt) })
                  : accountants.length > 1
                  ? t("Balances add up to {cash}, the cash the accountants are holding. The account checks out.", { cash: money(view.cash) })
                  : holder
                    ? t("Balances add up to {cash}, the cash {name} is holding. The account checks out.", { cash: money(view.cash), name: shortName(holder.name) })
                    : t("Balances add up to {cash}, the cash in hand. The account checks out.", { cash: money(view.cash) })}
              </span>
            </ListFooter>
          )
        }
      >
        <ListHead columns={COLUMNS} className="h-8.5 gap-x-3.5 border-t md:px-5">
          <ListHeadCell>{t("Member")}</ListHeadCell>
          <ListHeadCell align="end">{t("Paid in")}</ListHeadCell>
          <ListHeadCell align="end">{t("Cost")}</ListHeadCell>
          <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
        </ListHead>
        {balanceRows.length === 0 && <ListEmpty title={t("Add members to see their balances.")} />}
        {balanceRows.map(({ row, member }) => {
          const own = Number(row.pocketPaid);
          const role = member && isAccountant(member) ? t("Accountant") : t("Member");
          const share = shares[row.groupMemberId];
          const how =
            data.settings.costSplit === "CUSTOM" && share !== undefined
              ? t("{percent}% share {amount}", { percent: formatCount(Math.round(share * 10) / 10, fmt), amount: money(row.share) })
              : t("equal share {amount}", { amount: money(row.share) });
          return (
            <ListRow key={row.groupMemberId} columns={COLUMNS} density="relaxed" className="gap-x-3.5 text-body tabular-nums md:px-5 md:py-1.5">
              <ListCell className="flex items-center gap-2.5">
                <MemberAvatar member={member ?? { id: row.groupMemberId, name: row.name, photoUrl: null }} members={data.members} size={34} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  {member ? (
                    <ListRowButton onClick={() => onStatement(member)} aria-label={t("{name}'s statement", { name: row.name })} className="truncate font-semibold text-ink">
                      {row.name}
                    </ListRowButton>
                  ) : (
                    <span className="truncate font-semibold text-ink">{row.name}</span>
                  )}
                  <span className="truncate text-caption font-normal text-ink-muted md:hidden">{t("{paid} paid in · {cost} cost", { paid: money(paidIn(row)), cost: money(row.share) })}</span>
                  <span className="hidden truncate text-caption font-normal text-ink-muted md:block">{`${role} · ${how}`}</span>
                </span>
              </ListCell>
              <ListCell align="end" className="hidden md:block">
                <span className="flex flex-col items-end gap-px">
                  <span>{money(paidIn(row))}</span>
                  <span className="text-[11.5px] whitespace-nowrap text-ink-muted">{own > 0 ? t("incl. {amount} own pocket", { amount: money(own) }) : t("contributions")}</span>
                </span>
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
        {balanceRows.length > 0 && (
          <ListTotalRow columns={COLUMNS} className="min-h-12.5 gap-x-3.5 tabular-nums md:px-5">
            <span role="cell">{t("Total")}</span>
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
    </div>
  );

  function yearChart(months: ReturnType<typeof budgetMonths>, code: string, key: string) {
    const W = 1000;
    const H = 200;
    const top = 24;
    const bottom = 16;
    // From the first month with spending or a budget: the months before the
    // group began are left off the line.
    const start = months.findIndex((m) => m.spent > 0 || m.budget !== null);
    const shown = start < 0 ? [] : months.slice(start).filter((m) => !m.future);
    const peak = Math.max(...months.map((m) => Math.max(m.future ? 0 : m.spent, m.budget ?? 0)), 1);
    const step = niceStep(peak / 4);
    const max = step * 4;
    const x = (i: number) => 30 + (i * (W - 60)) / 11;
    const y = (value: number) => top + (1 - value / max) * (H - top - bottom);
    const line = shown.map((m, i) => `${i === 0 ? "M" : "L"}${x(i + start)},${y(m.spent)}`).join(" ");
    const area = shown.length > 0 ? `${line} L${x(start + shown.length - 1)},${y(0)} L${x(start)},${y(0)} Z` : "";
    // The budget line joins the months that have one.
    const budgetPath = months
      .map((m, i) => (m.budget === null ? null : { i, v: m.budget }))
      .reduce<string[]>((parts, point, i, all) => {
        if (!point) return parts;
        const joined = i > 0 && all[i - 1] !== null;
        return [...parts, `${joined ? "L" : "M"}${x(point.i)},${y(point.v)}`];
      }, [])
      .join(" ");
    const symbol = currencySymbol(code, fmt);
    const short = (value: number) => `${symbol} ${toLocaleDigits(value >= 1000 ? `${Math.round(value / 1000)}k` : String(Math.round(value)), fmt)}`;
    const budgets = [...new Set(months.map((m) => m.budget).filter((b): b is number => b !== null))];
    const aria = budgets.length === 1 ? t("Monthly spending in {year} against a {amount} monthly budget", { year: toLocaleDigits(key, fmt), amount: money(budgets[0]) }) : t("Monthly spending in {year} against the budget", { year: toLocaleDigits(key, fmt) });
    return (
      <div role="img" aria-label={aria} className="relative w-full">
        <svg viewBox={`0 0 ${W} ${H + 18}`} className="h-auto w-full overflow-visible" preserveAspectRatio="none">
          {[0, 1, 2, 3, 4].map((g) => (
            <g key={g}>
              <line x1={30} x2={W - 30} y1={y(step * g)} y2={y(step * g)} stroke="var(--chart-grid)" strokeWidth={1} />
              <text x={0} y={y(step * g) + 4} fontSize={11} fill="var(--ink-faint)">
                {g === 0 ? toLocaleDigits("0", fmt) : toLocaleDigits(`${Math.round((step * g) / 1000)}k`, fmt)}
              </text>
            </g>
          ))}
          {area && <path d={area} fill="var(--emerald)" opacity={0.08} />}
          {budgetPath && <path d={budgetPath} fill="none" stroke="var(--warning-fill)" strokeWidth={2} strokeDasharray="6 5" />}
          {line && <path d={line} fill="none" stroke="var(--emerald)" strokeWidth={2.5} strokeLinejoin="round" />}
          {shown.map((m, i) => {
            const over = m.budget !== null && m.spent > m.budget;
            return (
              <g key={m.key}>
                <circle cx={x(i + start)} cy={y(m.spent)} r={m.current ? 5.5 : 4.5} fill={m.current ? "var(--surface)" : over ? "var(--expense-fill)" : "var(--emerald)"} stroke={m.current ? "var(--emerald)" : "none"} strokeWidth={m.current ? 2.5 : 0} />
                {m.spent > 0 && (
                  <text x={x(i + start)} y={y(m.spent) - 10} fontSize={11} fontWeight={600} textAnchor="middle" fill={over ? "var(--expense)" : "var(--ink-muted)"}>
                    {short(m.spent)}
                  </text>
                )}
              </g>
            );
          })}
          {months.map((m, i) => (
            <text key={m.key} x={x(i)} y={H + 14} fontSize={11} textAnchor="middle" fill={m.current ? "var(--emerald)" : "var(--ink-faint)"}>
              {formatDay(`${m.key}-01`, "MMM", fmt)}
            </text>
          ))}
        </svg>
      </div>
    );
  }
}

// The chart's grid: a round step (1k, 2k, 5k, 10k, 20k…) that fits the peak.
function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const scaled = raw / power;
  return (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * power;
}

// "Budget set for 9 months (৳ 65,000 each). Used 102% across those months.
// October is running, ৳ 18,450 so far, no budget set yet."
function yearNote(year: ReturnType<typeof budgetMonths>, totals: ReturnType<typeof budgetTotals>, t: ReturnType<typeof useLocale>["t"], fmt: ReturnType<typeof useLocale>["fmt"], money: (value: number) => string): string {
  const parts: string[] = [];
  const amounts = [...new Set(year.filter((m) => m.budget !== null && !m.future).map((m) => m.budget))];
  if (totals.withBudget === 0) parts.push(t("No budget set this year yet."));
  else {
    parts.push(
      amounts.length === 1
        ? t("Budget set for {count} months ({amount} each).", { count: formatCount(totals.withBudget, fmt), amount: money(amounts[0] ?? 0) })
        : t("Budget set for {count} months.", { count: formatCount(totals.withBudget, fmt) }),
    );
    if (totals.used !== null) parts.push(t("Used {percent}% across those months.", { percent: formatCount(Math.round(totals.used), fmt) }));
  }
  const current = year.find((m) => m.current);
  if (current) {
    const month = formatDay(`${current.key}-01`, "MMMM", fmt);
    parts.push(
      current.budget === null
        ? t("{month} is running, {amount} so far, no budget set yet.", { month, amount: money(current.spent) })
        : t("{month} is running, {amount} of {budget} so far.", { month, amount: money(current.spent), budget: money(current.budget) }),
    );
  }
  return parts.join(" ");
}

function Stat({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className={cn("text-body-lg font-bold tabular-nums", tone)}>{value}</dd>
    </div>
  );
}
