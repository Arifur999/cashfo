"use client";

import { ChartColumn, FileText, PiggyBank, ShoppingBag, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import AmountText from "@/components/smartly/AmountText";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import KpiTile from "@/components/smartly/KpiTile";
import { ListCard, ListCell, ListHead, ListHeadCell, ListRow } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { Tone } from "@/components/smartly/tones";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { INSIGHT_PERIOD_LABELS, INSIGHT_PERIODS, monthlyAverage, movement, percentLabel, type InsightPeriod, type Movement, type RankedRow } from "@/lib/customer/insights";
import { fillNodes } from "@/lib/i18n/fill";
import { type Locale, useLocale } from "@/lib/i18n/LocaleProvider";
import { plural, type Translate } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import type { InsightsData } from "./insightsTypes";
import { useInsightsSlots } from "./InsightsSlots";
import { KeptChart } from "./KeptChart";
import { SavingsRateChart } from "./SavingsRateChart";
import { SayCard } from "./SayCard";

// The phone board's period switch, with "Last month" too, so a link to it
// still shows a pressed segment. The group scrolls sideways rather than
// the page should a narrow phone not fit all four, and its segments grow
// to 44px under a finger.
const PHONE_PERIODS: [InsightPeriod, string][] = [
  ["this-month", "This month"],
  ["last-month", "Last month"],
  ["last-3-months", "3 months"],
  ["this-year", "This year"],
];

// How the period reads inside a sentence: "Salary is 80% of your income
// this year."
const PERIOD_PHRASE: Record<InsightPeriod, string> = {
  "this-month": "this month",
  "last-month": "last month",
  "last-3-months": "over the last 3 months",
  "this-year": "this year",
};

// What Changed's rows share the table's columns, so the figure columns
// size to the widest figure and the names keep the rest.
const CHANGE_ROW = "col-span-full grid-cols-subgrid";

// Insights: what the numbers say, in plain sentences, for one period --
// the three claims, net worth, the four totals, where money comes from
// and goes, whether more is being kept, and what changed.
export function InsightsOverviewPageClient({ data }: { data: InsightsData }) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const { netWorth, loansNote } = useInsightsSlots();
  const [isPending, startTransition] = useTransition();
  // The switch moves at once; the figures follow when the new period's
  // render arrives, dimmed until then.
  const [period, setPeriod] = useOptimistic(data.period);
  const { currency, totals, previous, labels } = data;
  const when = t(PERIOD_PHRASE[data.period]);
  const topSource = data.sources[0];
  const topSpend = data.spend[0];
  // A rise is only news when there was spending before to rise from.
  const rise = previous.expense > 0 && data.biggestMove && data.biggestMove.change > 0 ? data.biggestMove : null;
  const reportsHref = `/reports/detailed?period=${period}`;
  const hadBefore = previous.income > 0 || previous.expense > 0;
  const kept = keptSay(data, when, t, locale);

  function goToPeriod(next: InsightPeriod) {
    startTransition(() => {
      setPeriod(next);
      router.push(`/reports/overview?period=${next}`);
    });
  }

  // The transactions behind a figure: one category, this period.
  const transactionsHref = (type: "INCOME" | "EXPENSE", categoryId: string) =>
    `/transactions?${new URLSearchParams({ type, categoryId, dateFrom: data.range.dateFrom, dateTo: data.range.dateTo }).toString()}`;

  return (
    <PageFrame className="gap-4 md:gap-8">
      <PageHeader
        eyebrow={`${t("Insights")} · ${t("Overview")}`}
        tone="insights"
        title={t("What your numbers say")}
        description={t("{period}, compared with {previous}.", { period: labels.period, previous: labels.previous })}
        looseDescription
        hideDescriptionOnPhone
        // The period switch and the reports button wrap under the title
        // when they don't fit beside it (tablets, small laptops).
        className="md:flex-wrap"
        actions={
          <>
            <SegmentedControl label={t("Period")} value={period} onChange={goToPeriod} options={INSIGHT_PERIODS.map((value) => ({ value, label: t(INSIGHT_PERIOD_LABELS[value]) }))} />
            <Button variant="secondary" size="lg" asChild>
              <Link href={reportsHref}>
                <FileText />
                {t("Detailed reports")}
              </Link>
            </Button>
          </>
        }
        hideActionsOnPhone
      />
      <SegmentedControl
        label={t("Period")}
        size="coarse"
        stretch
        value={period}
        onChange={goToPeriod}
        options={PHONE_PERIODS.map(([value, label]) => ({ value, label: t(label) }))}
        className="overflow-x-auto md:hidden"
      />

      <div data-pending={isPending ? "" : undefined} aria-busy={isPending || undefined} className="flex flex-col gap-4 transition-opacity data-pending:opacity-60 motion-reduce:transition-none md:gap-8">
        {!data.hasData ? (
          <>
            {/* Net worth only when there is some: the card marks itself empty. */}
            <div className="has-data-[net-worth=empty]:hidden">{netWorth}</div>
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
            <section aria-label={t("The short version")} className="grid gap-3 md:grid-cols-3 md:gap-6">
              <SayCard
                icon={<TrendingUp />}
                tone="insights"
                say={topSource ? t("{name} is {percent} of your income {period}.", { name: topSource.name, percent: percentLabel(Math.round(topSource.share), locale), period: when }) : t("No money in yet.")}
                why={topSource ? secondSourceLine(data, t) : t("Record an income and this fills in.")}
              />
              <SayCard icon={kept.icon} tone={kept.tone} className="max-md:order-first" say={kept.say} why={kept.why} />
              <SayCard
                icon={<ShoppingBag />}
                tone="loans"
                say={topSpend ? t("{name} is your biggest spend.", { name: topSpend.name }) : t("No spending recorded.")}
                why={topSpend ? <SpendWhy data={data} row={topSpend} /> : t("Your expenses show up here.")}
              />
            </section>

            {/* Phones lead with net worth; desktops with the three sentences. */}
            <div className="max-md:order-first">{netWorth}</div>

            <section aria-label={t("Totals")} className="hidden gap-6 md:grid md:grid-cols-2 xl:grid-cols-4">
              <KpiTile label={t("Money in")} value={<AmountText value={totals.income} currency={currency} size="h2" tone="income" signed className="font-bold leading-8" />}>
                <DeltaLine move={movement(totals.income, previous.income)} good={(d) => d >= 0} vs={labels.before} currency={currency} />
              </KpiTile>
              <KpiTile label={t("Money out")} value={<AmountText value={-totals.expense} currency={currency} size="h2" tone="expense" signed className="font-bold leading-8" />}>
                <DeltaLine move={movement(totals.expense, previous.expense)} good={(d) => d <= 0} vs={labels.before} currency={currency} />
              </KpiTile>
              <KpiTile label={t("Left over")} value={<AmountText value={totals.left} currency={currency} size="h2" tone={totals.left < 0 ? "expense" : "neutral"} className="font-bold leading-8" />}>
                <DeltaLine move={movement(totals.left, previous.left, { hadBefore })} good={(d) => d >= 0} vs={labels.before} currency={currency} />
              </KpiTile>
              <KpiTile label={t("Savings rate")} value={<b className="text-h2 leading-8 text-ink tabular-nums">{totals.rate === null ? "—" : percentLabel(totals.rate, locale)}</b>}>
                {totals.rate !== null && previous.rate !== null ? <PointsLine points={totals.rate - previous.rate} vs={labels.before} /> : <span>{t("Nothing before to compare with")}</span>}
              </KpiTile>
            </section>

            <div className="grid gap-4 max-md:order-1 md:gap-6 xl:grid-cols-2">
              <Card padding="lg" className="flex flex-col gap-4 max-md:hidden">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-h3 text-ink">{t("Where your money comes from")}</h2>
                    <span className="text-small text-ink-muted">
                      {plural(t, data.sources.length, "{count} income source · {amount}", "{count} income sources · {amount}", { amount: formatCurrency(totals.income, currency) }, locale)}
                    </span>
                  </div>
                  <CardLink href="/income-category">{t("Income sources")}</CardLink>
                </div>
                {data.sources.length === 0 ? (
                  <p className="text-body text-ink-muted">{t("No money came in {period}.", { period: when })}</p>
                ) : (
                  <div className="grid gap-1">
                    {data.sources.map((row) => (
                      <SourceRow key={row.name} row={row} currency={currency} href={transactionsHref("INCOME", row.name)} />
                    ))}
                  </div>
                )}
                {data.concentration && (
                  <Banner tone="warning" inline icon={<TriangleAlert />}>
                    <b>{t("{percent} of your income comes from {name} alone.", { percent: percentLabel(data.concentration.percent, locale), name: data.concentration.name })}</b> {secondSourceLine(data, t)}
                  </Banner>
                )}
              </Card>

              <Card padding="lg" className="flex flex-col gap-4 max-md:p-4 max-md:shadow-none">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-h3 text-ink">{t("Where it goes")}</h2>
                    <span className="text-small text-ink-muted">
                      {plural(t, data.spend.length, "{count} category · {amount}", "{count} categories · {amount}", { amount: formatCurrency(totals.expense, currency) }, locale)}
                    </span>
                  </div>
                  <CardLink href="/categories">{t("Budget")}</CardLink>
                </div>
                {data.spend.length === 0 ? (
                  <p className="text-body text-ink-muted">{t("Nothing went out {period}.", { period: when })}</p>
                ) : (
                  <>
                    <div role="img" aria-label={t("Spending split by category")} className="flex h-4 gap-0.5 overflow-hidden rounded-full">
                      {data.spend.map((row) => (
                        <span key={row.name} className={cn("bg-current", categoryTone(row.color).fg)} style={{ width: `${row.share}%` }} />
                      ))}
                    </div>
                    <div className="grid gap-1">
                      {data.spend.map((row) => (
                        <Link
                          key={row.name}
                          href={transactionsHref("EXPENSE", row.name)}
                          className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1 text-body transition-colors hover:bg-hover max-md:min-h-11"
                        >
                          <span className={cn("size-2.5 shrink-0 rounded-[3px] bg-current", categoryTone(row.color).fg)} />
                          <span className="flex-1 truncate text-ink">{row.name}</span>
                          <b className="text-ink tabular-nums">{formatCurrency(row.amount, currency)}</b>
                          <span className="w-10 text-right text-ink-muted tabular-nums">{percentLabel(Math.round(row.share), locale)}</span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
                {data.drop ? (
                  <Banner tone="mint" inline icon={<TrendingDown />}>
                    {fillNodes(t("{name} fell by {amount} against {previous}."), { name: <b>{data.drop.name}</b>, amount: <b>{formatCurrency(-data.drop.change, currency)}</b>, previous: labels.previous })}
                  </Banner>
                ) : (
                  rise && (
                    <Banner tone="warning" inline icon={<TrendingUp />}>
                      {fillNodes(t("{name} rose by {amount} against {previous}."), { name: <b>{rise.name}</b>, amount: <b>{formatCurrency(rise.change, currency)}</b>, previous: labels.previous })}
                    </Banner>
                  )
                )}
              </Card>
            </div>

            <div className="hidden gap-6 md:grid xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <SavingsRateChart rates={data.rates} trend={data.trend} partialMonth={data.partialMonth} />
              <ListCard
                label={t("{now} against {before}", { now: labels.now, before: labels.before })}
                header={
                  <div className="flex flex-col gap-0.5 px-6 pt-6 pb-3">
                    <h2 className="text-h3 text-ink">{t("What changed")}</h2>
                    <span className="text-small text-ink-muted">{t("{now} against {before}", { now: labels.now, before: labels.before })}</span>
                  </div>
                }
                footer={loansNote}
                tableClassName="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-4"
              >
                <ListHead columns={CHANGE_ROW}>
                  <ListHeadCell>
                    <span className="sr-only">{t("What changed")}</span>
                  </ListHeadCell>
                  <ListHeadCell align="end">{labels.heads[0]}</ListHeadCell>
                  <ListHeadCell align="end">{labels.heads[1]}</ListHeadCell>
                  <ListHeadCell align="end">{t("Change@@delta")}</ListHeadCell>
                </ListHead>
                <ChangeRow name={t("Money in")} before={previous.income} now={totals.income} move={movement(totals.income, previous.income)} currency={currency} good={(d) => d >= 0} />
                <ChangeRow name={t("Money out")} before={previous.expense} now={totals.expense} move={movement(totals.expense, previous.expense)} currency={currency} good={(d) => d <= 0} />
                <ChangeRow name={t("Left over")} before={previous.left} now={totals.left} move={movement(totals.left, previous.left, { hadBefore })} currency={currency} good={(d) => d >= 0} />
                {data.biggestMove && (
                  <ChangeRow name={data.biggestMove.name} before={data.biggestMove.before} now={data.biggestMove.now} move={movement(data.biggestMove.now, data.biggestMove.before)} currency={currency} good={(d) => d <= 0} />
                )}
              </ListCard>
            </div>

            <div className="md:hidden">
              <KeptChart rates={data.rates} currency={currency} partialMonth={data.partialMonth} />
            </div>
            {/* Phones reach the category figures from here too. */}
            <Button variant="secondary" size="lg" asChild className="max-md:order-2 md:hidden">
              <Link href={reportsHref}>
                <FileText />
                {t("Detailed reports")}
              </Link>
            </Button>
          </>
        )}
      </div>
    </PageFrame>
  );
}

// The middle card: the share kept, or that more went out than came in.
function keptSay(data: InsightsData, when: string, t: Translate, locale: Locale): { tone: Tone; icon: React.ReactNode; say: string; why: string } {
  const { totals, previous, labels, currency } = data;
  const spent = formatCurrency(totals.expense, currency);
  if (totals.income > 0 && totals.left < 0) {
    return {
      tone: "expense",
      icon: <TriangleAlert />,
      say: t("You spent {amount} more than you earned.", { amount: formatCurrency(-totals.left, currency) }),
      why: t("{spent} went out against {earned} {period}.", { spent, earned: formatCurrency(totals.income, currency), period: when }),
    };
  }
  if (totals.rate === null) {
    return { tone: "money", icon: <PiggyBank />, say: t("Nothing earned yet."), why: totals.expense > 0 ? t("{spent} went out {period}.", { spent, period: when }) : t("Once money comes in, this shows the share you kept.") };
  }
  const values = { amount: formatCurrency(totals.left, currency), period: when, before: previous.rate === null ? "" : percentLabel(previous.rate, locale), previous: labels.previous };
  const why =
    previous.rate === null
      ? t("That is {amount} {period}.", values)
      : totals.rate > previous.rate
        ? t("That is {amount} {period}, up from {before} in {previous}.", values)
        : totals.rate < previous.rate
          ? t("That is {amount} {period}, down from {before} in {previous}.", values)
          : t("That is {amount} {period}, the same share as in {previous}.", values);
  return { tone: "money", icon: <PiggyBank />, say: t("You kept {percent} of what you earned.", { percent: percentLabel(totals.rate, locale) }), why };
}

// The biggest spend's line: its share and a month's worth of it, in whole
// taka. Last month says what it came to; a month or less still under way
// (this month, this year in January) what it has come to so far, as there
// is nothing to average yet.
function SpendWhy({ data, row }: { data: InsightsData; row: RankedRow }) {
  const { t, locale } = useLocale();
  const percent = percentLabel(Math.round(row.share), locale);
  const total = { percent, amount: formatCurrency(row.amount, data.currency) };
  if (data.period === "last-month") return t("{percent} of spending · {amount} in all.", total);
  const perMonth = monthlyAverage(row.amount, data.months);
  if (perMonth === null) return t("{percent} of spending · {amount} so far.", total);
  const average = { percent, amount: formatCurrency(perMonth, data.currency) };
  return (
    <>
      <span className="md:hidden">{t("{percent} of spending, about {amount} a month.", average)}</span>
      <span className="hidden md:inline">{t("{percent} of spending · {amount} a month on average.", average)}</span>
    </>
  );
}

// "Freelance went from ৳ 8,000 to ৳ 12,000." -- how the runner-up moved,
// or that there is none.
function secondSourceLine(data: InsightsData, t: Translate): string {
  const second = data.concentration?.second ?? (data.sources[1] ? { name: data.sources[1].name, before: 0, now: data.sources[1].amount } : null);
  if (!second) return t("It is your only source so far.");
  if (!second.before) return t("{name} brought {amount}.", { name: second.name, amount: formatCurrency(second.now, data.currency) });
  return t("{name} went from {before} to {now}.", { name: second.name, before: formatCurrency(second.before, data.currency), now: formatCurrency(second.now, data.currency) });
}

// A card header's link: a 44px target that keeps the header's height.
function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button variant="link" asChild className="-my-3 h-auto min-h-11 shrink-0 px-0 text-body">
      <Link href={href}>{children}</Link>
    </Button>
  );
}

// A total's line under its figure: "↑ 6.3% vs 1–21 Sep", "↑ ৳ 7,000 vs …".
function DeltaLine({ move, good, vs, currency }: { move: Movement; good: (change: number) => boolean; vs: string; currency: string }) {
  const { t, locale } = useLocale();
  if (move.kind === "new" || move.kind === "same") return <span>{t("Nothing before to compare with")}</span>;
  const arrow = move.change > 0 ? "↑" : move.change < 0 ? "↓" : "=";
  const figure = move.kind === "percent" ? percentLabel(Math.abs(move.percent), locale) : formatCurrency(Math.abs(move.change), currency);
  return (
    <span>
      {fillNodes(t("{change} vs {previous}"), {
        change: (
          <b className={good(move.change) ? "text-income" : "text-expense"}>
            {arrow} {figure}
          </b>
        ),
        previous: vs,
      })}
    </span>
  );
}

// The savings rate's line: how many points it moved.
function PointsLine({ points, vs }: { points: number; vs: string }) {
  const { t, locale } = useLocale();
  const arrow = points > 0 ? "↑" : points < 0 ? "↓" : "=";
  return (
    <span>
      {fillNodes(t("{change} vs {previous}"), {
        change: (
          <b className={points >= 0 ? "text-income" : "text-expense"}>
            {arrow} {plural(t, Math.abs(points), "{count} point", "{count} points", undefined, locale)}
          </b>
        ),
        previous: vs,
      })}
    </span>
  );
}

function SourceRow({ row, currency, href }: { row: RankedRow; currency: string; href: string }) {
  const { locale } = useLocale();
  return (
    <Link href={href} className="-mx-2 grid grid-cols-[24px_minmax(0,1fr)_110px_56px] items-center gap-3 rounded-md px-2 py-1.5 text-body transition-colors hover:bg-hover">
      <span className="text-small font-bold text-ink-muted tabular-nums">{row.rank}</span>
      <span className="flex min-w-0 flex-col gap-2">
        <span className="truncate font-semibold text-ink">{row.name}</span>
        <span className={cn("block h-2 overflow-hidden rounded-full bg-surface-sunken", categoryTone(row.color).fg)}>
          <span className="block h-full rounded-full bg-current" style={{ width: `${row.width}%` }} />
        </span>
      </span>
      <span className="text-right font-semibold text-ink tabular-nums">{formatCurrency(row.amount, currency)}</span>
      <span className="text-right text-ink-muted tabular-nums">{percentLabel(Math.round(row.share), locale)}</span>
    </Link>
  );
}

// One line of What changed: before, now, and the move as a percent, an
// amount (Left over after an overspent period), "new" or a dash.
function ChangeRow({ name, before, now, move, currency, good }: { name: string; before: number; now: number; move: Movement; currency: string; good: (change: number) => boolean }) {
  const { t, locale } = useLocale();
  const text =
    move.kind === "percent"
      ? `${move.percent > 0 ? "+ " : move.percent < 0 ? "− " : ""}${percentLabel(Math.abs(move.percent), locale)}`
      : move.kind === "amount"
        ? formatSignedCurrency(move.change, currency)
        : move.kind === "new"
          ? t("new")
          : "—";
  const tone = move.kind === "same" || (move.kind === "percent" && move.change === 0) ? "text-ink-muted" : good(move.change) ? "text-income" : "text-expense";
  return (
    <ListRow columns={CHANGE_ROW} className="tabular-nums">
      <ListCell className="truncate font-semibold text-ink" title={name}>
        {name}
      </ListCell>
      <ListCell align="end" className="whitespace-nowrap text-ink-muted">
        {formatCurrency(before, currency)}
      </ListCell>
      <ListCell align="end" className="whitespace-nowrap font-semibold text-ink">
        {formatCurrency(now, currency)}
      </ListCell>
      <ListCell align="end" className={cn("whitespace-nowrap font-bold", tone)}>
        {text}
      </ListCell>
    </ListRow>
  );
}
