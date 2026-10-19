"use client";

import AmountText from "@/components/smartly/AmountText";
import Chip from "@/components/smartly/Chip";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { HomeData } from "./homeTypes";

const RING = 2 * Math.PI * 50;

type HeroProps = Pick<HomeData, "balance" | "walletCount" | "balanceChangePercent" | "income" | "expense" | "savingsRate" | "lastSavingsRate" | "currency" | "monthName" | "lastMonthName">;

// This month on the aurora card: the balance, money in and out, what was
// left, and the savings-rate ring on the right (phones show the left-over
// row instead, and a flatter card with one ring of light).
export function HomeHero({ balance, walletCount, balanceChangePercent, income, expense, savingsRate, lastSavingsRate, currency, monthName, lastMonthName }: HeroProps) {
  const { t } = useLocale();
  const leftOver = income - expense;
  const change = balanceChangePercent;

  return (
    <section aria-label={t("This month")} className="relative grid items-center gap-4 overflow-hidden rounded-xl bg-aurora p-5 text-white md:grid-cols-[minmax(0,1fr)_260px] md:gap-8 md:p-8 md:shadow-float">
      <span aria-hidden="true" className="absolute -top-22.5 -right-20 size-60 rounded-full border border-white/16 md:-top-35 md:-right-30 md:size-105" />
      <span aria-hidden="true" className="absolute -top-15 -right-10 hidden size-65 rounded-full border border-white/12 md:block" />

      <div className="relative flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-4 md:gap-2">
          <span className="flex flex-wrap items-center justify-between gap-3 text-small text-mint-200 md:justify-start md:text-body md:leading-5">
            {t("Total balance")} · {walletCount} {t(walletCount === 1 ? "wallet" : "wallets")}
            {change !== null && (
              <Chip tone="onDark">
                {change >= 0 ? "↑" : "↓"} {Math.abs(change)}% <span className="hidden font-bold md:inline">{t("vs")} {lastMonthName}</span>
              </Chip>
            )}
          </span>
          <AmountText value={balance} currency={currency} size="display" tone="inherit" className="md:text-display-xl" />
        </div>
        <div className="grid max-w-2xl grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
          <HeroTile label={<ThisMonth label={t("Money in")} />} value={income} currency={currency} signed />
          <HeroTile label={<ThisMonth label={t("Money out")} />} value={-expense} currency={currency} signed />
          <HeroTile label={t("Left over this month")} value={leftOver} currency={currency} className="hidden md:flex" />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface p-3 text-body text-ink md:hidden">
          <span className="leading-[normal]">
            <AmountText value={leftOver} currency={currency} size="sm" tone="neutral" className="font-bold leading-[normal]" /> {t("left over")}
          </span>
          {savingsRate !== null && <Chip tone="mint">{savingsRate}% {t("saved")}</Chip>}
        </div>
      </div>

      <div className="relative hidden w-56 flex-col items-center gap-3 justify-self-end rounded-xl bg-surface p-5 text-ink shadow-[0_28px_60px_-16px_rgba(11,61,46,0.3)] md:flex">
        <div className="relative size-30">
          <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`${savingsRate ?? 0}% ${t("of income saved this month")}`}>
            <circle cx="60" cy="60" r="50" fill="none" stroke="var(--mint-50)" strokeWidth="12" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="var(--emerald)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${((savingsRate ?? 0) / 100) * RING} ${RING}`} transform="rotate(-90 60 60)" />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <b className="text-amount-lg leading-8 font-extrabold tabular-nums">{savingsRate ?? 0}%</b>
            <span className="text-caption font-normal text-ink-muted">{t("saved")}</span>
          </span>
        </div>
        <span className="text-center text-body leading-5 font-semibold">{t("Savings rate this month")}</span>
        <span className="text-center text-caption leading-4 font-normal text-ink-muted">
          {savingsRate === null
            ? t("Add an income to see it")
            : lastSavingsRate === null
              ? t("First month on record")
              : savingsRate >= lastSavingsRate
                ? `${t("Up from")} ${lastSavingsRate}% ${t("in")} ${lastMonthName}`
                : `${t("Down from")} ${lastSavingsRate}% ${t("in")} ${lastMonthName}`}
        </span>
      </div>
      <span className="sr-only">{monthName}</span>
    </section>
  );
}

// "Money in · this month"; phones leave the month to the card's own label.
function ThisMonth({ label }: { label: string }) {
  const { t } = useLocale();
  return (
    <>
      {label}
      <span className="hidden md:inline"> · {t("this month")}</span>
    </>
  );
}

// The phone board leaves the tiles' lines to the fonts, which stands a line
// with a taka sign taller; the desktop board fixes them at 13/18 and 22/28.
function HeroTile({ label, value, currency, signed = false, className }: { label: React.ReactNode; value: number; currency: string; signed?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-lg bg-white/10 p-3 md:gap-1 md:p-4", className)}>
      <span className="text-caption font-normal text-mint-200 md:text-small md:leading-4.5">{label}</span>
      <AmountText value={value} currency={currency} signed={signed} tone="inherit" size="md" className="font-bold md:text-h2 md:leading-7" />
    </div>
  );
}
