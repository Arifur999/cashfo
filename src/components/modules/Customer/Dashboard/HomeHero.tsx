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
// row instead).
export function HomeHero({ balance, walletCount, balanceChangePercent, income, expense, savingsRate, lastSavingsRate, currency, monthName, lastMonthName }: HeroProps) {
  const { t } = useLocale();
  const leftOver = income - expense;
  const change = balanceChangePercent;

  return (
    <section aria-label={t("This month")} className="relative grid items-center gap-4 overflow-hidden rounded-xl bg-aurora p-5 text-white shadow-float md:grid-cols-[minmax(0,1fr)_260px] md:gap-8 md:p-8">
      <span aria-hidden="true" className="absolute -top-35 -right-30 size-105 rounded-full border border-white/16" />
      <span aria-hidden="true" className="absolute -top-15 -right-10 size-65 rounded-full border border-white/12" />

      <div className="relative flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-2">
          <span className="flex flex-wrap items-center gap-3 text-small text-mint-200 md:text-body">
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
          <HeroTile label={`${t("Money in")} · ${t("this month")}`} value={income} currency={currency} signed />
          <HeroTile label={`${t("Money out")} · ${t("this month")}`} value={-expense} currency={currency} signed />
          <HeroTile label={t("Left over this month")} value={leftOver} currency={currency} className="hidden md:flex" />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface p-3 text-body text-ink md:hidden">
          <span>
            <AmountText value={leftOver} currency={currency} size="md" tone="neutral" className="font-bold" /> {t("left over")}
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
            <b className="text-amount-lg font-extrabold tabular-nums">{savingsRate ?? 0}%</b>
            <span className="text-caption font-normal text-ink-muted">{t("saved")}</span>
          </span>
        </div>
        <span className="text-center text-body font-semibold">{t("Savings rate this month")}</span>
        <span className="text-center text-caption font-normal text-ink-muted">
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

function HeroTile({ label, value, currency, signed = false, className }: { label: string; value: number; currency: string; signed?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-lg bg-white/10 p-3 md:gap-1 md:p-4", className)}>
      <span className="text-caption font-normal text-mint-200 md:text-small">{label}</span>
      <AmountText value={value} currency={currency} signed={signed} tone="inherit" size="md" className="font-bold md:text-h2" />
    </div>
  );
}
