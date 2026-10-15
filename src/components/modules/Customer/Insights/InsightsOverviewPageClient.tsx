"use client";

import { ChartColumn, FileText, Landmark, PiggyBank, TrendingDown, TrendingUp, TriangleAlert, Utensils } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AmountText from "@/components/smartly/AmountText";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatCurrency } from "@/lib/customer/currency";
import { INSIGHT_PERIOD_LABELS, INSIGHT_PERIODS, percentChange, type InsightPeriod, type RankedRow } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { InsightsData } from "./insightsTypes";
import { KeptChart } from "./KeptChart";
import { NetWorthCard } from "./NetWorthCard";
import { SavingsRateChart } from "./SavingsRateChart";
import { SayCard } from "./SayCard";

// How the period reads inside a sentence: "Salary is 80% of your income
// this year."
const PERIOD_PHRASE: Record<InsightPeriod, string> = {
  "this-month": "this month",
  "last-month": "last month",
  "last-3-months": "over the last 3 months",
  "this-year": "this year",
};

// Insights: what the numbers say, in plain sentences, for one period --
// the three claims, net worth, the four totals, where money comes from
// and goes, whether more is being kept, and what changed.
export function InsightsOverviewPageClient({ data }: { data: InsightsData }) {
  const { t } = useLocale();
  const router = useRouter();
  const { currency, totals, previous, labels } = data;
  const comparedWith = labels.previousIsYear ? `${t("the same months of")} ${labels.previous}` : labels.previous;
  const topSource = data.sources[0];
  const topSpend = data.spend[0];
  // A rise is only news when there was spending before to rise from.
  const rise = previous.expense > 0 && data.biggestMove && data.biggestMove.change > 0 ? data.biggestMove : null;

  const periodControl = (
    <SegmentedControl
      label={t("Period")}
      variant="pill"
      value={data.period}
      onChange={(period) => router.push(`/reports/overview?period=${period}`)}
      options={INSIGHT_PERIODS.map((period) => ({ value: period, label: t(INSIGHT_PERIOD_LABELS[period]) }))}
      className="max-md:w-full max-md:rounded-md max-md:[&>button]:flex-1 max-md:[&>button]:rounded-sm max-md:[&>button]:px-2"
    />
  );

  return (
    <PageFrame className="gap-4 md:gap-8">
      <PageHeader
        eyebrow={t("Insights")}
        tone="insights"
        title={t("What your numbers say")}
        description={
          <span className="hidden md:inline">
            {labels.period}, {t("compared with")} {comparedWith}.
          </span>
        }
        actions={
          <>
            <span className="hidden md:inline-flex">{periodControl}</span>
            <Button variant="secondary" size="lg" asChild className="hidden md:inline-flex">
              <Link href="/reports/detailed">
                <FileText />
                {t("Detailed reports")}
              </Link>
            </Button>
          </>
        }
      />
      <div className="md:hidden">{periodControl}</div>

      {!data.hasData ? (
        <>
          {(data.worth.have > 0 || data.worth.youOwe > 0) && <NetWorthCard worth={data.worth} currency={currency} />}
          <EmptyState
            icon={<ChartColumn />}
            tone="insights"
            title={t("Nothing to read yet")}
            description={t("After a few transactions, Smartly explains them here.")}
            action={
              <Button asChild>
                <Link href="/transactions">{t("Go to transactions")}</Link>
              </Button>
            }
          />
        </>
      ) : (
        <>
          {/* Phones lead with net worth; desktops with the three sentences. */}
          <div className="md:hidden">
            <NetWorthCard worth={data.worth} currency={currency} />
          </div>

          <section aria-label={t("The short version")} className="grid gap-3 md:grid-cols-3 md:gap-6">
            <SayCard
              icon={<TrendingUp />}
              tone="insights"
              say={
                topSource
                  ? data.concentration
                    ? `${topSource.name} ${t("is more than")} 60% ${t("of your income.")}`
                    : `${topSource.name} ${t("is")} ${Math.round(topSource.share)}% ${t("of your income")} ${t(PERIOD_PHRASE[data.period])}.`
                  : t("No money in yet.")
              }
              why={topSource ? secondSourceLine(data, t) : t("Record an income and this fills in.")}
            />
            <SayCard
              icon={<PiggyBank />}
              tone="money"
              say={totals.rate !== null ? `${t("You kept")} ${totals.rate}% ${t("of what you earned.")}` : t("Nothing earned yet.")}
              why={
                totals.rate !== null
                  ? `${t("That is")} ${formatCurrency(Math.max(0, totals.left), currency)}${previous.rate !== null ? `, ${t(totals.rate >= previous.rate ? "up from" : "down from")} ${previous.rate}% ${labels.previousIsYear ? `${t("in")} ${labels.previous}` : `${t("in")} ${labels.previous}`}` : ""}.`
                  : t("Once money comes in, this shows the share you kept.")
              }
            />
            <SayCard
              icon={<Utensils />}
              tone="loans"
              say={topSpend ? `${topSpend.name} ${t("is your biggest spend.")}` : t("No spending recorded.")}
              why={topSpend ? `${Math.round(topSpend.share)}% ${t("of spending")} · ${formatCurrency(topSpend.amount / data.months, currency)} ${t("a month on average")}.` : t("Your expenses show up here.")}
            />
          </section>

          <div className="hidden md:block">
            <NetWorthCard worth={data.worth} currency={currency} />
          </div>

          <section aria-label={t("Totals")} className="hidden gap-6 md:grid md:grid-cols-4">
            <Kpi label={t("Money in")} value={<AmountText value={totals.income} currency={currency} size="h2" tone="income" signed className="font-bold" />} delta={percentChange(totals.income, previous.income)} good={(d) => d >= 0} vs={labels.before} />
            <Kpi label={t("Money out")} value={<AmountText value={-totals.expense} currency={currency} size="h2" tone="expense" signed className="font-bold" />} delta={percentChange(totals.expense, previous.expense)} good={(d) => d <= 0} vs={labels.before} />
            <Kpi label={t("Left over")} value={<AmountText value={totals.left} currency={currency} size="h2" tone={totals.left < 0 ? "expense" : "neutral"} className="font-bold" />} delta={percentChange(totals.left, previous.left)} good={(d) => d >= 0} vs={labels.before} />
            <Kpi
              label={t("Savings rate")}
              value={<b className="text-h2 text-ink tabular-nums">{totals.rate === null ? "—" : `${totals.rate}%`}</b>}
              delta={totals.rate !== null && previous.rate !== null ? totals.rate - previous.rate : null}
              unit="points"
              good={(d) => d >= 0}
              vs={labels.before}
            />
          </section>

          <div className="hidden gap-6 md:grid md:grid-cols-2">
            <Card padding="lg" className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-h3 text-ink">{t("Where your money comes from")}</h2>
                  <span className="text-small text-ink-muted">
                    {data.sources.length} {t(data.sources.length === 1 ? "income source" : "income sources")} · {formatCurrency(totals.income, currency)}
                  </span>
                </div>
                <Link href="/income-category" className="text-body font-semibold text-emerald hover:text-emerald-hover">
                  {t("Income sources")}
                </Link>
              </div>
              {data.sources.length === 0 ? (
                <p className="text-body text-ink-muted">{t("No money came in")} {t(PERIOD_PHRASE[data.period])}.</p>
              ) : (
                data.sources.map((row) => <SourceRow key={row.name} row={row} currency={currency} />)
              )}
              {data.concentration && (
                <Banner tone="warning" inline icon={<TriangleAlert />}>
                  <b>
                    {data.concentration.name} {t("is more than")} 60% {t("of your income.")}
                  </b>{" "}
                  {secondSourceLine(data, t)}
                </Banner>
              )}
            </Card>

            <Card padding="lg" className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-h3 text-ink">{t("Where it goes")}</h2>
                  <span className="text-small text-ink-muted">
                    {data.spend.length} {t(data.spend.length === 1 ? "category" : "categories")} · {formatCurrency(totals.expense, currency)}
                  </span>
                </div>
                <Link href="/categories" className="text-body font-semibold text-emerald hover:text-emerald-hover">
                  {t("Budget")}
                </Link>
              </div>
              {data.spend.length === 0 ? (
                <p className="text-body text-ink-muted">{t("Nothing went out")} {t(PERIOD_PHRASE[data.period])}.</p>
              ) : (
                <>
                  <div role="img" aria-label={t("Spending split by category")} className="flex h-4 gap-0.5 overflow-hidden rounded-full">
                    {data.spend.map((row) => (
                      <span key={row.name} className={cn("bg-current", categoryTone(row.color).fg)} style={{ width: `${row.share}%` }} />
                    ))}
                  </div>
                  <div className="grid gap-3">
                    {data.spend.map((row) => (
                      <span key={row.name} className="flex items-center gap-3 text-body">
                        <span className={cn("size-2.5 shrink-0 rounded-[3px] bg-current", categoryTone(row.color).fg)} />
                        <span className="flex-1 truncate text-ink">{row.name}</span>
                        <b className="text-ink tabular-nums">{formatCurrency(row.amount, currency)}</b>
                        <span className="w-10 text-right text-ink-muted tabular-nums">{Math.round(row.share)}%</span>
                      </span>
                    ))}
                  </div>
                </>
              )}
              {data.drop ? (
                <Banner tone="mint" inline icon={<TrendingDown />}>
                  <b>
                    {data.drop.name} {t("fell by")} {formatCurrency(-data.drop.change, currency)}
                  </b>{" "}
                  {t("against")} {comparedWith}.
                </Banner>
              ) : (
                rise && (
                  <Banner tone="warning" inline icon={<TrendingUp />}>
                    <b>
                      {rise.name} {t("rose by")} {formatCurrency(rise.change, currency)}
                    </b>{" "}
                    {t("against")} {comparedWith}.
                  </Banner>
                )
              )}
            </Card>
          </div>

          <div className="hidden gap-6 md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <SavingsRateChart rates={data.rates} trend={data.trend} />
            <Card padding="none" className="flex flex-col overflow-hidden">
              <div className="flex flex-col gap-0.5 px-6 pt-6 pb-3">
                <h2 className="text-h3 text-ink">{t("What changed")}</h2>
                <span className="text-small text-ink-muted">
                  {labels.now} {t("against")} {labels.before}
                </span>
              </div>
              <div role="table" aria-label={`${labels.now} ${t("against")} ${labels.before}`}>
                <div role="row" className="grid grid-cols-[minmax(0,1fr)_100px_100px_72px] gap-2 bg-cream px-6 py-3 text-caption font-semibold text-ink-muted">
                  <span role="columnheader" />
                  <span role="columnheader" className="text-right">
                    {labels.before}
                  </span>
                  <span role="columnheader" className="text-right">
                    {labels.now}
                  </span>
                  <span role="columnheader" className="text-right">
                    {t("Change")}
                  </span>
                </div>
                <ChangeRow name={t("Money in")} before={previous.income} now={totals.income} currency={currency} good={(d) => d >= 0} />
                <ChangeRow name={t("Money out")} before={previous.expense} now={totals.expense} currency={currency} good={(d) => d <= 0} />
                <ChangeRow name={t("Left over")} before={previous.left} now={totals.left} currency={currency} good={(d) => d >= 0} />
                {data.biggestMove && <ChangeRow name={data.biggestMove.name} before={data.biggestMove.before} now={data.biggestMove.now} currency={currency} good={(d) => d <= 0} />}
              </div>
              <LoansNote data={data} />
            </Card>
          </div>

          <div className="md:hidden">
            <KeptChart rates={data.rates} currency={currency} />
          </div>
        </>
      )}
    </PageFrame>
  );
}

// "Freelance went from ৳ 8,000 to ৳ 12,000." -- how the runner-up moved,
// or that there is none.
function secondSourceLine(data: InsightsData, t: (key: string) => string): string {
  const second = data.concentration?.second ?? (data.sources[1] ? { name: data.sources[1].name, before: null, now: data.sources[1].amount } : null);
  if (!second) return t("It is your only source so far.");
  if (second.before === null || second.before === 0) return `${second.name} ${t("brought")} ${formatCurrency(second.now, data.currency)}.`;
  return `${second.name} ${t("went from")} ${formatCurrency(second.before, data.currency)} ${t("to")} ${formatCurrency(second.now, data.currency)}.`;
}

function Kpi({ label, value, delta, unit = "percent", good, vs }: { label: string; value: React.ReactNode; delta: number | null; unit?: "percent" | "points"; good: (delta: number) => boolean; vs: string }) {
  const { t } = useLocale();
  return (
    <Card className="flex flex-col gap-2">
      <span className="text-small font-medium text-ink-muted">{label}</span>
      {value}
      <span className="text-caption font-normal text-ink-muted">
        {delta === null ? (
          t("Nothing before to compare with")
        ) : (
          <>
            <b className={good(delta) ? "text-income" : "text-expense"}>
              {delta > 0 ? "↑" : delta < 0 ? "↓" : "="} {unit === "points" ? `${Math.abs(delta)} ${t(Math.abs(delta) === 1 ? "point" : "points")}` : `${Math.abs(delta)}%`}
            </b>{" "}
            {t("vs")} {vs}
          </>
        )}
      </span>
    </Card>
  );
}

function SourceRow({ row, currency }: { row: RankedRow; currency: string }) {
  return (
    <div className="grid grid-cols-[24px_minmax(0,1fr)_110px_56px] items-center gap-3 text-body">
      <span className="text-small font-bold text-ink-muted tabular-nums">{row.rank}</span>
      <span className="flex min-w-0 flex-col gap-2">
        <span className="truncate font-semibold text-ink">{row.name}</span>
        <span className={cn("block h-2 overflow-hidden rounded-full bg-surface-sunken", categoryTone(row.color).fg)}>
          <span className="block h-full rounded-full bg-current" style={{ width: `${row.width}%` }} />
        </span>
      </span>
      <span className="text-right font-semibold text-ink tabular-nums">{formatCurrency(row.amount, currency)}</span>
      <span className="text-right text-ink-muted tabular-nums">{row.share}%</span>
    </div>
  );
}

function ChangeRow({ name, before, now, currency, good }: { name: string; before: number; now: number; currency: string; good: (delta: number) => boolean }) {
  const { t } = useLocale();
  const delta = percentChange(now, before);
  const change = now - before;
  return (
    <div role="row" className="grid min-h-13 grid-cols-[minmax(0,1fr)_100px_100px_72px] items-center gap-2 border-t border-line px-6 text-body tabular-nums">
      <span role="cell" className="truncate font-semibold text-ink">
        {name}
      </span>
      <span role="cell" className="text-right text-ink-muted">
        {formatCurrency(before, currency)}
      </span>
      <span role="cell" className="text-right font-semibold text-ink">
        {formatCurrency(now, currency)}
      </span>
      <span role="cell" className={cn("text-right font-bold", change === 0 ? "text-ink-muted" : good(change) ? "text-income" : "text-expense")}>
        {delta === null ? (change === 0 ? "—" : t("new")) : `${delta > 0 ? "+" : delta < 0 ? "−" : ""} ${Math.abs(delta)}%`}
      </span>
    </div>
  );
}

// The orange note under the changes: what the loans mean for the figures.
function LoansNote({ data }: { data: InsightsData }) {
  const { t } = useLocale();
  const { worth, currency } = data;
  if (worth.youOwe <= 0 && worth.owedToYou <= 0) return null;
  return (
    <div className="mx-6 mt-4 mb-6 flex items-center gap-3 rounded-md bg-pillar-loans-soft p-4 text-small text-pillar-loans">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface">
        <Landmark className="size-4.5" aria-hidden="true" />
      </span>
      <span>
        {worth.youOwe > 0 ? (
          <>
            <b>
              {t("You owe")} {formatCurrency(worth.youOwe, currency)} {t("across")} {data.youOweCount} {t(data.youOweCount === 1 ? "contact" : "contacts")}.
            </b>{" "}
            {t("Clearing it would lift your net worth by the same amount.")}
          </>
        ) : (
          <>
            <b>
              {formatCurrency(worth.owedToYou, currency)} {t("is owed to you.")}
            </b>{" "}
            {t("Collecting it would move that into your wallets.")}
          </>
        )}
      </span>
    </div>
  );
}
