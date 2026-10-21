"use client";

import { Box, ChartPie, PiggyBank } from "lucide-react";
import Link from "next/link";
import { createElement } from "react";
import AmountText from "@/components/smartly/AmountText";
import ByWidth from "@/components/smartly/ByWidth";
import Card from "@/components/smartly/Card";
import IconTile from "@/components/smartly/IconTile";
import ProgressBar from "@/components/smartly/ProgressBar";
import SectionHeader from "@/components/smartly/SectionHeader";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { formatCurrency } from "@/lib/customer/currency";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { HomePartError } from "./HomePartError";
import { PhoneMoneyCards } from "./HomePhone";
import { SectionLink } from "./SectionLink";
import type { HomeData } from "./homeTypes";
import { IncomeSavedChart } from "./IncomeSavedChart";
import { RecentTransactionsCard } from "./RecentTransactionsCard";

// The money section: the six months beside the newest transactions, then
// savings goals, assets and the budget closest to its limit.
export function HomeMoney({ data }: { data: HomeData }) {
  const { t } = useLocale();
  const { currency } = data;

  return (
    <section aria-labelledby="h-money" className="flex flex-col gap-3 md:gap-4">
      <SectionHeader
        id="h-money"
        eyebrow={t("Money")}
        title={<ByWidth phone={t("Recent transactions")} wide={t("Income & expense")} />}
        aside={<SectionLink href="/transactions" phone={t("See all")} wide={t("See all transactions")} arrow />}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <IncomeSavedChart points={data.chart} currency={currency} className="hidden md:flex" />
        <RecentTransactionsCard transactions={data.recentTransactions} categoriesById={data.categoriesById} currency={currency} today={data.today} />
      </div>
      <PhoneMoneyCards data={data} />
      <div className="hidden gap-4 sm:grid-cols-2 md:grid lg:grid-cols-3 lg:gap-6">
        <SavingsCard data={data} />
        <AssetsCard data={data} />
        <BudgetCard data={data} />
      </div>
    </section>
  );
}

// A card's name with its tile, at the top of each of the three.
function CardLabel({ icon, tone, children }: { icon: React.ReactNode; tone: "money" | "warning"; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-3 text-small font-medium text-ink-muted">
      <IconTile tone={tone}>{icon}</IconTile>
      {children}
    </span>
  );
}

// A card that couldn't be read keeps its place and its name, and no more
// height than the two beside it.
function FailedCard({ label }: { label: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3">
      {label}
      <HomePartError compact />
    </Card>
  );
}

function SavingsCard({ data }: { data: HomeData }) {
  const { t, locale } = useLocale();
  const { currency } = data;
  const label = (
    <CardLabel icon={<PiggyBank />} tone="money">
      {t("Savings goals")}
    </CardLabel>
  );
  if (data.unavailable.includes("savings")) return <FailedCard label={label} />;

  return (
    <Card interactive asChild className="flex flex-col gap-3">
      <Link href="/savings-goals/dashboard">
        {label}
        {data.goalCount === 0 ? (
          <>
            <span className="text-title font-semibold text-ink">{t("No savings goal yet")}</span>
            <span className="text-small text-ink-muted">{t("Name something you are saving for and set a date.")}</span>
          </>
        ) : (
          <>
            <span className="text-small text-ink-muted">
              {data.savingsTarget > 0 ? (
                // Home's own key: the Bangla of Savings goals' "{saved} of
                // {target}" puts the small target before the headline figure.
                fillNodes(t("{saved} of {target}@@home"), {
                  saved: <AmountText value={data.savingsSaved} currency={currency} size="lg" className="leading-8" />,
                  target: formatCurrency(data.savingsTarget, currency),
                })
              ) : (
                <AmountText value={data.savingsSaved} currency={currency} size="lg" className="leading-8" />
              )}
            </span>
            <ProgressBar value={data.savingsProgress} label={t("Savings goals")} />
            <span className="text-small text-ink-muted">
              {t(data.goalCount === 1 ? "{count} goal" : "{count} goals", { count: formatCount(data.goalCount, locale) })} · {t("{percent}% reached", { percent: toLocaleDigits(String(data.savingsProgress), locale) })}
            </span>
          </>
        )}
      </Link>
    </Card>
  );
}

function AssetsCard({ data }: { data: HomeData }) {
  const { t, locale } = useLocale();
  const { currency } = data;
  const label = (
    <CardLabel icon={<Box />} tone="money">
      {t("Assets")}
    </CardLabel>
  );
  if (data.unavailable.includes("assets")) return <FailedCard label={label} />;

  return (
    <Card interactive asChild className="flex flex-col gap-3">
      <Link href="/assets-management/dashboard">
        {label}
        {data.assetCount === 0 ? (
          <>
            <span className="text-title font-semibold text-ink">{t("No assets yet")}</span>
            {/* The card is the link; this says where it leads. */}
            {data.canManage && <span className="text-small font-semibold text-emerald">{t("Add an asset")} →</span>}
          </>
        ) : (
          <>
            <AmountText value={data.assetsValue} currency={currency} size="lg" className="leading-8" />
            <span className="text-small text-ink-muted">
              {t(data.assetCount === 1 ? "{count} asset" : "{count} assets", { count: formatCount(data.assetCount, locale) })}
              {" · "}
              {/* No green arrow over a zero: an unchanged value is no gain. */}
              {data.assetsGain === 0
                ? t("Worth what you paid for them")
                : fillNodes(t("{change} since you bought them"), {
                    change: (
                      <b className={data.assetsGain > 0 ? "text-income" : "text-expense"}>
                        {data.assetsGain > 0 ? "↑" : "↓"} {formatCurrency(Math.abs(data.assetsGain), currency)}
                      </b>
                    ),
                  })}
            </span>
          </>
        )}
      </Link>
    </Card>
  );
}

function BudgetCard({ data }: { data: HomeData }) {
  const { t } = useLocale();
  const label = (
    <CardLabel icon={<ChartPie />} tone="warning">
      {t("Budget")} · {data.monthName}
    </CardLabel>
  );
  if (data.unavailable.includes("budget")) return <FailedCard label={label} />;

  return (
    <Card interactive asChild className="flex flex-col gap-3">
      <Link href="/categories">
        {label}
        {data.budgetFocus ? (
          <BudgetFocus focus={data.budgetFocus} currency={data.currency} daysLeft={data.daysLeftInMonth} />
        ) : (
          <>
            <span className="text-title font-semibold text-ink">{t("No budget yet")}</span>
            <span className="text-small text-ink-muted">{t("Set a monthly limit and Smartly warns you at 70%.")}</span>
          </>
        )}
      </Link>
    </Card>
  );
}

function BudgetFocus({ focus, currency, daysLeft }: { focus: NonNullable<HomeData["budgetFocus"]>; currency: string; daysLeft: number }) {
  const { t, locale } = useLocale();
  const limit = Number(focus.monthlyLimit ?? 0);
  const spent = Number(focus.spent);
  const left = limit - spent;
  return (
    <>
      <span className="flex items-baseline justify-between gap-2">
        <b className="flex min-w-0 items-center gap-2 text-title leading-5.5 font-semibold text-ink">
          {createElement(budgetCategoryIcon(focus.icon ?? ""), { className: "size-4 shrink-0 text-ink-muted", "aria-hidden": true })}
          <span className="truncate">{focus.name}</span>
        </b>
        <span className="shrink-0 text-small text-ink-muted tabular-nums">
          {fillNodes(t("{spent} of {limit}"), { spent: <b className="text-ink">{formatCurrency(spent, currency)}</b>, limit: formatCurrency(limit, currency) })}
        </span>
      </span>
      <ProgressBar value={focus.percent} tone="budget" label={focus.name} />
      <span className={cn("text-small", focus.percent > 90 ? "font-semibold text-expense" : focus.percent >= 70 ? "font-semibold text-warning" : "text-ink-muted")}>
        {t("{percent}% used", { percent: toLocaleDigits(String(Math.round(focus.percent)), locale) })} ·{" "}
        {left >= 0
          ? t(daysLeft === 1 ? "{amount} left for {count} day" : "{amount} left for {count} days", { amount: formatCurrency(left, currency), count: formatCount(daysLeft, locale) })
          : t("{amount} over", { amount: formatCurrency(-left, currency) })}
      </span>
    </>
  );
}
