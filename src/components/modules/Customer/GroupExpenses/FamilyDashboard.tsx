"use client";

import Card from "@/components/smartly/Card";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import type { GroupMember } from "@/lib/customer/api";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { groupMonthOf, type Transfer } from "@/lib/customer/groupDisplay";
import { budgetMonths, budgetTotals, spendByMonthKey, yearMonths } from "@/lib/customer/groupFamily";
import { monthName } from "@/lib/customer/insights";
import { formatDay } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { FamilyMonthOverview } from "./FamilyMonthOverview";
import type { GroupPageData, GroupView } from "./groupTypes";

interface FamilyDashboardProps {
  data: GroupPageData;
  view: GroupView;
  canAdd: boolean;
  onMonth: (key: string) => void;
  onAddExpense: () => void;
  onAddContribution: () => void;
  onRecordPayment: (preset: Transfer | null) => void;
  onStatement: (member: GroupMember) => void;
  busy: boolean;
}

// A family's dashboard (the v16 FamilyDashboard board): the month on show
// with its quick actions, tiles, members' balances, where the money went
// and the newest entries; then the year against the budget, month by month.
export function FamilyDashboard({ data, view, canAdd, onMonth, onAddExpense, onAddContribution, onRecordPayment, onStatement, busy }: FamilyDashboardProps) {
  const { t, fmt } = useLocale();
  const { currency, startDay } = data;
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const currentKey = groupMonthOf(data.today, startDay);
  // The signed-in customer is the group's owner when they own its workspace.
  const me = data.role === "OWNER" ? data.members.find((member) => member.isOwner) : undefined;

  // The year of the month on show, against the budget.
  const yearKey = data.range.key.slice(0, 4);
  const year = budgetMonths(yearMonths(yearKey), data.budgets, spendByMonthKey(data.yearExpenses ?? [], startDay), currentKey);
  const yearTotals = budgetTotals(year);

  const usedTone = (used: number | null) => (used === null ? "text-ink" : used > 100 ? "text-expense" : "text-income");
  const usedText = (used: number | null) => (used === null ? "—" : `${formatCount(Math.round(used), fmt)}%`);

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex justify-end">
        <NativeSelect size="md" aria-label={t("Choose a month")} value={data.range.key} onChange={(event) => onMonth(event.target.value)} className={cn("font-semibold", busy && "opacity-60")}>
          {data.months.map((key) => (
            <option key={key} value={key}>
              {key === currentKey ? t("{month} · Current", { month: monthName(key, fmt, "long", true) }) : monthName(key, fmt, "long", true)}
            </option>
          ))}
        </NativeSelect>
      </div>

      <FamilyMonthOverview data={data} view={view} me={me} canAdd={canAdd} onAddExpense={onAddExpense} onAddContribution={onAddContribution} onRecordPayment={onRecordPayment} onStatement={onStatement} />

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
