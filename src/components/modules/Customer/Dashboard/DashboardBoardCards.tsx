"use client";

import Link from "next/link";
import { createElement, useId, useState } from "react";
import { walletColorStyle } from "@/lib/customer/balanceDisplay";
import { formatCompactAmount, formatCurrency } from "@/lib/customer/currency";
import { categoryLabel } from "@/lib/customer/transactionRows";
import { walletIcon, walletType } from "@/lib/customer/walletVisuals";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { redigit, withLocale } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BOARD_CARD, BoardHead } from "./DashboardCards";
import { categoryChartColor, donutArcs, fourStepAxis } from "./dashboardFigures";
import type { HomeChartPoint, HomeData } from "./homeTypes";
import { ChartTip } from "./IncomeExpenseChart";

// The set-up Dashboard board's own Spending, Income vs Expense and Accounts
// cards (a new account keeps DashboardEmpty's, in SpendingCard,
// IncomeExpenseChart and HomeMoney).

const HIDDEN = "৳ ••••••";

// Spending by category: the period's spending as a ring, then each of the
// biggest categories with its amount and share.
export function SpendingBoardCard({ data }: { data: HomeData }) {
  const { t, fmt } = useLocale();
  const { slices, total } = data.spending;
  const name = (slice: (typeof slices)[number]) => (slice.color === null && slice.name === "Other" ? t("Other") : categoryLabel(slice.name, t));
  const arcs = donutArcs(slices);
  const label = t("Spending by category");
  return (
    <section className={cn(BOARD_CARD, "flex flex-col gap-3.5 px-5.5 py-5")}>
      <BoardHead title={label} sub={data.period.label} href="/income-expense" link={t("Details")} />
      <div role="img" aria-label={slices.length ? `${label}: ${slices.map((slice) => `${name(slice)} ${toLocaleDigits(String(slice.percent), fmt)}%`).join(", ")}` : t("Nothing spent")} className="relative size-42 self-center">
        <svg width="168" height="168" viewBox="0 0 42 42" aria-hidden="true" className="-rotate-90">
          <circle cx="21" cy="21" r="15.9155" fill="none" strokeWidth="5.5" className="stroke-surface-sunken" />
          {arcs.map((arc) => (
            <circle key={arc.name} cx="21" cy="21" r="15.9155" fill="none" strokeWidth="5.5" stroke={arc.color} strokeDasharray={arc.dash} strokeDashoffset={arc.offset} />
          ))}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-px">
          <span className="text-[17px] font-semibold whitespace-nowrap text-ink tabular-nums">{formatCurrency(total, data.currency, fmt)}</span>
          <span className="text-[11.5px] text-ink-muted">{t("Total spent")}</span>
        </span>
      </div>
      <div className="flex flex-col gap-1.75">
        {slices.map((slice) => (
          <div key={slice.name} className="grid grid-cols-[minmax(0,1fr)_auto_38px] items-center gap-x-2 text-[13px] leading-[normal]">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.25 shrink-0 rounded-full" style={{ background: slice.color === null ? "var(--chart-other)" : categoryChartColor(slice.color) }} />
              <span className="truncate text-ink">{name(slice)}</span>
            </span>
            <span className="font-semibold whitespace-nowrap text-ink tabular-nums">{formatCurrency(slice.amount, data.currency, fmt)}</span>
            <span className="text-right text-ink-faint tabular-nums">{toLocaleDigits(`${slice.percent}%`, fmt)}</span>
          </div>
        ))}
        {slices.length === 0 && <span className="text-center text-[13px] text-ink-faint">{t("No spending in this period")}</span>}
      </div>
    </section>
  );
}

// Income vs Expense: six months of bars on four even steps, the open month
// on its band in full colour. Hovering a month shows its figures.
export function IncomeVsExpenseCard({ points, currency }: { points: HomeChartPoint[]; currency: string }) {
  const { t, fmt, locale } = useLocale();
  const listId = useId();
  const [active, setActive] = useState<number | null>(null);
  const axis = fourStepAxis(Math.max(0, ...points.map((point) => Math.max(point.income, point.expense)))) ?? [4, 3, 2, 1, 0];
  const top = axis[0];
  // The board's ticks: lakhs once the top reaches one ("0.5 L"), else
  // thousands ("7.5K"); a reader who groups in threes gets millions.
  const tick = (value: number) => {
    if (value === 0) return toLocaleDigits("0", fmt);
    if ((typeof fmt === "string" || fmt.grouping === "lakh") && top >= 100000 && top < 10000000) return toLocaleDigits(`${Number((value / 100000).toFixed(2))} ${t("L@@axis")}`, fmt);
    return toLocaleDigits(formatCompactAmount(value, withLocale(fmt, "en")).replace(/(Cr|L|K|M|B)$/, (unit) => (unit === "K" && locale === "en" ? "K" : ` ${t(`${unit}@@axis`)}`)), fmt);
  };
  const height = (value: number) => `${((Math.max(0, value) / top) * 100).toFixed(1)}%`;
  const describe = (point: HomeChartPoint) => t("{month}: income {income}, expense {expense}", { month: point.name, income: formatCurrency(point.income, currency, fmt), expense: formatCurrency(point.expense, currency, fmt) });
  const current = points.length - 1;
  return (
    <section className={cn(BOARD_CARD, "flex flex-col gap-3.5 px-5.5 py-5 xl:col-span-2")}>
      <div className="flex items-start justify-between gap-3">
        <BoardHead title={t("Income vs Expense")} sub={redigit(t("Last 6 months"), fmt)} />
        <span aria-hidden="true" className="flex items-center gap-3.5 text-[12.5px] leading-[normal] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-chart-income" />
            {t("Income")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-bar-expense" />
            {t("Expense")}
          </span>
        </span>
      </div>
      <div className="grid h-62.5 grid-cols-[44px_minmax(0,1fr)] gap-2 [.font-bn_&]:grid-cols-[56px_minmax(0,1fr)]">
        <div aria-hidden="true" className="flex flex-col justify-between pb-6 text-right text-[11px] leading-[normal] whitespace-nowrap text-ink-faint tabular-nums">
          {axis.map((value) => (
            <span key={value}>{tick(value)}</span>
          ))}
        </div>
        <div role="img" aria-label={t("Income and expense, by month")} aria-describedby={listId} className="relative grid grid-cols-6 items-end gap-2.5" onMouseLeave={() => setActive(null)}>
          {points.map((point, i) => {
            const now = i === current;
            return (
              <button
                key={point.month}
                type="button"
                aria-label={describe(point)}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className={cn("flex h-full cursor-default flex-col items-center gap-1.5 rounded-[10px] pt-1.5 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring", now && "bg-chart-band")}
              >
                <span className="flex w-full flex-1 items-end justify-center gap-1.25">
                  <span className={cn("rp-colbar w-[26%] max-w-5.5 rounded-[5px_5px_2px_2px]", now ? "bg-chart-income" : "bg-bar-income-dim")} style={{ height: height(point.income) }} />
                  <span className={cn("rp-colbar w-[26%] max-w-5.5 rounded-[5px_5px_2px_2px]", now ? "bg-bar-expense" : "bg-bar-expense-dim")} style={{ height: height(point.expense) }} />
                </span>
                <span className={cn("h-4.5 text-[12px] leading-[normal]", now ? "font-bold text-ink" : "font-medium text-ink-muted")}>{point.label}</span>
              </button>
            );
          })}
          {active !== null && points[active] && <ChartTip point={points[active]} currency={currency} index={active} count={points.length} />}
        </div>
      </div>
      <ul id={listId} className="sr-only">
        {points.map((point) => (
          <li key={point.month}>{describe(point)}</li>
        ))}
      </ul>
    </section>
  );
}

const ACCOUNT_KIND: Record<ReturnType<typeof walletType>, string> = { cash: "Cash", bank: "Bank account", mfs: "Mobile wallet" };

// Accounts: every active account, richest first, each in its own card
// colour, and what they hold together at the foot.
export function AccountsCard({ data, hidden, className }: { data: HomeData; hidden: boolean; className?: string }) {
  const { t, fmt } = useLocale();
  const money = (value: number) => (hidden ? HIDDEN : formatCurrency(value, data.currency, fmt));
  const accounts = [...data.wallets].sort((a, b) => b.balance - a.balance);
  return (
    <section className={cn(BOARD_CARD, "flex flex-col overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-3 px-5.5 pt-4.5 pb-2.5">
        <BoardHead title={t("Accounts")} />
        <Link href="/balance/accounts" className="text-small font-semibold whitespace-nowrap text-emerald hover:underline">
          {t("Manage")}
        </Link>
      </div>
      <div className="flex grow flex-col px-4">
        {accounts.map((account) => (
          <Link key={account.id} href={`/balance/ledger?accountId=${account.id}`} className="db-row grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[12px] px-1.5 py-2 text-ink transition-colors hover:bg-row-hover">
            <span className="wallet-tile flex size-9 items-center justify-center rounded-[10px] [&_svg]:size-4.25" style={walletColorStyle(account.color)}>
              {createElement(walletIcon({ accountSubtype: account.subtype }), { strokeWidth: 2, "aria-hidden": true })}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body leading-[normal] font-medium">{account.name}</span>
              <span className="text-caption leading-[normal] text-ink-faint">{t(ACCOUNT_KIND[walletType({ accountSubtype: account.subtype })])}</span>
            </span>
            <span className={cn("text-body leading-[normal] font-semibold whitespace-nowrap tabular-nums", account.balance < 0 && "text-loss-ink")}>{money(account.balance)}</span>
          </Link>
        ))}
        {accounts.length === 0 && <p className="px-1.5 py-3 text-small text-ink-faint">{t("No wallets yet.")}</p>}
      </div>
      <div className="flex items-center justify-between border-t border-divider bg-table-head px-5.5 py-3.5">
        <span className="text-small leading-[normal] text-ink-muted">{t("Total in accounts")}</span>
        <span className="text-[16px] leading-[normal] font-semibold text-ink tabular-nums">{money(data.balance)}</span>
      </div>
    </section>
  );
}
