"use client";

import AmountText from "@/components/smartly/AmountText";
import ByWidth from "@/components/smartly/ByWidth";
import Chip from "@/components/smartly/Chip";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { HomeData } from "./homeTypes";

const RING = 2 * Math.PI * 50;

// Over the aurora's light end the white wash left the tiles' text under
// 4.5:1; a forest fill keeps it above that wherever the tiles fall.
const TILE = "bg-forest/55";
// Bangla's vowel signs need more room than the caption's fixed line when it
// wraps.
const BN_LEADING = "[.font-bn_&]:leading-normal";

// This month on the aurora card: the balance, money in and out, what was
// left, and the savings-rate ring on the right (phones show the left-over
// row instead, and a flatter card with one ring of light).
export function HomeHero({ data }: { data: HomeData }) {
  const { t, locale } = useLocale();
  const { balance, walletCount, balanceChangePercent: change, income, expense, savingsRate, lastSavingsRate, currency, monthName, lastMonthName, lastMonthShort } = data;
  const leftOver = income - expense;
  // Percentages in the reader's digits; only money stays Latin.
  const percent = (value: number) => toLocaleDigits(String(value), locale);
  const arrowed = change === null ? "" : `${change >= 0 ? "↑" : "↓"} ${percent(Math.abs(change))}%`;
  const caption =
    savingsRate === null
      ? t("Add an income to see it")
      : lastSavingsRate === null
        ? data.firstMonthOnRecord
          ? t("First month on record")
          : t("No income in {month}", { month: lastMonthName })
        : t(savingsRate >= lastSavingsRate ? "Up from {rate}% in {month}" : "Down from {rate}% in {month}", { rate: percent(lastSavingsRate), month: lastMonthName });

  return (
    <section aria-label={t("This month · {month}", { month: monthName })} className="relative grid items-center gap-4 overflow-hidden rounded-xl bg-aurora p-5 text-white md:grid-cols-[minmax(0,1fr)_260px] md:gap-8 md:p-8 md:shadow-float">
      <span aria-hidden="true" className="absolute -top-22.5 -right-20 size-60 rounded-full border border-white/16 md:-top-35 md:-right-30 md:size-105" />
      <span aria-hidden="true" className="absolute -top-15 -right-10 hidden size-65 rounded-full border border-white/12 md:block" />

      <div className="relative flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-4 md:gap-2">
          <span className="flex flex-wrap items-center justify-between gap-3 text-small text-mint-200 md:justify-start md:text-body md:leading-5">
            {/* Active wallets only, so Balance's word for it: its "Total balance" counts archived ones too. */}
            {t("Available balance")} · {t(walletCount === 1 ? "{count} wallet" : "{count} wallets", { count: formatCount(walletCount, locale) })}
            {change !== null && (
              <Chip tone="onDark" className={TILE}>
                <ByWidth phone={t("{change} vs {month}", { change: arrowed, month: lastMonthShort })} wide={t("{change} vs {month}", { change: arrowed, month: lastMonthName })} />
              </Chip>
            )}
          </span>
          <AmountText value={balance} currency={currency} size="display" tone="inherit" className="md:text-display-xl" />
        </div>
        <div className="grid max-w-2xl grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
          <HeroTile label={<ThisMonth label={t("Money in")} />} value={income} currency={currency} signed />
          <HeroTile label={<ThisMonth label={t("Money out")} />} value={-expense} currency={currency} signed />
          {/* Signed only below zero: "− ৳ 5,000", like the tiles beside it. */}
          <HeroTile label={t("Left over this month")} value={leftOver} currency={currency} signed={leftOver < 0} className="hidden md:flex" />
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-surface p-3 text-body text-ink md:hidden">
          <span className="leading-[normal]">
            {fillNodes(t("{amount} left over"), {
              amount: <AmountText value={leftOver} currency={currency} size="sm" tone="neutral" signed={leftOver < 0} className="font-bold leading-[normal]" />,
            })}
          </span>
          {savingsRate !== null && <Chip tone="mint">{t("{rate}% saved", { rate: percent(savingsRate) })}</Chip>}
        </div>
      </div>

      <div className="relative hidden w-56 flex-col items-center gap-3 justify-self-end rounded-xl bg-surface p-5 text-ink shadow-overlay md:flex">
        <div className="relative size-30">
          <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={savingsRate === null ? t("No income this month yet") : t("{rate}% of income saved this month", { rate: percent(savingsRate) })}>
            <circle cx="60" cy="60" r="50" fill="none" stroke="var(--mint-50)" strokeWidth="12" />
            {savingsRate !== null && (
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--emerald)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(savingsRate / 100) * RING} ${RING}`} transform="rotate(-90 60 60)" />
            )}
          </svg>
          {/* The ring's own label says this; read once. */}
          <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center">
            <b className={cn("text-amount-lg leading-8 font-extrabold tabular-nums", savingsRate === null && "text-ink-muted")}>{savingsRate === null ? "—" : `${percent(savingsRate)}%`}</b>
            <span className="text-caption font-normal text-ink-muted">{t("saved")}</span>
          </span>
        </div>
        <span className="text-center text-body leading-5 font-semibold">{t("Savings rate this month")}</span>
        <span className={cn("text-center text-caption leading-4 font-normal text-ink-muted", BN_LEADING)}>{caption}</span>
      </div>
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
    <div className={cn("flex flex-col gap-0.5 rounded-lg p-3 md:gap-1 md:p-4", TILE, className)}>
      <span className="text-caption font-normal text-white/85 md:text-small md:leading-4.5">{label}</span>
      <AmountText value={value} currency={currency} signed={signed} tone="inherit" size="md" className="font-bold md:text-h2 md:leading-7" />
    </div>
  );
}
