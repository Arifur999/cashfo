"use client";

import { ArrowDownLeft, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Landmark, PiggyBank, Printer, Table2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import PageFrame from "@/components/smartly/PageFrame";
import { type FlowKey, flowBar, flowLines, percentOf, worth, type WorthKey } from "@/components/modules/Customer/Dashboard/dashboardWorth";
import { BOARD_CARD } from "@/components/modules/Customer/Dashboard/DashboardCards";
import { typeLook } from "@/components/modules/Customer/Events/eventVisuals";
import type { ActiveMonth, LoanActivityKind } from "@/lib/customer/api";
import { categoryChartColor } from "@/components/modules/Customer/Dashboard/dashboardFigures";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { type Period, periodHref } from "@/lib/customer/period";
import type { PeriodReport } from "@/lib/customer/periodReport";
import { categoryLabel } from "@/lib/customer/transactionRows";
import { formatDay } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";

export interface ReportsData {
  businessId: string;
  currency: string;
  today: string;
  period: Extract<Period, { kind: "month" | "year" }>;
  label: string;
  // The period before, by name ("September", "2025").
  beforeLabel: string;
  rangeLabel: string;
  activeMonths: ActiveMonth[] | null;
  report: PeriodReport | null;
  categories: { income: CategoryRow[]; expense: CategoryRow[] };
  totals: { income: number; expense: number; incomeBefore: number; expenseBefore: number };
  // The plans' income target and spending budget over the period.
  plan: { target: number | null; budget: number | null };
  // A year's months, each with its plan; null for a month.
  monthRows: { key: string; label: string; income: number; expense: number; target: number | null; budget: number | null; future: boolean }[] | null;
}

interface CategoryRow {
  name: string;
  amount: number;
  color: string | null;
  before: number;
}

const H2 = "text-[17px] leading-[normal] font-semibold tracking-[-0.01em] text-ink";
const SUB = "mt-0.5 text-small leading-[normal] text-ink-muted";
const LINK = "inline-flex items-center gap-1 text-small font-semibold whitespace-nowrap text-emerald hover:underline";
const TH = "grid items-center gap-x-3 border-y border-line-card bg-table-head px-5 py-2 text-caption font-semibold text-ink-muted";
const TR = "grid min-h-11.5 items-center gap-x-3 border-b border-divider px-5 text-body last:border-b-0";
const TILE = "flex min-w-0 flex-col gap-[3px] rounded-[14px] border border-line-card bg-table-head px-3.5 py-3";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function Head({ id, title, sub, href, link, aside }: { id?: string; title: string; sub?: string; href?: string; link?: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className={H2}>
          {title}
        </h2>
        {sub && <p className={SUB}>{sub}</p>}
      </div>
      {aside}
      {href && link && (
        <Link href={href} className={cn(LINK, "print:hidden")}>
          {link}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

// The Reports board: one page for a month or a year of every kind of money
// (Group Expense apart), from the period report, the categories against
// the period before and Budget Planning's plans.
export function ReportsBoard({ data }: { data: ReportsData }) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [isSwitching, startSwitch] = useTransition();
  const money = (value: number) => formatCurrency(value, data.currency, fmt);
  const signed = (value: number) => (value === 0 ? money(0) : formatSignedCurrency(value, data.currency, fmt));
  const percent = (value: number) => toLocaleDigits(`${value}%`, fmt);
  const count = (value: number) => formatCount(value, fmt);
  const current = { year: Number(data.today.slice(0, 4)), month: Number(data.today.slice(5, 7)) };
  const thisMonth: Period = { kind: "month", ...current };
  const isMonth = data.period.kind === "month";
  const go = (next: Period) => startSwitch(() => router.push(periodHref("/reports/detailed", {}, next, thisMonth), { scroll: false }));
  const step = (by: 1 | -1) => {
    const p = data.period;
    if (p.kind === "year") return go({ kind: "year", year: p.year + by });
    const index = p.year * 12 + (p.month - 1) + by;
    go({ kind: "month", year: Math.floor(index / 12), month: (index % 12) + 1 });
  };
  const atLatest = isMonth ? data.period.kind === "month" && data.period.year === current.year && data.period.month === current.month : data.period.year === current.year;
  const years = Array.from(new Set([current.year, ...(data.activeMonths ?? []).map((row) => row.year)]))
    .filter((year) => year <= current.year)
    .sort((a, b) => b - a);
  const report = data.report;
  const income = data.totals.income;
  const expense = data.totals.expense;
  const saved = income - expense;
  const keptRate = income > 0 ? Math.round((saved / income) * 100) : 0;
  const change = (now: number, before: number) => (before ? Math.round(((now - before) / Math.abs(before)) * 1000) / 10 : null);
  const pill = (value: number | null, goodUp: boolean) => {
    if (value === null) return null;
    const good = value === 0 ? null : value > 0 === goodUp;
    return (
      <span className={cn("rounded-full px-1.75 py-0.5 font-semibold tabular-nums", good === null ? "bg-surface-sunken text-ink-soft" : good ? "bg-success-soft text-tint-green-ink" : "bg-expense-soft text-expense")}>
        {`${value > 0 ? "+" : value < 0 ? "–" : ""}${toLocaleDigits(String(Math.abs(value)), fmt)}%`}
      </span>
    );
  };
  const startNet = report ? worth(report.worth.start.parts).net : 0;
  const endNet = report ? worth(report.worth.end.parts).net : 0;
  const sections = [
    ["summary", "Summary"],
    ["targets", "Target and budget"],
    ["worth", "Net worth"],
    ["flow", "Cash flow"],
    ["categories", "Categories"],
    ...(isMonth ? [] : [["months", "Month by month"]]),
    ["savings", "Savings"],
    ["loans", "Loans"],
    ["assets", "Assets"],
    ["events", "Events"],
  ];

  return (
    <PageFrame className="gap-5 leading-[normal]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-page-title text-ink">{t("Reports")}</h1>
          <p className="text-body text-ink-muted">{t("All your money in one place: income, spending, savings, loans, assets and events. Group Expense is kept separate.")}</p>
        </div>
        <div className="flex shrink-0 gap-2.5 print:hidden">
          <Link href="/reports/categories" className="flex h-10.5 items-center gap-2 rounded-full border border-input bg-surface px-4 text-body font-semibold text-ink hover:bg-surface-sunken">
            <Table2 className="size-4 text-ink-soft" aria-hidden="true" />
            {t("Category table")}
          </Link>
          <button type="button" onClick={() => window.print()} className="flex h-10.5 items-center gap-2 rounded-full border border-input bg-surface px-4 text-body font-semibold text-ink hover:bg-surface-sunken">
            <Printer className="size-4 text-ink-soft" aria-hidden="true" />
            {t("Print or save PDF")}
          </button>
        </div>
      </div>

      <section aria-label={t("Choose the report period")} className={cn(BOARD_CARD, "flex flex-col gap-3.5 px-4 py-3.5 print:hidden", isSwitching && "opacity-70")}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div role="radiogroup" aria-label={t("Report type")} className="flex gap-0.5 rounded-full bg-surface-sunken p-1">
            {(["month", "year"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={data.period.kind === kind}
                onClick={() => (kind === "month" ? go({ kind: "month", year: data.period.year, month: data.period.kind === "month" ? data.period.month : data.period.year === current.year ? current.month : 12 }) : go({ kind: "year", year: data.period.year }))}
                className={cn("h-8.5 rounded-full px-4 text-small font-semibold", data.period.kind === kind ? "bg-surface text-emerald shadow-[0_1px_3px_rgba(18,32,29,0.12)]" : "text-ink-soft hover:text-ink")}
              >
                {t(kind === "month" ? "Monthly" : "Yearly")}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => step(-1)} aria-label={t(isMonth ? "Previous month" : "Previous year")} className="flex size-8.5 items-center justify-center rounded-[10px] border border-input bg-surface text-ink-soft hover:bg-surface-sunken">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          {data.period.kind === "month" && (
            <select aria-label={t("Month")} value={data.period.month} onChange={(event) => go({ kind: "month", year: data.period.year, month: Number(event.target.value) })} className="h-10.5 w-35 rounded-[10px] border border-input bg-surface px-3 text-body text-ink">
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1} disabled={data.period.year === current.year && index + 1 > current.month}>
                  {t(name)}
                </option>
              ))}
            </select>
          )}
          <select aria-label={t("Year")} value={data.period.year} onChange={(event) => go(data.period.kind === "month" ? { kind: "month", year: Number(event.target.value), month: Number(event.target.value) === current.year ? Math.min(data.period.month, current.month) : data.period.month } : { kind: "year", year: Number(event.target.value) })} className="h-10.5 w-24 rounded-[10px] border border-input bg-surface px-3 text-body text-ink">
            {years.map((year) => (
              <option key={year} value={year}>
                {toLocaleDigits(String(year), fmt)}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => step(1)} disabled={atLatest} aria-label={t(isMonth ? "Next month" : "Next year")} className="flex size-8.5 items-center justify-center rounded-[10px] border border-input bg-surface text-ink-soft hover:bg-surface-sunken disabled:opacity-40">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          <span className="text-small text-ink-muted">{data.rangeLabel}</span>
        </div>
        <nav aria-label={t("Go to")} className="flex flex-wrap items-center gap-1.5 border-t border-line-card pt-3">
          <span className="mr-1 text-caption text-ink-muted">{t("Go to")}</span>
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="h-8 rounded-full border border-line-card bg-surface px-3 py-1.5 text-small text-ink-2 hover:bg-row-hover">
              {t(label)}
            </a>
          ))}
        </nav>
      </section>

      <p className="hidden text-body text-ink print:block">{`${t("Smartly report")} · ${data.label}`}</p>

      <div id="summary" className="grid scroll-mt-4 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t("Income"), Icon: ArrowDownLeft, tile: "bg-mint-50 text-emerald-fill", value: money(income), tone: "text-emerald-fill", sub: <>{pill(change(income, data.totals.incomeBefore), true)}<span className="truncate">{t("vs {period}", { period: data.beforeLabel })}</span></> },
          { label: t("Expense"), Icon: ArrowUpRight, tile: "bg-expense-soft text-expense-fill", value: money(expense), tone: "text-expense-fill", sub: <>{pill(change(expense, data.totals.expenseBefore), false)}<span className="truncate">{t("vs {period}", { period: data.beforeLabel })}</span></> },
          { label: t("Saved"), Icon: PiggyBank, tile: "bg-warning-soft text-warning", value: signed(saved), tone: saved < 0 ? "text-expense-fill" : "text-ink", sub: <span className="truncate">{income > 0 ? t("Income minus expense · {percent} kept", { percent: percent(keptRate) }) : t("No income recorded")}</span> },
        ].map((card) => (
          <div key={card.label} className={cn(BOARD_CARD, "flex flex-col gap-2 px-4.5 py-4")}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-small font-medium text-ink-muted">{card.label}</span>
              <span className={cn("flex size-7.5 items-center justify-center rounded-[9px]", card.tile)}>
                <card.Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <span className={cn("text-[24px] font-semibold tracking-[-0.02em] whitespace-nowrap tabular-nums", card.tone)}>{card.value}</span>
            <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-muted">{card.sub}</span>
          </div>
        ))}
        <div className="flex flex-col gap-2 rounded-card bg-forest px-4.5 py-4 text-white">
          <div className="flex items-center justify-between gap-2">
            <span className="text-small font-medium text-hero-sage">{t("Net worth")}</span>
            <span className="flex size-7.5 items-center justify-center rounded-[9px] bg-white/12">
              <Landmark className="size-4" aria-hidden="true" />
            </span>
          </div>
          <span className="text-[24px] font-semibold tracking-[-0.02em] whitespace-nowrap tabular-nums">{report ? money(endNet) : "—"}</span>
          {report && (
            <span className="flex items-center gap-1.5 text-[12.5px] text-hero-sage">
              <span className={cn("rounded-full px-1.75 py-0.5 font-semibold tabular-nums", endNet - startNet >= 0 ? "bg-worth-up/18 text-worth-up" : "bg-worth-down/18 text-worth-down")}>{endNet === startNet ? "±0" : signed(endNet - startNet)}</span>
              {t("since {day}", { day: formatDay(report.worth.start.day, "d MMM", fmt) })}
            </span>
          )}
        </div>
      </div>

      <div id="targets" className="grid scroll-mt-4 grid-cols-1 gap-4 lg:grid-cols-2">
        <PlanCard title={t("Income vs target")} sub={t("How much you planned to earn and how much came in")} amountLabel={t("Earned")} planLabel={t("Target")} amount={income} plan={data.plan.target} bar="bg-emerald" amountTone="text-emerald" money={money} percent={percent} good={(left) => left <= 0} lines={(left) => (left > 0 ? t("{amount} short of the target", { amount: money(left) }) : t("{amount} over the target", { amount: money(-left) }))} />
        <PlanCard title={t("Expense vs budget")} sub={t("How much you planned to spend and how much went out")} amountLabel={t("Spent")} planLabel={t("Budget")} amount={expense} plan={data.plan.budget} bar="bg-tint-orange-ink" amountTone="text-expense-fill" money={money} percent={percent} good={(left) => left >= 0} lines={(left) => (left >= 0 ? t("{amount} left in the budget", { amount: money(left) }) : t("{amount} over the budget", { amount: money(-left) }))} />
      </div>

      {report ? (
        <>
          <WorthStatement report={report} label={data.label} money={money} signed={signed} />
          <CashFlow report={report} money={money} signed={signed} />
        </>
      ) : (
        <section className={cn(BOARD_CARD, "px-5.5 py-8 text-center text-body text-ink-muted")}>{t("Couldn't load the rest of the report. Reload the page to try again.")}</section>
      )}

      <div id="categories" className="grid scroll-mt-4 grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryTable title={t("Income by category")} sub={t("Where your money came from")} total={income} totalTone="text-emerald" rows={data.categories.income} beforeLabel={data.beforeLabel} goodUp money={money} percent={percent} />
        <CategoryTable title={t("Expense by category")} sub={t("Where your money went")} total={expense} totalTone="text-expense-fill" rows={data.categories.expense} beforeLabel={data.beforeLabel} goodUp={false} money={money} percent={percent} />
      </div>

      {data.monthRows && (
        <section id="months" aria-labelledby="months-title" className={cn(BOARD_CARD, "scroll-mt-4 overflow-x-auto")}>
          <div className="px-5.5 pt-5 pb-3">
            <Head id="months-title" title={t("Month by month")} sub={t("Income, spending and plan for each month of the year")} />
          </div>
          <div className="min-w-[760px]">
            <div className={cn(TH, "grid-cols-[minmax(0,1fr)_repeat(6,110px)]")}>
              {["Month", "Income", "Expense", "Saved", "Rate", "Target", "Budget"].map((head, index) => (
                <span key={head} className={cn(index > 0 && "text-right")}>
                  {t(head)}
                </span>
              ))}
            </div>
            {[...data.monthRows, null].map((row) => {
              const rows = data.monthRows ?? [];
              const total = row === null;
              const inc = total ? rows.reduce((sum, r) => sum + r.income, 0) : row.income;
              const exp = total ? rows.reduce((sum, r) => sum + r.expense, 0) : row.expense;
              const tgt = total ? rows.reduce((sum, r) => sum + (r.target ?? 0), 0) || null : row.target;
              const bud = total ? rows.reduce((sum, r) => sum + (r.budget ?? 0), 0) || null : row.budget;
              const none = !total && (row.future || (inc === 0 && exp === 0));
              return (
                <div key={row?.key ?? "total"} className={cn(TR, "grid-cols-[minmax(0,1fr)_repeat(6,110px)]", total && "bg-emerald-wash font-semibold", none && "text-ink-faint")}>
                  <span>{total ? t("Total") : row.label}</span>
                  <span className={cn("text-right tabular-nums", !none && "text-emerald")}>{none ? "–" : money(inc)}</span>
                  <span className={cn("text-right tabular-nums", !none && "text-expense-fill")}>{none ? "–" : money(exp)}</span>
                  <span className={cn("text-right tabular-nums", !none && inc - exp < 0 && "text-expense")}>{none ? "–" : signed(inc - exp)}</span>
                  <span className="text-right tabular-nums">{none || !inc ? "–" : percent(Math.round(((inc - exp) / inc) * 100))}</span>
                  <span className="text-right tabular-nums">{tgt ? money(tgt) : "–"}</span>
                  <span className="text-right tabular-nums">{bud ? money(bud) : "–"}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {report && <PeriodParts report={report} label={data.label} money={money} signed={signed} count={count} />}

      <p className="text-center text-caption text-ink-faint">{t("Numbers come from Balance, Income & Expense, Savings Goals, Loans, Assets and Calendar & Events. Group Expense is not counted here.")}</p>
    </PageFrame>
  );
}

function PlanCard({ title, sub, amountLabel, planLabel, amount, plan, bar, amountTone, money, percent, good, lines }: { title: string; sub: string; amountLabel: string; planLabel: string; amount: number; plan: number | null; bar: string; amountTone: string; money: (v: number) => string; percent: (v: number) => string; good: (left: number) => boolean; lines: (left: number) => string }) {
  const { t } = useLocale();
  const rate = percentOf(amount, plan);
  const left = plan === null ? 0 : plan - amount;
  return (
    <section className={cn(BOARD_CARD, "flex flex-col gap-2.5 px-5.5 py-5")}>
      <Head title={title} sub={sub} href="/categories" link={t("Budget Planning")} />
      <div className="flex items-end justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-caption text-ink-muted">{amountLabel}</span>
          <span className={cn("text-[24px] font-semibold whitespace-nowrap tabular-nums", amountTone)}>{money(amount)}</span>
        </span>
        <span className="flex flex-col items-end">
          <span className="text-caption text-ink-muted">{planLabel}</span>
          <span className="text-[17px] font-semibold whitespace-nowrap text-ink tabular-nums">{plan === null ? "–" : money(plan)}</span>
        </span>
      </div>
      <span className="block h-2 overflow-hidden rounded-full bg-line-card">
        <span className={cn("block h-full rounded-full", rate !== null && rate > 100 && !good(left) ? "bg-expense-fill" : bar)} style={{ width: `${Math.min(100, rate ?? 0)}%` }} />
      </span>
      <div className="flex items-center justify-between gap-2 text-small">
        {plan === null ? (
          <span className="text-ink-muted">{t("No plan for this period. Set one in Budget Planning.")}</span>
        ) : (
          <span className={cn("flex items-center gap-1.5 font-medium", good(left) ? "text-tint-green-ink" : "text-tint-orange-ink")}>
            <span className={cn("size-1.5 rounded-full", good(left) ? "bg-tint-green-ink" : "bg-tint-orange-ink")} aria-hidden="true" />
            {lines(left)}
          </span>
        )}
        {rate !== null && <span className="font-semibold text-ink tabular-nums">{percent(rate)}</span>}
      </div>
    </section>
  );
}

const WORTH_ROWS: { key: WorthKey; label: string; dot: string }[] = [
  { key: "cash", label: "Money in your accounts", dot: "bg-emerald" },
  { key: "savings", label: "Savings goals", dot: "bg-cat-11" },
  { key: "assets", label: "Assets", dot: "bg-info" },
  { key: "pawna", label: "Money people owe you (pawna)", dot: "bg-cat-3" },
];

function WorthStatement({ report, label, money, signed }: { report: PeriodReport; label: string; money: (v: number) => string; signed: (v: number) => string }) {
  const { t, fmt } = useLocale();
  const { start, end } = report.worth;
  const day = (value: string) => formatDay(value, "d MMM yyyy", fmt);
  const diff = (a: number, b: number) => (Math.abs(b - a) < 0.005 ? "–" : signed(b - a));
  const diffTone = (a: number, b: number, goodUp = true) => (Math.abs(b - a) < 0.005 ? "text-ink-faint" : b - a > 0 === goodUp ? "text-tint-green-ink" : "text-expense");
  const before = worth(start.parts);
  const after = worth(end.parts);
  const subs: Record<WorthKey, string> = {
    cash: t("{count} accounts: bank, mobile wallet and cash", { count: formatCount(end.counts.accounts, fmt) }),
    savings: t("{count} goals in savings accounts", { count: formatCount(end.counts.goals, fmt) }),
    assets: t("{count} assets at today's value", { count: formatCount(end.counts.assets, fmt) }),
    pawna: t("From {count} people", { count: formatCount(end.counts.pawna, fmt) }),
    dena: t("To {count} lenders", { count: formatCount(end.counts.dena, fmt) }),
  };
  const total = before.own + before.owe + after.own + after.owe > 0 ? after.own + after.owe : 1;
  const COLS = "grid-cols-[minmax(0,1fr)_140px_140px_120px] max-md:grid-cols-[minmax(0,1fr)_110px_110px]";
  const row = (name: string, sub: string | null, dot: string | null, a: number, b: number, goodUp = true, tone?: string) => (
    <div key={name} className={cn("grid min-h-11.5 items-center gap-x-3 border-b border-divider px-5 py-1.5 text-body", COLS)}>
      <span className="flex min-w-0 items-center gap-2.5">
        {dot && <span className={cn("size-2.5 shrink-0 rounded-[3px]", dot)} aria-hidden="true" />}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-ink">{name}</span>
          {sub && <span className="truncate text-[11.5px] text-ink-faint">{sub}</span>}
        </span>
      </span>
      <span className="text-right text-ink-soft tabular-nums">{money(a)}</span>
      <span className={cn("text-right font-medium tabular-nums", tone ?? "text-ink")}>{money(b)}</span>
      <span className={cn("text-right text-small tabular-nums max-md:hidden", diffTone(a, b, goodUp))}>{diff(a, b)}</span>
    </div>
  );
  return (
    <section id="worth" aria-labelledby="worth-title" className={cn(BOARD_CARD, "scroll-mt-4 overflow-hidden")}>
      <div className="flex flex-col gap-3.5 px-5.5 pt-5 pb-3.5">
        <Head
          id="worth-title"
          title={t("Net worth statement")}
          sub={t("What you own and owe at the end of {period}, next to the end of the period before.", { period: label })}
          aside={
            <span className="flex shrink-0 flex-col items-end">
              <span className="text-caption text-ink-muted">{t("Net worth")}</span>
              <span className="text-[24px] font-semibold whitespace-nowrap text-emerald tabular-nums">{money(after.net)}</span>
              <span className={cn("text-caption font-semibold tabular-nums", diffTone(before.net, after.net))}>{t("{amount} since {day}", { amount: diff(before.net, after.net), day: formatDay(start.day, "d MMM", fmt) })}</span>
            </span>
          }
        />
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-line-card">
          {[...WORTH_ROWS.map((item) => ({ key: item.key, dot: item.dot })), { key: "dena" as const, dot: "bg-expense-fill" }].map((item) => (end.parts[item.key] > 0 ? <span key={item.key} className={item.dot} style={{ width: `${Math.max(1.2, (end.parts[item.key] / total) * 100)}%` }} /> : null))}
        </div>
      </div>
      <div className={cn(TH, COLS)}>
        <span>{t("Item")}</span>
        <span className="text-right">{day(start.day)}</span>
        <span className="text-right">{day(end.day)}</span>
        <span className="text-right max-md:hidden">{t("Change")}</span>
      </div>
      <div className="border-b border-divider bg-table-head/50 px-5 py-2 text-caption font-semibold text-ink-muted">{t("What you own")}</div>
      {WORTH_ROWS.map((item) => row(t(item.label), subs[item.key], item.dot, start.parts[item.key], end.parts[item.key]))}
      {row(t("Total you own"), null, null, before.own, after.own)}
      <div className="border-b border-divider bg-table-head/50 px-5 py-2 text-caption font-semibold text-ink-muted">{t("What you owe")}</div>
      {row(t("Loans you must repay (dena)"), subs.dena, "bg-expense-fill", start.parts.dena, end.parts.dena, false)}
      {row(t("Total you owe"), null, null, before.owe, after.owe, false, "text-expense")}
      <div className={cn("grid min-h-12 items-center gap-x-3 bg-emerald-wash px-5 text-body font-semibold", COLS)}>
        <span className="text-ink">{t("Net worth (own minus owe)")}</span>
        <span className="text-right text-ink-soft tabular-nums">{money(before.net)}</span>
        <span className="text-right text-emerald tabular-nums">{money(after.net)}</span>
        <span className={cn("text-right text-small tabular-nums max-md:hidden", diffTone(before.net, after.net))}>{diff(before.net, after.net)}</span>
      </div>
    </section>
  );
}

const FLOW_LABEL: Record<FlowKey, string> = {
  income: "Income",
  expenses: "Expenses",
  savings: "Put into savings goals",
  loans: "Loans (taken, given, paid back)",
  assets: "Assets bought and sold",
  gifts: "Gifts at events",
};

function CashFlow({ report, money, signed }: { report: PeriodReport; money: (v: number) => string; signed: (v: number) => string }) {
  const { t, fmt } = useLocale();
  const flow = report.flow;
  const { lines, net } = flowLines(flow);
  const largest = Math.max(1, ...lines.map((line) => Math.abs(line.value)));
  const subs: Record<FlowKey, string> = {
    income: plural(t, flow.income.count, "{count} entry in Income & Expense", "{count} entries in Income & Expense", undefined, fmt),
    expenses: t("All spending, including bills and zakat"),
    savings: flow.savings.added || flow.savings.takenOut ? (flow.savings.takenOut ? t("Added {added} · took out {out}", { added: money(flow.savings.added), out: money(flow.savings.takenOut) }) : t("Added {added}", { added: money(flow.savings.added) })) : t("Nothing added or taken out"),
    loans: t("Took {took} · gave {gave} · got back {back} · repaid {paid}", { took: money(flow.loans.took), gave: money(flow.loans.gave), back: money(flow.loans.gotBack), paid: money(flow.loans.paidBack) }),
    assets: t("Bought {bought} · sold {sold}", { bought: money(flow.assets.bought), sold: money(flow.assets.sold) }),
    gifts: t("Gave {gave} · received {got}", { gave: money(flow.gifts.gave), got: money(flow.gifts.got) }),
  };
  return (
    <section id="flow" aria-labelledby="flow-title" className={cn(BOARD_CARD, "flex scroll-mt-4 flex-col gap-2.5 px-5.5 py-5")}>
      <Head
        id="flow-title"
        title={t("Cash flow")}
        sub={t("Every kind of money that came in and went out in this period")}
        aside={
          <span className="flex shrink-0 flex-col items-end">
            <span className="text-caption text-ink-muted">{t("Net cash flow")}</span>
            <span className={cn("text-[20px] font-semibold tabular-nums", net < 0 ? "text-expense" : "text-tint-green-ink")}>{signed(net)}</span>
          </span>
        }
      />
      <div className="flex flex-col">
        {lines.map((line) => {
          const bar = flowBar(line.value, largest);
          return (
            <div key={line.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px] items-center gap-x-3.5 border-b border-divider py-2.5 max-sm:grid-cols-[minmax(0,1fr)_100px]">
              <span className="flex min-w-0 flex-col">
                <span className="text-body font-medium text-ink">{t(FLOW_LABEL[line.key])}</span>
                <span className="truncate text-[11.5px] text-ink-faint">{subs[line.key]}</span>
              </span>
              <span className="relative block h-3 max-sm:hidden">
                <span aria-hidden="true" className="absolute -top-1 -bottom-1 left-1/2 w-px bg-input" />
                <span className={cn("absolute inset-y-0 rounded-[4px]", line.value >= 0 ? "bg-chart-savings" : "bg-chart-expense/70")} style={{ left: `${bar.left}%`, width: `${bar.width}%` }} />
              </span>
              <span className={cn("text-right text-body font-semibold whitespace-nowrap tabular-nums", line.value > 0 ? "text-tint-green-ink" : line.value < 0 ? "text-expense" : "text-ink-faint")}>{line.value ? signed(line.value) : "–"}</span>
            </div>
          );
        })}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px] items-center gap-x-3.5 pt-3 max-sm:grid-cols-[minmax(0,1fr)_100px]">
          <span className="text-body font-semibold text-ink">{t("Net cash flow")}</span>
          <span className="text-small text-ink-muted max-sm:hidden">{net > 0 ? t("More money came in than went out") : net < 0 ? t("More money went out than came in") : t("As much came in as went out")}</span>
          <span className={cn("text-right text-[15px] font-semibold tabular-nums", net < 0 ? "text-expense" : "text-tint-green-ink")}>{signed(net)}</span>
        </div>
      </div>
    </section>
  );
}

function CategoryTable({ title, sub, total, totalTone, rows, beforeLabel, goodUp, money, percent }: { title: string; sub: string; total: number; totalTone: string; rows: CategoryRow[]; beforeLabel: string; goodUp: boolean; money: (v: number) => string; percent: (v: number) => string }) {
  const { t, fmt } = useLocale();
  const largest = Math.max(1, ...rows.map((row) => row.amount));
  const COLS = "grid-cols-[minmax(0,1fr)_100px_44px_84px]";
  return (
    <section className={cn(BOARD_CARD, "overflow-hidden")}>
      <div className="px-5.5 pt-5 pb-3">
        <Head title={title} sub={sub} aside={<span className={cn("text-[20px] font-semibold whitespace-nowrap tabular-nums", totalTone)}>{money(total)}</span>} />
      </div>
      <div className={cn(TH, COLS)}>
        <span>{t("Category")}</span>
        <span className="text-right">{t("Amount")}</span>
        <span className="text-right">%</span>
        <span className="truncate text-right">{t("vs {period}", { period: beforeLabel })}</span>
      </div>
      {rows.map((row) => {
        const change = row.before ? Math.round(((row.amount - row.before) / row.before) * 1000) / 10 : null;
        const tone = change === null ? "text-tint-green-ink" : change === 0 ? "text-ink-muted" : change > 0 === goodUp ? "text-tint-green-ink" : "text-expense";
        return (
          <div key={row.name} className={cn(TR, COLS, "py-1.5")}>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: categoryChartColor(row.color) }} aria-hidden="true" />
                <span className="truncate text-ink">{categoryLabel(row.name, t)}</span>
              </span>
              <span className="block h-1 overflow-hidden rounded-full bg-line-card">
                <span className="block h-full rounded-full" style={{ width: `${(row.amount / largest) * 100}%`, background: categoryChartColor(row.color) }} />
              </span>
            </span>
            <span className="text-right font-semibold whitespace-nowrap text-ink tabular-nums">{money(row.amount)}</span>
            <span className="text-right text-small text-ink-faint tabular-nums">{percent(total > 0 ? Math.round((row.amount / total) * 100) : 0)}</span>
            <span className={cn("text-right text-small font-semibold tabular-nums", tone)}>{change === null ? t("New") : `${change > 0 ? "+" : change < 0 ? "–" : ""}${toLocaleDigits(String(Math.abs(change)), fmt)}%`}</span>
          </div>
        );
      })}
      {rows.length === 0 && <p className="px-5 py-6 text-center text-body text-ink-muted">{t("Nothing recorded yet")}</p>}
    </section>
  );
}

const LOAN_KIND: Record<LoanActivityKind, string> = {
  GAVE: "You lent",
  TOOK: "You borrowed",
  GOT_BACK: "Got money back",
  PAID_BACK: "You repaid",
  PROFIT_PAID: "Profit or interest paid",
  PROFIT_RECEIVED: "Profit received",
};

function PeriodParts({ report, label, money, signed, count }: { report: PeriodReport; label: string; money: (v: number) => string; signed: (v: number) => string; count: (v: number) => string }) {
  const { t, fmt } = useLocale();
  const day = (value: string) => formatDay(value, "d MMM", fmt);
  const { savings, loans, assets, events } = report;
  const tile = (title: string, value: string, tone = "text-ink", note?: string) => (
    <div key={title} className={TILE}>
      <span className="truncate text-caption text-ink-muted">{title}</span>
      <span className={cn("text-[17px] font-semibold whitespace-nowrap tabular-nums", tone)}>{value}</span>
      {note && <span className="text-caption text-ink-muted">{note}</span>}
    </div>
  );
  return (
    <>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <section id="savings" aria-labelledby="savings-title" className={cn(BOARD_CARD, "scroll-mt-4 overflow-hidden")}>
          <div className="flex flex-col gap-3.5 px-5.5 pt-5 pb-3.5">
            <Head id="savings-title" title={t("Savings goals")} sub={savings.completed ? t("Money put into your goals in {period} · {count} completed", { period: label, count: count(savings.completed) }) : t("Money put into your goals in {period}", { period: label })} href="/savings-goals/dashboard" link={t("Open")} />
            <div className="grid grid-cols-3 gap-2.5">
              {tile(t("Added"), money(savings.added), "text-tint-green-ink")}
              {tile(t("Taken out"), money(savings.takenOut))}
              {tile(t("Total saved"), money(savings.totalSaved))}
            </div>
          </div>
          <div className={cn(TH, "grid-cols-[minmax(0,1fr)_100px_150px]")}>
            <span>{t("Goal")}</span>
            <span className="text-right">{t("Added")}</span>
            <span className="text-right">{t("Saved / target")}</span>
          </div>
          {savings.goals.map((goal) => {
            const percent = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;
            return (
              <div key={goal.id} className={cn(TR, "grid-cols-[minmax(0,1fr)_100px_150px] py-2")}>
                <span className="flex min-w-0 flex-col gap-1.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-ink">{goal.name}</span>
                    {goal.status === "COMPLETED" && <span className="rounded-full bg-success-soft px-1.75 py-px text-[11px] font-semibold text-tint-green-ink">{t("Completed")}</span>}
                    {goal.status === "PAUSED" && <span className="rounded-full bg-surface-sunken px-1.75 py-px text-[11px] font-semibold text-ink-soft">{t("Paused")}</span>}
                  </span>
                  <span className="block h-1 w-full max-w-50 overflow-hidden rounded-full bg-line-card">
                    <span className={cn("block h-full rounded-full", goal.status === "PAUSED" ? "bg-ink-faint" : goal.status === "COMPLETED" ? "bg-cat-11" : "bg-emerald")} style={{ width: `${percent}%` }} />
                  </span>
                </span>
                <span className={cn("text-right font-semibold tabular-nums", goal.added ? "text-tint-green-ink" : "text-ink-faint")}>{goal.added ? signed(goal.added) : "–"}</span>
                <span className="text-right text-small whitespace-nowrap text-ink-soft tabular-nums">
                  {money(goal.saved)} / {money(goal.target)}
                </span>
              </div>
            );
          })}
          {savings.goals.length === 0 && <p className="px-5 py-6 text-center text-body text-ink-muted">{t("No goals yet")}</p>}
        </section>

        <section id="loans" aria-labelledby="loans-title" className={cn(BOARD_CARD, "scroll-mt-4 overflow-hidden")}>
          <div className="flex flex-col gap-3 px-5.5 pt-5 pb-3.5">
            <Head id="loans-title" title={t("Loans")} sub={t("Money you lent and borrowed")} href="/loan-management/dashboard" link={t("Open")} />
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex min-w-0 flex-col gap-[3px] rounded-[14px] border border-success-soft bg-note-green px-3.5 py-3">
                <span className="truncate text-caption text-tint-green-ink">{t("People owe you (pawna)")}</span>
                <span className="text-[17px] font-semibold text-tint-green-ink tabular-nums">{money(report.worth.end.parts.pawna)}</span>
                <span className="text-caption text-tint-green-ink/80">{t("from {count} people at the end", { count: count(report.worth.end.counts.pawna) })}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-[3px] rounded-[14px] border border-expense-soft bg-expense-soft/40 px-3.5 py-3">
                <span className="truncate text-caption text-expense">{t("You owe (dena)")}</span>
                <span className="text-[17px] font-semibold text-expense tabular-nums">{money(report.worth.end.parts.dena)}</span>
                <span className="text-caption text-expense/80">{t("to {count} lenders at the end", { count: count(report.worth.end.counts.dena) })}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {tile(t("You lent"), money(loans.lent))}
              {tile(t("You borrowed"), money(loans.borrowed))}
              {tile(t("Got money back"), money(loans.gotBack))}
              {tile(t("You repaid"), money(loans.repaid))}
              {tile(t("Profit or interest paid"), money(loans.profitPaid))}
              {tile(t("Profit received"), money(loans.profitReceived))}
            </div>
          </div>
          <div className={cn(TH, "grid-cols-[64px_minmax(0,1fr)_110px]")}>
            <span>{t("Date")}</span>
            <span>{t("Entry")}</span>
            <span className="text-right">{t("Amount")}</span>
          </div>
          {loans.entries.slice(0, 8).map((entry, index) => {
            const out = entry.kind === "GAVE" || entry.kind === "PAID_BACK" || entry.kind === "PROFIT_PAID";
            return (
              <div key={`${entry.date}:${entry.contactId}:${index}`} className={cn(TR, "grid-cols-[64px_minmax(0,1fr)_110px] py-1.5")}>
                <span className="text-small text-ink-muted">{day(entry.date)}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-ink">{entry.name}</span>
                  <span className="text-[11.5px] text-ink-faint">{t(LOAN_KIND[entry.kind])}</span>
                </span>
                <span className={cn("text-right font-semibold tabular-nums", out ? "text-expense" : "text-tint-green-ink")}>{signed(out ? -entry.amount : entry.amount)}</span>
              </div>
            );
          })}
          {loans.entries.length === 0 && <p className="px-5 py-6 text-center text-body text-ink-muted">{t("No loan entries in {period}", { period: label })}</p>}
        </section>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <section id="assets" aria-labelledby="assets-title" className={cn(BOARD_CARD, "scroll-mt-4 overflow-hidden")}>
          <div className="flex flex-col gap-3.5 px-5.5 pt-5 pb-3.5">
            <Head id="assets-title" title={t("Assets")} sub={t("What you bought and sold")} href="/assets-management/dashboard" link={t("Open")} />
            <div className="grid grid-cols-3 gap-2.5">
              {tile(t("Bought"), money(assets.bought.amount), "text-ink", t("{count} items", { count: count(assets.bought.count) }))}
              {tile(t("Sold"), money(assets.sold.amount), "text-ink", t("{count} items", { count: count(assets.sold.count) }))}
              {tile(t("Value at the end"), money(assets.valueEnd), "text-tint-blue-ink", t("{count} assets", { count: count(assets.countEnd) }))}
            </div>
          </div>
          <div className={cn(TH, "grid-cols-[64px_minmax(0,1fr)_110px]")}>
            <span>{t("Date")}</span>
            <span>{t("Asset")}</span>
            <span className="text-right">{t("Amount")}</span>
          </div>
          {assets.entries.map((entry) => (
            <div key={`${entry.kind}:${entry.assetId}`} className={cn(TR, "grid-cols-[64px_minmax(0,1fr)_110px] py-1.5")}>
              <span className="text-small text-ink-muted">{day(entry.date)}</span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-ink">{entry.name}</span>
                <span className="text-[11.5px] text-ink-faint">{t(entry.kind === "BOUGHT" ? "Bought" : "Sold")}</span>
              </span>
              <span className={cn("text-right font-semibold tabular-nums", entry.kind === "BOUGHT" ? "text-expense" : "text-tint-green-ink")}>{signed(entry.kind === "BOUGHT" ? -entry.amount : entry.amount)}</span>
            </div>
          ))}
          {assets.entries.length === 0 && <p className="px-5 py-6 text-center text-body text-ink-muted">{t("Nothing bought or sold in {period}", { period: label })}</p>}
        </section>

        <section id="events" aria-labelledby="events-title" className={cn(BOARD_CARD, "scroll-mt-4 overflow-hidden")}>
          <div className="flex flex-col gap-3.5 px-5.5 pt-5 pb-3.5">
            <Head id="events-title" title={t("Calendar & Events")} sub={t("Weddings, aqiqah, birthdays and the gifts that went with them")} href="/events" link={t("Open")} />
            <div className="grid grid-cols-3 gap-2.5">
              {tile(t("Events"), count(events.count))}
              {tile(t("Gifts given"), money(events.given), "text-expense")}
              {tile(t("Gifts received"), money(events.received), "text-tint-green-ink")}
            </div>
          </div>
          <div className={cn(TH, "grid-cols-[64px_minmax(0,1fr)_auto]")}>
            <span>{t("Date")}</span>
            <span>{t("Event")}</span>
            <span className="text-right">{t("Gifts")}</span>
          </div>
          {events.list.map((event) => {
            const look = typeLook(event.type);
            return (
              <div key={event.id} className={cn(TR, "grid-cols-[64px_minmax(0,1fr)_auto] py-1.5")}>
                <span className="text-small text-ink-muted">{day(event.date)}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-ink">{event.title}</span>
                  <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-ink-faint">
                    <span className={cn("rounded-full px-1.75 py-px text-[11px] font-semibold", look.bg, look.fg)}>{t(look.label)}</span>
                    <span className="truncate">{[event.time, event.place].filter(Boolean).join(" · ")}</span>
                  </span>
                </span>
                <span className="flex flex-col items-end text-small font-semibold tabular-nums">
                  {event.gave > 0 && <span className="text-expense">{t("Gave {amount}", { amount: money(event.gave) })}</span>}
                  {event.got > 0 && <span className="text-tint-green-ink">{t("Got {amount}", { amount: money(event.got) })}</span>}
                  {event.gave === 0 && event.got === 0 && <span className="font-normal text-ink-faint">{event.date >= report.dateFrom && event.date > new Date().toISOString().slice(0, 10) ? t("Coming up") : "–"}</span>}
                </span>
              </div>
            );
          })}
          {events.list.length === 0 && <p className="px-5 py-6 text-center text-body text-ink-muted">{t("No events in {period}", { period: label })}</p>}
        </section>
      </div>
    </>
  );
}
