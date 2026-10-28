"use client";

import { Box, CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import { createElement } from "react";
import { BUDGET_TONE_BAR, budgetTone } from "@/lib/budgetTone";
import { formatCurrency } from "@/lib/customer/currency";
import { walletIcon, walletType } from "@/lib/customer/walletVisuals";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CARD } from "./HomeHero";
import type { HomeData, HomeWallet } from "./homeTypes";
import { HomePartError } from "./HomePartError";

// The wallets the card lists; Manage shows the rest.
const WALLET_ROWS = 5;
const LINK = "text-[13px] leading-[normal] font-semibold text-emerald hover:text-emerald-hover";
const TITLE = "text-title leading-[normal] font-semibold text-ink";

const WALLET_KIND: Record<ReturnType<typeof walletType>, string> = { cash: "Cash in hand", bank: "Bank account", mfs: "Mobile wallet" };

// A wallet's tile: green for cash, blue then teal for banks, bKash pink,
// Nagad orange and violet for any other mobile wallet.
function walletTile(wallet: HomeWallet, bankIndex: number): string {
  const kind = walletType({ accountSubtype: wallet.subtype });
  if (kind === "cash") return "bg-mint-50 text-emerald";
  if (kind === "bank") return bankIndex % 2 === 0 ? "bg-info-soft text-info" : "bg-pillar-insights-soft text-pillar-insights";
  if (/bkash|বিকাশ/i.test(wallet.name)) return "bg-rose-soft text-gateway-bkash";
  if (/nagad|নগদ/i.test(wallet.name)) return "bg-pillar-loans-soft text-gateway-nagad";
  return "bg-pillar-habits-soft text-pillar-habits";
}

function CardHead({ title, href, link }: { title: string; href?: string; link?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className={TITLE}>{title}</h2>
      {href && link && (
        <Link href={href} className={LINK}>
          {link}
        </Link>
      )}
    </div>
  );
}

// Wallets: each active wallet with what it holds, Add wallet, and the
// total at the foot.
export function WalletsCard({ data }: { data: HomeData }) {
  const { t, fmt } = useLocale();
  let banks = 0;
  const shown = data.wallets.slice(0, WALLET_ROWS);
  const onlyCash = data.wallets.length > 0 && data.wallets.every((w) => walletType({ accountSubtype: w.subtype }) === "cash");

  return (
    <section className={cn(CARD, "hidden flex-col overflow-hidden md:flex")}>
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className={TITLE}>{t("Wallets")}</h2>
        <Link href="/balance/wallet" className={LINK}>
          {t("Manage")}
        </Link>
      </div>
      {shown.length === 0 && <p className="px-6 py-3 text-[13px] text-ink-muted">{t("No wallets yet.")}</p>}
      <ul>
        {shown.map((wallet) => {
          const kind = walletType({ accountSubtype: wallet.subtype });
          const tile = walletTile(wallet, kind === "bank" ? banks++ : 0);
          return (
            <li key={wallet.id}>
              <Link href={`/balance/ledger?accountId=${wallet.id}`} className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-table-head">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4.5", tile)}>{createElement(walletIcon({ accountSubtype: wallet.subtype }), { strokeWidth: 2, "aria-hidden": true })}</span>
                <span className="flex min-w-0 grow flex-col gap-px">
                  <span className="truncate text-body leading-[normal] font-medium text-ink">{wallet.name}</span>
                  <span className="text-caption text-ink-muted">{t(WALLET_KIND[kind])}</span>
                </span>
                <span className="text-body leading-[normal] font-semibold text-ink tabular-nums">{formatCurrency(wallet.balance, data.currency, fmt)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {data.canManage && (
        <div className="px-6 pt-2">
          {/* ?new=1 asks My wallets to open its Add wallet drawer straight away. */}
          <Link
            href="/balance/wallet?new=1"
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-input text-[13px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            <Plus className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
            {t(onlyCash ? "Add bank or mobile wallet" : "Add wallet")}
          </Link>
        </div>
      )}
      <div className="grow" />
      <div className="mt-4 flex items-center justify-between border-t border-line bg-table-head px-6 py-4">
        <span className="text-[13px] leading-[normal] text-ink-muted">{t("Total balance")}</span>
        <span className="text-title leading-[normal] font-bold text-ink tabular-nums">{formatCurrency(data.balance, data.currency, fmt)}</span>
      </div>
    </section>
  );
}

const BUDGET_TEXT = { income: "text-emerald", warning: "text-warning", expense: "text-expense" } as const;

// Monthly budget: the categories closest to their limit this month.
export function BudgetCard({ data }: { data: HomeData }) {
  const { t, fmt } = useLocale();
  const money = (value: number) => formatCurrency(value, data.currency, fmt);
  const budget = data.budget;

  return (
    <section className={cn(CARD, "flex flex-col gap-4.5 p-6")}>
      <CardHead title={t("Monthly budget")} href="/categories" link={t("Budget Planning")} />
      {data.unavailable.includes("budget") || !budget ? (
        <HomePartError compact />
      ) : budget.lines.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <span className="text-body font-semibold text-ink">{t(budget.hasBudget ? "Your budget is planned" : "No budget yet")}</span>
          <span className="text-[13px] leading-normal text-ink-muted">{t("Set this month's income target and expense budget so you're warned early.")}</span>
          {data.canManage && !budget.hasBudget && (
            <Link href="/categories" className="mt-1 flex h-9 items-center rounded-full border border-input bg-surface px-3.5 text-[13px] font-semibold text-ink hover:bg-surface-sunken">
              {t("Set budget")}
            </Link>
          )}
        </div>
      ) : (
        budget.lines.map((line) => {
          const tone = budgetTone(line.percent);
          const left = line.limit - line.spent;
          return (
            <div key={line.name} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-body leading-[normal] font-medium text-ink">{line.translate ? t(line.name) : line.name}</span>
                <span className="shrink-0 text-caption whitespace-nowrap text-ink-muted tabular-nums">
                  <b className="font-semibold text-ink">{money(line.spent)}</b> / {money(line.limit)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                <div className={cn("h-full rounded-full", BUDGET_TONE_BAR[tone])} style={{ width: `${Math.min(100, Math.max(0, line.percent))}%` }} />
              </div>
              <div className="flex justify-between gap-2 text-caption">
                <span className="text-ink-muted">{left >= 0 ? t("{amount} left", { amount: money(left) }) : t("{amount} over", { amount: money(-left) })}</span>
                <span className={cn("font-semibold", BUDGET_TEXT[tone])}>{t("{percent}% used", { percent: toLocaleDigits(String(Math.round(line.percent)), fmt) })}</span>
              </div>
            </div>
          );
        })
      )}
      {budget && budget.lines.length > 0 && (
        <span className="flex items-center gap-1.5 text-caption text-ink-muted">
          <CalendarDays className="size-3.5" strokeWidth={2} aria-hidden="true" />
          {t(budget.daysLeft === 1 ? "{count} day left in {month}" : "{count} days left in {month}", { count: formatCount(budget.daysLeft, fmt), month: budget.monthName })}
        </span>
      )}
    </section>
  );
}

// Savings goals: all of them together, then the two furthest along.
export function SavingsCard({ data }: { data: HomeData }) {
  const { t, fmt } = useLocale();
  const money = (value: number) => formatCurrency(value, data.currency, fmt);
  const { savings } = data;

  return (
    <section className={cn(CARD, "flex flex-col gap-4.5 p-6")}>
      <CardHead title={t("Savings goals")} href="/savings-goals/dashboard" link={t("View all")} />
      {data.unavailable.includes("savings") ? (
        <HomePartError compact />
      ) : savings.count === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <span className="text-body font-semibold text-ink">{t("No savings goal yet")}</span>
          <span className="text-[13px] leading-normal text-ink-muted">{t("Save towards something that matters and track progress.")}</span>
          {data.canManage && (
            <Link href="/savings-goals/dashboard?new=1" className="mt-1 flex h-9 items-center rounded-full border border-input bg-surface px-3.5 text-[13px] font-semibold text-ink hover:bg-surface-sunken">
              {t("Create goal")}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[24px] leading-[normal] font-bold tracking-[-0.02em] text-ink tabular-nums">{money(savings.saved)}</span>
              <span className="text-[13px] leading-[normal] text-ink-muted">{t("saved of {target}", { target: money(savings.target) })}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
              <div className="h-full rounded-full bg-emerald" style={{ width: `${Math.min(100, savings.progress)}%` }} />
            </div>
            <span className="text-caption text-ink-muted">{t("{percent}% of all goals reached", { percent: toLocaleDigits(String(savings.progress), fmt) })}</span>
          </div>
          {savings.goals.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-divider pt-4">
              {savings.goals.map((goal) => (
                <div key={goal.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-2 text-[13px] leading-[normal]">
                    <span className="truncate font-medium text-ink">{goal.name}</span>
                    <span className="shrink-0 text-ink-muted tabular-nums">
                      {money(goal.saved)} / {money(goal.target)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                    <div className="h-full rounded-full bg-emerald" style={{ width: `${Math.min(100, Math.max(0, goal.percent))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// The tiles' 18px figure, a step smaller for a long one ("৳ 21,31,800")
// so it fits the half-width tile whole.
const figureSize = (text: string) => (text.length > 10 ? "text-[15px]" : "text-[18px]");

// Loans & assets: what others owe you and what you owe (while Loans is on),
// and what your assets are worth.
export function LoansAssetsCard({ data }: { data: HomeData }) {
  const { t, fmt } = useLocale();
  const money = (value: number) => formatCurrency(value, data.currency, fmt);
  const { loans, assets } = data;
  const loansFailed = data.unavailable.includes("loans");

  return (
    <section className={cn(CARD, "flex flex-col gap-4.5 p-6")}>
      {loans || loansFailed ? (
        <CardHead title={t("Loans & assets")} href="/loan-management/dashboard" link={t("Loan Management")} />
      ) : (
        <CardHead title={t("Assets")} href="/assets-management/dashboard" link={t("Assets Management")} />
      )}
      {loansFailed ? (
        <HomePartError compact />
      ) : (
        loans && (
          <div className="grid grid-cols-2 gap-3">
            <Link href="/loan-management/dashboard" className="flex min-w-0 flex-col gap-1 rounded-[14px] bg-emerald-soft p-3.5 transition-colors hover:bg-mint-50">
              <span className="text-caption text-brand-ink">{t("Pawna · you'll receive")}</span>
              <span className={cn("leading-[normal] font-bold whitespace-nowrap text-emerald tabular-nums", figureSize(money(loans.pawna)))}>+ {money(loans.pawna)}</span>
              <span className="text-caption text-ink-muted">{t(loans.oweYou === 1 ? "from {count} person" : "from {count} people", { count: formatCount(loans.oweYou, fmt) })}</span>
            </Link>
            <Link href="/loan-management/dashboard" className="flex min-w-0 flex-col gap-1 rounded-[14px] bg-expense-soft/60 p-3.5 transition-colors hover:bg-expense-soft">
              <span className="text-caption text-expense">{t("Dena · you owe")}</span>
              <span className={cn("leading-[normal] font-bold whitespace-nowrap text-expense tabular-nums", figureSize(money(loans.dena)))}>− {money(loans.dena)}</span>
              <span className="text-caption text-ink-muted">{t(loans.youOwe === 1 ? "to {count} person" : "to {count} people", { count: formatCount(loans.youOwe, fmt) })}</span>
            </Link>
          </div>
        )
      )}
      {data.unavailable.includes("assets") ? (
        <HomePartError compact />
      ) : (
        <Link href="/assets-management/dashboard" className={cn("flex items-center gap-3 transition-opacity hover:opacity-80", (loans || loansFailed) && "border-t border-divider pt-4")}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-surface-sunken text-ink-soft">
            <Box className="size-4.5" strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 grow flex-col gap-px">
            <span className="text-[13px] leading-[normal] text-ink-muted">{t("Total asset value")}</span>
            <span className="text-caption text-ink-muted">{t(assets.count === 1 ? "{count} active asset" : "{count} active assets", { count: formatCount(assets.count, fmt) })}</span>
          </span>
          <span className="text-title leading-[normal] font-bold text-ink tabular-nums">{money(assets.value)}</span>
        </Link>
      )}
    </section>
  );
}
